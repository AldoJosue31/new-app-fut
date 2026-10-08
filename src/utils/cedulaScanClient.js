export const DEFAULT_CEDULA_SCAN_TIMEOUT_MS = 120_000;

const scanError = (message, fields, cause) => Object.assign(
  new Error(message, cause ? { cause } : undefined),
  { name: "CedulaScanError", status: 0, retryable: false, retryAfterSeconds: 0, ...fields },
);

const cancellationError = () => scanError("El escaneo se ha cancelado.", {
  name: "AbortError",
  code: "SCAN_CANCELLED",
});

const timeoutError = (requestId) => scanError(
  "El servicio de lectura tardó demasiado. Puedes volver a intentar con la misma imagen.",
  { name: "TimeoutError", code: "SCAN_CLIENT_TIMEOUT", retryable: true, requestId },
);

const retryAfterSeconds = (value) => {
  if (value == null || String(value).trim() === "") return undefined;
  const raw = String(value).trim();
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? Math.ceil(seconds) : undefined;
  }
  // HTTP Retry-After permits either seconds or an HTTP date.
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000)) : undefined;
};

const errorMessage = (value) => typeof value === "string" && value.trim() ? value : "";
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const classifyInvocationError = async (error, response, requestId) => {
  const context = response || error?.context;
  const statusValue = Number(context?.status || error?.status);
  const status = Number.isFinite(statusValue) ? statusValue : 0;
  const headers = context?.headers;
  let body = null;
  try {
    const readable = typeof context?.clone === "function" ? context.clone() : context;
    body = await readable?.json?.();
  } catch { /* Gateways can return text or an already consumed response. */ }

  const details = {
    status,
    requestId: body?.requestId || headers?.get?.("x-request-id") || requestId,
  };
  let code = "FUNCTION_ERROR";
  let message = errorMessage(error?.message) || "No se pudo escanear la cédula.";
  let retryable = false;
  const original = error?.context || error?.cause || error;
  if (status === 401) {
    code = "SCAN_AUTH_REQUIRED";
    message = "Tu sesión no permite escanear. Vuelve a iniciar sesión e intenta de nuevo.";
  } else if (status === 403) {
    code = "SCAN_FORBIDDEN";
    message = "No tienes permiso para escanear esta cédula.";
  } else if ([408, 504].includes(status) || original?.name === "AbortError"
    || original?.name === "TimeoutError" || /timed?\s*out|timeout/i.test(message)) {
    code = "SCAN_TIMEOUT";
    message = "El servicio de lectura tardó demasiado. Puedes volver a intentar con la misma imagen.";
    retryable = true;
  } else if (status === 429) {
    code = "SCAN_RATE_LIMITED";
    message = "El servicio alcanzó temporalmente su límite de lecturas. Espera antes de volver a intentar.";
    retryable = true;
  } else if (status >= 500 || error?.name === "FunctionsRelayError") {
    code = "SCAN_SERVICE_UNAVAILABLE";
    message = "El servicio de lectura no está disponible temporalmente. Intenta de nuevo en unos momentos.";
    retryable = true;
  } else if (!status && (error?.name === "FunctionsFetchError" || error instanceof TypeError
    || /fetch|network|offline|connection|failed to send/i.test(message))) {
    code = "SCAN_NETWORK_ERROR";
    message = "No se pudo conectar con el servicio de lectura. Comprueba tu conexión e intenta de nuevo.";
    retryable = true;
  }

  const bodyDelay = retryAfterSeconds(body?.retryAfterSeconds);
  const headerDelay = retryAfterSeconds(headers?.get?.("retry-after"));
  return scanError(errorMessage(body?.error) || message, {
    ...details,
    code: errorMessage(body?.code) || headers?.get?.("sb-error-code") || code,
    retryable: typeof body?.retryable === "boolean" ? body.retryable : retryable,
    retryAfterSeconds: bodyDelay !== undefined || headerDelay !== undefined
      ? Math.max(bodyDelay || 0, headerDelay || 0)
      : status === 429 ? 60 : 0,
  }, error);
};

/**
 * Times out the transport and the entire SDK invocation, including body parsing.
 * The timeout belongs to this shared request, not to any individual UI subscriber.
 */
export const invokeCedulaScan = async (
  client,
  image,
  context,
  { timeoutMs = DEFAULT_CEDULA_SCAN_TIMEOUT_MS } = {},
) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new TypeError("El tiempo máximo del escaneo debe ser un número positivo válido.");
  }
  const requestId = globalThis.crypto?.randomUUID?.() || `cedula-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const formData = new FormData();
  formData.append("image", image.blob, image.fileName);
  formData.append("mimeType", image.mimeType);
  formData.append("matchContext", JSON.stringify(context));
  for (const detail of image.detailImages || []) {
    formData.append("detailImages", detail.blob, detail.fileName);
  }

  const controller = new AbortController();
  let timedOut = false;
  let timerId;
  const deadline = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      timedOut = true;
      // Reject first so a synchronous abort handler cannot replace this timeout.
      reject(timeoutError(requestId));
      controller.abort();
    }, timeoutMs);
  });
  const invocation = Promise.resolve().then(async () => {
    let result;
    try {
      result = await client.functions.invoke("procesar-cedula", {
        body: formData,
        headers: { "x-request-id": requestId },
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) throw timeoutError(requestId);
      throw await classifyInvocationError(error, undefined, requestId);
    }
    if (timedOut) throw timeoutError(requestId);
    if (result?.error) {
      throw await classifyInvocationError(result.error, result.response, requestId);
    }
    const data = result?.data;
    if (!isRecord(data?.scan) || !isRecord(data.scan.localTeam)
      || !isRecord(data.scan.visitorTeam) || !Array.isArray(data.scan.players)) {
      throw scanError(errorMessage(data?.error) || "La función no devolvió datos válidos del escaneo.", {
        code: "SCAN_INVALID_RESPONSE",
        status: Number(result?.response?.status) || 0,
        requestId: data?.requestId || result?.response?.headers?.get?.("x-request-id") || requestId,
      });
    }
    return data;
  });
  try {
    return await Promise.race([invocation, deadline]);
  } finally {
    clearTimeout(timerId);
  }
};

/** Abandon only this subscriber; a shared scan can still finish and be reused. */
export const waitForCedulaScan = (promise, signal) => {
  if (!signal) return Promise.resolve(promise);
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(cancellationError());
    };
    const finish = (settle, value) => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) reject(cancellationError());
      else settle(value);
    };
    // Always attach rejection handling, even if this subscriber has already left.
    Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
};
