export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

type ProviderError = {
  status?: unknown;
  code?: unknown;
  name?: unknown;
  message?: unknown;
  error?: {
    code?: unknown;
    status?: unknown;
    message?: unknown;
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
};

const cleanModelName = (value: unknown) =>
  String(value || "").trim().replace(/^models\//i, "");

export const selectGeminiModel = (configuredModel: unknown) => {
  const candidate = cleanModelName(configuredModel);
  return candidate && !/^gemini-2\.0(?:-|$)/i.test(candidate)
    ? candidate
    : DEFAULT_GEMINI_MODEL;
};

const numberStatus = (value: unknown) => {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : 0;
};

const providerDetails = (error: unknown) => {
  const candidate = (error || {}) as ProviderError;
  const upstreamStatus = numberStatus(candidate.status) ||
    numberStatus(candidate.error?.code) || numberStatus(candidate.code);
  const upstreamCode = String(
    candidate.error?.status ||
      (typeof candidate.code === "string" ? candidate.code : "") ||
      "",
  ).trim();
  const name = String(candidate.name || "Error").slice(0, 80);
  const message = String(
    candidate.message || candidate.error?.message || "Error desconocido",
  ).slice(0, 500);
  return { upstreamStatus, upstreamCode, name, message };
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
  if (status === 429 || code === "RESOURCE_EXHAUSTED") {
    return {
      ...details,
      responseStatus: 429,
      responseCode: "SCAN_RATE_LIMITED",
      responseMessage:
        "Se alcanzo temporalmente el limite de lecturas. Espera unos segundos antes de intentar nuevamente.",
      retryable: true,
      retryAfterSeconds: 20,
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
