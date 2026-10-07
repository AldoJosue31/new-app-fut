import {
  ClassifiedScanError,
  classifyProviderError,
  type ScanErrorClassification,
  shouldFallbackProviderError,
} from "./scanErrors.ts";

export const GEMINI_ATTEMPT_TIMEOUT_MS = 45_000;
export const GEMINI_TOTAL_TIMEOUT_MS = 90_000;

export type ScanProviderTarget = { model: string; resourceKey: string };

type UnavailableProvider = { error: ScanErrorClassification; until: number };

/** Disponibilidad del modelo dentro del isolate; no persiste claves ni imagenes. */
export class ScanProviderCircuitBreaker {
  #unavailable = new Map<string, UnavailableProvider>();

  constructor(private now: () => number = Date.now) {}

  unavailable(resourceKey: string): ScanErrorClassification | null {
    const entry = this.#unavailable.get(resourceKey);
    if (!entry) return null;
    const remaining = Math.ceil((entry.until - this.now()) / 1000);
    if (remaining <= 0) {
      this.#unavailable.delete(resourceKey);
      return null;
    }
    return { ...entry.error, retryAfterSeconds: remaining };
  }

  record(resourceKey: string, error: ScanErrorClassification) {
    const seconds = error.responseCode === "SCAN_TIMEOUT"
      ? 120
      : ["SCAN_MODEL_UNAVAILABLE", "SCAN_CONFIGURATION_ERROR", "SCAN_PROVIDER_AUTH_ERROR"].includes(error.responseCode)
      ? 300
      : error.retryAfterSeconds;
    if (!seconds) return;
    this.#unavailable.set(resourceKey, { error, until: this.now() + seconds * 1000 });
    while (this.#unavailable.size > 32) {
      this.#unavailable.delete(this.#unavailable.keys().next().value!);
    }
  }

  clear(resourceKey: string) {
    this.#unavailable.delete(resourceKey);
  }
}

export const createProviderResourceKey = async (apiKey: string, model: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return `${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")}:${model}`;
};

const timeoutError = () => classifyProviderError({
  name: "APIConnectionTimeoutError",
  message: "El plazo total de lectura del proveedor expiro (timeout).",
});

/** Como maximo una llamada por destino, sin retries ocultos del SDK. */
export const runScanWithFallback = async <T>(options: {
  primary: ScanProviderTarget;
  fallback?: ScanProviderTarget;
  additionalFallback?: ScanProviderTarget;
  circuit: ScanProviderCircuitBreaker;
  execute: (target: ScanProviderTarget, timeoutMs: number, signal: AbortSignal) => Promise<T>;
  beforeExecute?: () => Promise<void>;
  onAttempt?: (target: ScanProviderTarget) => void;
  onFallback?: (error: ScanErrorClassification, target: ScanProviderTarget, failedTarget: ScanProviderTarget) => void;
  now?: () => number;
  attemptTimeoutMs?: number;
  totalTimeoutMs?: number;
}): Promise<{ value: T; model: string; attemptedModels: string[] }> => {
  const now = options.now || Date.now;
  const deadline = now() + (options.totalTimeoutMs || GEMINI_TOTAL_TIMEOUT_MS);
  const targets = [options.primary];
  for (const target of [options.fallback, options.additionalFallback]) {
    if (target && !targets.some(existing => existing.resourceKey === target.resourceKey)) targets.push(target);
  }
  const failures: Array<{ target: ScanProviderTarget; error: ScanErrorClassification }> = [];
  const attemptedModels: string[] = [];
  let authorized = false;

  for (const target of targets) {
    const unavailable = options.circuit.unavailable(target.resourceKey);
    if (unavailable) {
      failures.push({ target, error: unavailable });
      if (!shouldFallbackProviderError(new ClassifiedScanError(unavailable))) break;
      continue;
    }
    if (!authorized) {
      await options.beforeExecute?.();
      authorized = true;
    }
    const remaining = deadline - now();
    if (remaining <= 0) break;
    if (failures.length) {
      const previous = failures[failures.length - 1];
      options.onFallback?.(previous.error, target, previous.target);
    }
    const timeoutMs = Math.max(1, Math.min(options.attemptTimeoutMs || GEMINI_ATTEMPT_TIMEOUT_MS, remaining));
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    attemptedModels.push(target.model);
    options.onAttempt?.(target);
    try {
      const value = await Promise.race([
        options.execute(target, timeoutMs, controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new ClassifiedScanError(timeoutError()));
          }, timeoutMs);
        }),
      ]);
      options.circuit.clear(target.resourceKey);
      return { value, model: target.model, attemptedModels };
    } catch (error) {
      const classified = classifyProviderError(error);
      options.circuit.record(target.resourceKey, classified);
      failures.push({ target, error: classified });
      if (!shouldFallbackProviderError(error)) break;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  // Si solo un modelo agoto su cuota diaria, informa la espera del otro
  // recuperable. No bloquea todos los modelos hasta la medianoche.
  const classified = failures.map(({ target, error }) => options.circuit.unavailable(target.resourceKey) || error);
  const recoverable = classified.filter(error => error.retryable)
    .sort((left, right) => (left.retryAfterSeconds || 0) - (right.retryAfterSeconds || 0));
  throw new ClassifiedScanError(recoverable[0] || classified[classified.length - 1] || timeoutError());
};
