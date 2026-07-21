export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3-flash-preview";

type ProviderError = {
  status?: unknown;
  code?: unknown;
  name?: unknown;
  message?: unknown;
  error?: { code?: unknown; status?: unknown; message?: unknown; details?: unknown };
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

const cleanModelName = (value: unknown) =>
  String(value || "").trim().replace(/^models\//i, "");

const isRetiredModel = (model: string) =>
  /^gemini-2\.0(?:-|$)/i.test(model) ||
  /^gemini-3\.1-flash-lite-preview$/i.test(model);

export const selectGeminiModel = (configuredModel: unknown) => {
  const candidate = cleanModelName(configuredModel);
  return candidate && !isRetiredModel(candidate) ? candidate : DEFAULT_GEMINI_MODEL;
};

export const selectGeminiFallbackModel = (configuredModel: unknown, primaryModel: unknown) => {
  const primary = cleanModelName(primaryModel);
  const configured = cleanModelName(configuredModel);
  const candidates = [
    configured && !isRetiredModel(configured) ? configured : "",
    DEFAULT_GEMINI_FALLBACK_MODEL,
    DEFAULT_GEMINI_MODEL,
  ];
  return candidates.find(candidate => candidate && candidate !== primary) || "";
};

const numberStatus = (value: unknown) => {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : 0;
};

const parseProviderPayload = (message: string) => {
  const candidates = [message, message.slice(Math.max(0, message.indexOf("{")))];
  for (const candidate of candidates) {
    if (!candidate.startsWith("{")) continue;
    try {
      return JSON.parse(candidate) as {
        error?: { code?: unknown; status?: unknown; message?: unknown; details?: unknown };
      };
    } catch { /* El SDK puede anteponer el estado al JSON. */ }
  }
  return null;
};

const secondsFromDuration = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.ceil(value));
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
    const detail = entry as { retryDelay?: unknown; violations?: unknown };
    retryAfterSeconds ||= secondsFromDuration(detail.retryDelay);
    if (!Array.isArray(detail.violations)) continue;
    for (const violation of detail.violations) {
      if (!violation || typeof violation !== "object") continue;
      const quota = violation as { quotaId?: unknown; quotaMetric?: unknown };
      quotaParts.push(String(quota.quotaId || ""), String(quota.quotaMetric || ""));
    }
  }
  if (!retryAfterSeconds) {
    const match = message.match(/(?:please\s+)?retry(?:\s+in|\s+after)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s|sec(?:ond)?s?)/i);
    if (match) retryAfterSeconds = secondsFromDuration(`${match[1]}${match[2]}`);
  }
  const quotaDetailsText = quotaParts.join(" ");
  const quotaText = `${quotaDetailsText} ${message}`;
  const quotaKind = /requests?perday|per[_-]?day|daily|\brpd\b/i.test(quotaText)
    ? "daily"
    : /spend|billing|factur|paid.?tier.?spend/i.test(quotaDetailsText)
    ? "spend"
    : "temporary";
  return { retryAfterSeconds, quotaKind } as const;
};

const providerDetails = (error: unknown) => {
  const candidate = (error || {}) as ProviderError;
  const rawMessage = String(candidate.message || candidate.error?.message || "Error desconocido");
  const payloadError = parseProviderPayload(rawMessage)?.error;
  const upstreamStatus = numberStatus(candidate.status) || numberStatus(payloadError?.code) ||
    numberStatus(candidate.error?.code) || numberStatus(candidate.code);
  const upstreamCode = String(payloadError?.status || candidate.error?.status ||
    (typeof candidate.code === "string" ? candidate.code : "") || "").trim();
  const name = String(candidate.name || "Error").slice(0, 80);
  const providerMessage = String(payloadError?.message || rawMessage);
  const message = providerMessage.slice(0, 500);
  const quota = quotaMetadata(payloadError?.details || candidate.error?.details, providerMessage);
  return { upstreamStatus, upstreamCode, name, message, ...quota };
};

