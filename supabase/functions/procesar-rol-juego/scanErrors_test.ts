import {
  classifyProviderError,
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_GEMINI_MODEL,
  selectGeminiFallbackModel,
  selectGeminiModel,
  shouldFallbackProviderError,
  shouldRetryProviderError,
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
