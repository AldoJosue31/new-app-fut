import {
  classifyProviderError,
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_GEMINI_MODEL,
  selectGeminiFallbackModel,
  selectGeminiModel,
  shouldFallbackProviderError,
} from "./scanErrors.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: esperado ${expected}, recibido ${actual}`);
};

Deno.test("reemplaza el modelo 2.0 retirado", () => {
  assertEquals(selectGeminiModel("models/gemini-2.0-flash"), DEFAULT_GEMINI_MODEL, "modelo primario");
  assertEquals(selectGeminiModel("gemini-3.5-flash"), "gemini-3.5-flash", "modelo vigente");
});

Deno.test("elige un modelo alterno vigente", () => {
  assertEquals(
    selectGeminiFallbackModel("gemini-2.0-flash-lite", DEFAULT_GEMINI_MODEL),
    DEFAULT_GEMINI_FALLBACK_MODEL,
    "modelo de respaldo",
  );
});

Deno.test("clasifica cuota temporal y conserva la espera", () => {
  const error = {
    status: 429,
    message: JSON.stringify({
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Please retry in 33.4s.",
        details: [{ retryDelay: "33s" }],
      },
    }),
  };
  const classified = classifyProviderError(error);
  assertEquals(classified.responseCode, "SCAN_RATE_LIMITED", "codigo");
  assertEquals(classified.retryAfterSeconds, 33, "Retry-After");
  assertEquals(shouldFallbackProviderError(error), true, "usa respaldo");
});

Deno.test("clasifica indisponibilidad del proveedor", () => {
  const classified = classifyProviderError({ status: 503 });
  assertEquals(classified.responseCode, "SCAN_TEMPORARY_ERROR", "codigo");
  assertEquals(classified.responseStatus, 503, "estado HTTP");
  assertEquals(shouldFallbackProviderError({ status: 503 }), true, "usa respaldo");
});