const unavailableModel = (message: string, code: string) =>
  code === "NOT_FOUND" ||
  /model[^.]{0,120}(?:not found|not available|no longer available|unsupported|shut\s*down|retired|deprecated)/i.test(message) ||
  /(?:not found|not available|no longer available)[^.]{0,120}model/i.test(message);
const timeout = (status: number, message: string) =>
  [408, 504].includes(status) || /abort|deadline|timed?\s*out|timeout/i.test(message);
const networkFailure = (message: string) =>
  /fetch failed|network|connection (?:closed|reset)|econnreset|socket hang up|temporary failure/i.test(message);

export const classifyProviderError = (error: unknown): ScanErrorClassification => {
  const details = providerDetails(error);
  const { upstreamStatus: status, upstreamCode: code, message } = details;
  if (status === 404 || unavailableModel(message, code)) return {
    ...details, responseStatus: 502, responseCode: "SCAN_MODEL_UNAVAILABLE",
    responseMessage: "El modelo de lectura configurado ya no esta disponible.", retryable: false,
  };
  if (timeout(status, message)) return {
    ...details, responseStatus: 504, responseCode: "SCAN_TIMEOUT",
    responseMessage: "El analisis tardo mas de lo esperado. Intenta nuevamente con la misma imagen.", retryable: false,
  };
  if ((status === 429 || code === "RESOURCE_EXHAUSTED") && details.quotaKind === "daily") return {
    ...details, responseStatus: 429, responseCode: "SCAN_DAILY_QUOTA_EXCEEDED",
    responseMessage: "Se alcanzo la cuota diaria de lecturas de Google para este proyecto.",
    retryable: false, retryAfterSeconds: 300,
  };
  if ((status === 429 || code === "RESOURCE_EXHAUSTED") && details.quotaKind === "spend") return {
    ...details, responseStatus: 429, responseCode: "SCAN_BILLING_LIMIT",
    responseMessage: "Google detuvo las lecturas por el limite de gasto o facturacion del proyecto.",
    retryable: false, retryAfterSeconds: 300,
  };
  if (status === 429 || code === "RESOURCE_EXHAUSTED") return {
    ...details, responseStatus: 429, responseCode: "SCAN_RATE_LIMITED",
    responseMessage: "Se alcanzo temporalmente el limite de lecturas. Espera unos segundos antes de intentar nuevamente.",
    retryable: true, retryAfterSeconds: Math.min(120, Math.max(5, details.retryAfterSeconds || 20)),
  };
  if ([401, 403].includes(status)) return {
    ...details, responseStatus: 502, responseCode: "SCAN_PROVIDER_AUTH_ERROR",
    responseMessage: "El servicio de lectura no pudo autenticarse.", retryable: false,
  };
  if (status === 400) return {
    ...details, responseStatus: 502, responseCode: "SCAN_CONFIGURATION_ERROR",
    responseMessage: "El servicio de lectura rechazo la configuracion del analisis.", retryable: false,
  };
  if ([500, 502, 503].includes(status) || networkFailure(message)) return {
    ...details, responseStatus: 503, responseCode: "SCAN_TEMPORARY_ERROR",
    responseMessage: "El servicio de lectura esta temporalmente ocupado. Intenta nuevamente.",
    retryable: true, retryAfterSeconds: 5,
  };
  return {
    ...details, responseStatus: 502, responseCode: "SCAN_ANALYSIS_ERROR",
    responseMessage: "No se pudo analizar la cedula. Intenta nuevamente.", retryable: false,
  };
};

export const shouldFallbackProviderError = (error: unknown) => [
  "SCAN_MODEL_UNAVAILABLE",
  "SCAN_RATE_LIMITED",
  "SCAN_DAILY_QUOTA_EXCEEDED",
  "SCAN_TEMPORARY_ERROR",
].includes(classifyProviderError(error).responseCode);
