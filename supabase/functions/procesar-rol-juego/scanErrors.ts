export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.6-flash";

const PACIFIC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const pacificDateKey = (timestamp: number) => {
  const parts = PACIFIC_DATE_FORMATTER.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const secondsUntilNextPacificMidnight = (now: Date = new Date()) => {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return 24 * 60 * 60;
  const currentDateKey = pacificDateKey(nowMs);
  let lowerBound = nowMs;
  let upperBound = nowMs + 30 * 60 * 60 * 1000;
  while (pacificDateKey(upperBound) === currentDateKey) {
    upperBound += 6 * 60 * 60 * 1000;
  }
  while (upperBound - lowerBound > 1) {
    const midpoint = Math.floor((upperBound + lowerBound) / 2);
    if (pacificDateKey(midpoint) === currentDateKey) lowerBound = midpoint;
    else upperBound = midpoint;
  }
  return Math.max(1, Math.ceil((upperBound - nowMs) / 1000));
};

// Supabase corta solicitudes que no responden tras 150 s. Este presupuesto
// deja 30 s para leer la carga, OCR, serializar la respuesta y variaciones de
// red; los dos modelos nunca pueden consumir el limite completo.
export const EDGE_RESPONSE_BUDGET_MS = 120_000;
export const EDGE_RESPONSE_RESERVE_MS = 5_000;
export const GEMINI_PRIMARY_MAX_TIMEOUT_MS = 45_000;
export const GEMINI_FALLBACK_MAX_TIMEOUT_MS = 35_000;
export const GEMINI_MIN_ATTEMPT_TIMEOUT_MS = 10_000;

type ProviderError = {
  status?: unknown;
  code?: unknown;
  name?: unknown;
  message?: unknown;
  error?: {
    code?: unknown;
    status?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

export type ScanErrorClassification = {
  upstreamStatus: number;
  upstreamCode: string;
  name: string;
  message: string;
  responseStatus: number;
  responseCode: string;
  responseMessage: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  quotaKind?: "daily" | "spend" | "temporary";
};

type FailedModelAttempt = {
  model: string;
  classification: ScanErrorClassification;
};

export const summarizeProviderFailures = (
  primary: FailedModelAttempt | null,
  last: FailedModelAttempt,
) => {
  const attempts = primary ? [primary, last] : [last];
  // Si un modelo puede recuperarse antes que el otro, ese intento determina
  // cuando tiene sentido volver a escanear la imagen.
  const retryable = attempts.filter((attempt) => attempt.classification.retryable);
  const next = retryable.length
    ? retryable.reduce((best, attempt) =>
      (attempt.classification.retryAfterSeconds || 0) <
          (best.classification.retryAfterSeconds || 0) ? attempt : best)
    : last;
  const responseMessage = primary
    ? `No se pudo completar la lectura. Modelo principal (${primary.model}): ${primary.classification.responseMessage} Modelo de respaldo (${last.model}): ${last.classification.responseMessage}`
    : last.classification.responseMessage;
  return {
    responseStatus: next.classification.responseStatus,
    responseCode: next.classification.responseCode,
    responseMessage,
    retryable: next.classification.retryable,
    retryAfterSeconds: next.classification.retryAfterSeconds || 0,
    attempts: attempts.map(({ model, classification }) => ({
      model,
      code: classification.responseCode,
      status: classification.upstreamStatus,
    })),
  };
};

const cleanModelName = (value: unknown) =>
  String(value || "").trim().replace(/^models\//i, "");

/**
 * Limita una llamada al proveedor al tiempo que aun queda del presupuesto de
 * la solicitud. Cero significa que ya no es seguro iniciar otro intento.
 */
export const selectGeminiAttemptTimeoutMs = (
  elapsedMs: unknown,
  maxAttemptTimeoutMs: unknown,
) => {
  const elapsed = Math.max(0, Math.trunc(Number(elapsedMs) || 0));
  const maximum = Math.max(0, Math.trunc(Number(maxAttemptTimeoutMs) || 0));
  const remaining = Math.max(
    0,
    EDGE_RESPONSE_BUDGET_MS - elapsed - EDGE_RESPONSE_RESERVE_MS,
  );
  return remaining >= GEMINI_MIN_ATTEMPT_TIMEOUT_MS
    ? Math.min(maximum, remaining)
    : 0;
};

const isRetiredModel = (model: string) =>
  /^gemini-2\.0(?:-|$)/i.test(model) ||
  /^gemini-3\.1-flash-lite-preview$/i.test(model);

export const selectGeminiModel = (configuredModel: unknown) => {
  const candidate = cleanModelName(configuredModel);
  return candidate && !isRetiredModel(candidate)
    ? candidate
    : DEFAULT_GEMINI_MODEL;
};

export const selectGeminiFallbackModel = (
  configuredModel: unknown,
  primaryModel: unknown,
) => {
  const primary = cleanModelName(primaryModel);
  const configured = cleanModelName(configuredModel);
  const candidates = [
    configured && !isRetiredModel(configured) ? configured : "",
    DEFAULT_GEMINI_FALLBACK_MODEL,
    DEFAULT_GEMINI_MODEL,
  ];
  return candidates.find((candidate) => candidate && candidate !== primary) || "";
};

const numberStatus = (value: unknown) => {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : 0;
};

const parseProviderPayload = (message: string) => {
  const candidates = [message, message.slice(Math.max(0, message.indexOf("{")))];
  for (const candidate of candidates) {
    if (!candidate.startsWith("{")) continue;
    try {
      return JSON.parse(candidate) as {
        error?: {
          code?: unknown;
          status?: unknown;
          message?: unknown;
          details?: unknown;
        };
      };
    } catch { /* El SDK puede anteponer el estado al JSON. */ }
  }
  return null;
};

const secondsFromDuration = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.ceil(value));
  }
  const match = String(value || "").trim().match(/(\d+(?:\.\d+)?)\s*(ms|s|sec(?:ond)?s?)?/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  return Math.max(0, Math.ceil(match[2]?.toLowerCase() === "ms" ? amount / 1000 : amount));
};

const quotaMetadata = (details: unknown, message: string) => {
  const entries = Array.isArray(details) ? details : [];
  let retryAfterSeconds = 0;
  const quotaParts: string[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const detail = entry as {
      retryDelay?: unknown;
      violations?: unknown;
    };
    retryAfterSeconds ||= secondsFromDuration(detail.retryDelay);
    if (!Array.isArray(detail.violations)) continue;
    for (const violation of detail.violations) {
      if (!violation || typeof violation !== "object") continue;
      const quota = violation as {
        quotaId?: unknown;
        quotaMetric?: unknown;
      };
      quotaParts.push(String(quota.quotaId || ""), String(quota.quotaMetric || ""));
    }
  }

  if (!retryAfterSeconds) {
    const retryMatch = message.match(/(?:please\s+)?retry(?:\s+in|\s+after)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s|sec(?:ond)?s?)/i);
    if (retryMatch) retryAfterSeconds = secondsFromDuration(`${retryMatch[1]}${retryMatch[2]}`);
  }

  const quotaDetailsText = quotaParts.join(" ");
  const quotaText = `${quotaDetailsText} ${message}`;
  const quotaKind = /requests?\s*per[\s_-]*day|per[\s_-]*day|daily|\brpd\b/i.test(quotaText)
    ? "daily"
    : /spend|billing|factur|paid.?tier.?spend/i.test(quotaDetailsText)
    ? "spend"
    : "temporary";
  return { retryAfterSeconds, quotaKind } as const;
};

const providerDetails = (error: unknown) => {
  const candidate = (error || {}) as ProviderError;
  const rawMessage = String(
    candidate.message || candidate.error?.message || "Error desconocido",
  );
  const payloadError = parseProviderPayload(rawMessage)?.error;
  const upstreamStatus = numberStatus(candidate.status) ||
    numberStatus(payloadError?.code) || numberStatus(candidate.error?.code) ||
    numberStatus(candidate.code);
  const upstreamCode = String(
    payloadError?.status || candidate.error?.status ||
      (typeof candidate.code === "string" ? candidate.code : "") ||
      "",
  ).trim();
  const name = String(candidate.name || "Error").slice(0, 80);
  const providerMessage = String(payloadError?.message || rawMessage);
  const message = providerMessage.slice(0, 500);
  const quota = quotaMetadata(
    payloadError?.details || candidate.error?.details,
    providerMessage,
  );
  return { upstreamStatus, upstreamCode, name, message, ...quota };
};

const looksLikeUnavailableModel = (message: string, code: string) =>
  code === "NOT_FOUND" ||
  /model[^.]{0,120}(?:not found|not available|no longer available|unsupported|shut\s*down|retired|deprecated)/i
    .test(message) ||
  /(?:not found|not available|no longer available)[^.]{0,120}model/i
    .test(message);

const looksLikeTimeout = (status: number, message: string) =>
  [408, 504].includes(status) ||
  /abort|deadline|timed?\s*out|timeout/i.test(message);

const looksLikeNetworkFailure = (message: string) =>
  /fetch failed|network|connection (?:closed|reset)|econnreset|socket hang up|temporary failure/i
    .test(message);

export const classifyProviderError = (
  error: unknown,
  now: Date = new Date(),
): ScanErrorClassification => {
  const details = providerDetails(error);
  const { upstreamStatus: status, upstreamCode: code, message } = details;

  if (status === 404 || looksLikeUnavailableModel(message, code)) {
    return {
      ...details,
      responseStatus: 502,
      responseCode: "SCAN_MODEL_UNAVAILABLE",
      responseMessage:
        "El modelo de lectura configurado ya no esta disponible. Actualiza la funcion antes de volver a intentar.",
      retryable: false,
    };
  }
  if (looksLikeTimeout(status, message)) {
    return {
      ...details,
      responseStatus: 504,
      responseCode: "SCAN_TIMEOUT",
      responseMessage:
        "El analisis tardo mas de lo esperado. Intenta nuevamente con la misma imagen.",
      retryable: false,
    };
  }
  if ((status === 429 || code === "RESOURCE_EXHAUSTED") && details.quotaKind === "daily") {
    return {
      ...details,
      responseStatus: 429,
      responseCode: "SCAN_DAILY_QUOTA_EXCEEDED",
      responseMessage:
        "Se alcanzo la cuota diaria de lecturas de Google para este proyecto. Se restablece a medianoche, hora del Pacifico, o puede ampliarse en Google AI Studio.",
      retryable: false,
      retryAfterSeconds: secondsUntilNextPacificMidnight(now),
    };
  }
  if ((status === 429 || code === "RESOURCE_EXHAUSTED") && details.quotaKind === "spend") {
    return {
      ...details,
      responseStatus: 429,
      responseCode: "SCAN_BILLING_LIMIT",
      responseMessage:
        "Google detuvo temporalmente las lecturas por el limite de gasto o facturacion del proyecto. Revisa la cuota en Google AI Studio.",
      retryable: false,
      retryAfterSeconds: 300,
    };
  }
  if (status === 429 || code === "RESOURCE_EXHAUSTED") {
    return {
      ...details,
      responseStatus: 429,
      responseCode: "SCAN_RATE_LIMITED",
      responseMessage:
        "Se alcanzo temporalmente el limite de lecturas. Espera unos segundos antes de intentar nuevamente.",
      retryable: true,
      retryAfterSeconds: Math.min(120, Math.max(5, details.retryAfterSeconds || 20)),
    };
  }
  if ([401, 403].includes(status)) {
    return {
      ...details,
      responseStatus: 502,
      responseCode: "SCAN_PROVIDER_AUTH_ERROR",
      responseMessage:
        "El servicio de lectura no pudo autenticarse. Revisa la configuracion de la funcion.",
      retryable: false,
    };
  }
  if (status === 400) {
    return {
      ...details,
      responseStatus: 502,
      responseCode: "SCAN_CONFIGURATION_ERROR",
      responseMessage:
        "El servicio de lectura rechazo la configuracion del analisis.",
      retryable: false,
    };
  }
  if ([500, 502, 503].includes(status) || looksLikeNetworkFailure(message)) {
    return {
      ...details,
      responseStatus: 503,
      responseCode: "SCAN_TEMPORARY_ERROR",
      responseMessage:
        "El servicio de lectura esta temporalmente ocupado. Intenta nuevamente.",
      retryable: true,
      retryAfterSeconds: 5,
    };
  }
  return {
    ...details,
    responseStatus: 502,
    responseCode: "SCAN_ANALYSIS_ERROR",
    responseMessage: "No se pudo analizar el rol de juego. Intenta nuevamente.",
    retryable: false,
  };
};

export const shouldRetryProviderError = (error: unknown) =>
  classifyProviderError(error).responseCode === "SCAN_TEMPORARY_ERROR";

export const shouldFallbackProviderError = (error: unknown) =>
  [
    "SCAN_MODEL_UNAVAILABLE",
    "SCAN_TIMEOUT",
    "SCAN_RATE_LIMITED",
    "SCAN_DAILY_QUOTA_EXCEEDED",
    "SCAN_TEMPORARY_ERROR",
  ].includes(classifyProviderError(error).responseCode);
