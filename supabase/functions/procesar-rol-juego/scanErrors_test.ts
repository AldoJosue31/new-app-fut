import {
  classifyProviderError,
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_GEMINI_MODEL,
  EDGE_RESPONSE_BUDGET_MS,
  GEMINI_FALLBACK_MAX_TIMEOUT_MS,
  GEMINI_PRIMARY_MAX_TIMEOUT_MS,
  selectGeminiFallbackModel,
  selectGeminiAttemptTimeoutMs,
  selectGeminiModel,
  secondsUntilNextPacificMidnight,
  shouldFallbackProviderError,
  shouldRetryProviderError,
  summarizeProviderFailures,
} from "./scanErrors.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: esperado ${expected}, recibido ${actual}`);
  }
};

Deno.test("reemplaza modelos retirados y conserva modelos vigentes", () => {
  assertEquals(selectGeminiModel(""), DEFAULT_GEMINI_MODEL, "fallback");
  assertEquals(
    selectGeminiModel("models/gemini-2.0-flash"),
    DEFAULT_GEMINI_MODEL,
    "modelo retirado",
  );
  assertEquals(
    selectGeminiModel("gemini-2.0-flash-lite"),
    DEFAULT_GEMINI_MODEL,
    "variante 2.0 retirada",
  );
  assertEquals(
    selectGeminiModel("gemini-3.5-flash"),
    "gemini-3.5-flash",
    "modelo vigente",
  );
  assertEquals(DEFAULT_GEMINI_MODEL, "gemini-3.8-flash", "modelo principal");
});

Deno.test("elige un modelo alterno vigente y distinto del principal", () => {
  assertEquals(
    selectGeminiFallbackModel("", DEFAULT_GEMINI_MODEL),
    DEFAULT_GEMINI_FALLBACK_MODEL,
    "fallback estable",
  );
  assertEquals(
    selectGeminiFallbackModel("gemini-2.0-flash-lite", DEFAULT_GEMINI_MODEL),
    DEFAULT_GEMINI_FALLBACK_MODEL,
    "ignora fallback retirado",
  );
  assertEquals(
    selectGeminiFallbackModel("", DEFAULT_GEMINI_FALLBACK_MODEL),
    DEFAULT_GEMINI_MODEL,
    "fallback inverso",
  );
  assertEquals(DEFAULT_GEMINI_FALLBACK_MODEL, "gemini-3.6-flash", "modelo de respaldo");
});

Deno.test("no reintenta modelo retirado, configuracion, auth, cuota ni timeout", () => {
  const cases = [
    [{ status: 404, message: "model is no longer available" }, "SCAN_MODEL_UNAVAILABLE"],
    [{ status: 400 }, "SCAN_CONFIGURATION_ERROR"],
    [{ status: 403 }, "SCAN_PROVIDER_AUTH_ERROR"],
    [{ status: 429 }, "SCAN_RATE_LIMITED"],
    [{ status: 504 }, "SCAN_TIMEOUT"],
  ] as const;

  for (const [error, code] of cases) {
    assertEquals(classifyProviderError(error).responseCode, code, `codigo ${code}`);
    assertEquals(shouldRetryProviderError(error), false, `retry ${code}`);
  }
});

Deno.test("un timeout permite un unico modelo alterno dentro del presupuesto seguro", () => {
  assertEquals(EDGE_RESPONSE_BUDGET_MS < 150_000, true, "presupuesto menor al limite de plataforma");
  assertEquals(
    shouldFallbackProviderError({ status: 504 }),
    true,
    "timeout habilita modelo alterno",
  );
  assertEquals(
    shouldRetryProviderError({ status: 504 }),
    false,
    "timeout no habilita reintentos del mismo modelo",
  );
  assertEquals(
    selectGeminiAttemptTimeoutMs(0, GEMINI_PRIMARY_MAX_TIMEOUT_MS),
    45_000,
    "intento principal limitado",
  );
  assertEquals(
    selectGeminiAttemptTimeoutMs(45_000, GEMINI_FALLBACK_MAX_TIMEOUT_MS),
    35_000,
    "alterno limitado despues del timeout principal",
  );
  assertEquals(
    selectGeminiAttemptTimeoutMs(105_000, GEMINI_FALLBACK_MAX_TIMEOUT_MS),
    10_000,
    "ultimo intento solo recibe el tiempo restante",
  );
  assertEquals(
    selectGeminiAttemptTimeoutMs(105_001, GEMINI_FALLBACK_MAX_TIMEOUT_MS),
    0,
    "no inicia una llamada que no pueda terminar de forma segura",
  );
});

Deno.test("distingue cuota diaria y conserva RetryInfo temporal", () => {
  const daily = classifyProviderError({
    status: 429,
    message: JSON.stringify({
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Quota exceeded",
        details: [{
          "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }],
        }],
      },
    }),
  });
  assertEquals(daily.responseCode, "SCAN_DAILY_QUOTA_EXCEEDED", "cuota diaria");
  assertEquals(daily.retryable, false, "cuota diaria no reintentable");
  assertEquals(shouldFallbackProviderError({ status: 429, message: "Quota exceeded" }), true, "fallback por cuota");

  const temporary = classifyProviderError({
    status: 429,
    message: JSON.stringify({
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Please retry in 33.4s.",
        details: [{
          "@type": "type.googleapis.com/google.rpc.RetryInfo",
          retryDelay: "33s",
        }],
      },
    }),
  });
  assertEquals(temporary.responseCode, "SCAN_RATE_LIMITED", "cuota temporal");
  assertEquals(temporary.retryAfterSeconds, 33, "espera real");

  const genericBillingHint = classifyProviderError({
    status: 429,
    message: "You exceeded your current quota, please check your plan and billing details.",
  });
  assertEquals(genericBillingHint.responseCode, "SCAN_RATE_LIMITED", "mensaje generico");
});

Deno.test("reconoce los limites reales de Gemini y conserva ambos intentos", () => {
  const now = new Date("2026-09-23T21:44:00.000Z");
  const primary = classifyProviderError({
    status: 429,
    message: "429 Rate limit exceeded for model gemini-3.8-flash (limit: 5 requests per minute on Free Tier). Please retry in 41s.",
  }, now);
  const fallback = classifyProviderError({
    status: 429,
    message: "429 Rate limit exceeded for model gemini-3.6-flash (limit: 20 requests per day on Free Tier). Please retry in 41s.",
  }, now);
  assertEquals(primary.responseCode, "SCAN_RATE_LIMITED", "cuota por minuto");
  assertEquals(fallback.responseCode, "SCAN_DAILY_QUOTA_EXCEEDED", "cuota diaria con espacios");
  assertEquals(fallback.retryAfterSeconds, secondsUntilNextPacificMidnight(now), "reinicio diario");

  const summary = summarizeProviderFailures(
    { model: DEFAULT_GEMINI_MODEL, classification: primary },
    { model: DEFAULT_GEMINI_FALLBACK_MODEL, classification: fallback },
  );
  assertEquals(summary.responseCode, "SCAN_RATE_LIMITED", "puede reintentarse por el primario");
  assertEquals(summary.retryAfterSeconds, 41, "espera por el primario disponible antes");
  assertEquals(summary.attempts.length, 2, "registra los dos modelos");
  assertEquals(summary.responseMessage.includes("gemini-3.8-flash"), true, "explica el primario");
  assertEquals(summary.responseMessage.includes("gemini-3.6-flash"), true, "explica el respaldo");
  assertEquals(summary.responseMessage.includes("cuota diaria"), true, "explica el limite del respaldo");
});

Deno.test("espera al reinicio si ambos modelos agotaron la cuota diaria", () => {
  const now = new Date("2026-09-23T21:44:00.000Z");
  const daily = classifyProviderError({
    status: 429,
    message: "Rate limit exceeded: requests per day on Free Tier",
  }, now);
  const summary = summarizeProviderFailures(
    { model: DEFAULT_GEMINI_MODEL, classification: daily },
    { model: DEFAULT_GEMINI_FALLBACK_MODEL, classification: daily },
  );
  assertEquals(summary.responseCode, "SCAN_DAILY_QUOTA_EXCEEDED", "ambos agotados");
  assertEquals(summary.retryable, false, "no invita a reintento inmediato");
  assertEquals(summary.retryAfterSeconds, secondsUntilNextPacificMidnight(now), "espera real");
});

Deno.test("informa el limite del principal y la alta demanda del respaldo", () => {
  const primary = classifyProviderError({ status: 429, message: "Please retry in 41s." });
  const fallback = classifyProviderError({
    status: 503,
    message: "503 gemini-3.6-flash is currently experiencing high demand",
  });
  const summary = summarizeProviderFailures(
    { model: DEFAULT_GEMINI_MODEL, classification: primary },
    { model: DEFAULT_GEMINI_FALLBACK_MODEL, classification: fallback },
  );
  assertEquals(summary.responseStatus, 503, "respuesta del respaldo temporalmente ocupado");
  assertEquals(summary.retryAfterSeconds, 5, "respaldo recuperable antes");
  assertEquals(summary.attempts[0].code, "SCAN_RATE_LIMITED", "primario registrado");
  assertEquals(summary.attempts[1].code, "SCAN_TEMPORARY_ERROR", "respaldo registrado");
});

Deno.test("solo reintenta una indisponibilidad transitoria del proveedor", () => {
  assertEquals(shouldRetryProviderError({ status: 503 }), true, "503");
  assertEquals(
    shouldRetryProviderError(new Error("fetch failed: connection reset")),
    true,
    "red",
  );
  assertEquals(
    classifyProviderError({ status: 503 }).responseStatus,
    503,
    "respuesta HTTP",
  );
});
