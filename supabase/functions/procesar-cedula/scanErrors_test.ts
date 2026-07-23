import {
  classifyProviderError,
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_GEMINI_MODEL,
  selectGeminiFallbackModel,
  selectGeminiModel,
  secondsUntilNextPacificMidnight,
  shouldFallbackProviderError,
} from "./scanErrors.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: esperado ${expected}, recibido ${actual}`);
};

Deno.test("usa Flash Lite estable y reemplaza modelos retirados", () => {
  assertEquals(selectGeminiModel("models/gemini-2.0-flash"), DEFAULT_GEMINI_MODEL, "modelo primario");
  assertEquals(
    selectGeminiModel("gemini-3.1-flash-lite-preview"),
    DEFAULT_GEMINI_MODEL,
    "preview retirado",
  );
  assertEquals(DEFAULT_GEMINI_MODEL, "gemini-3.1-flash-lite", "modelo estable por defecto");
  assertEquals(selectGeminiModel("gemini-3.5-flash"), "gemini-3.5-flash", "modelo vigente");
});

Deno.test("elige un modelo alterno vigente", () => {
  assertEquals(
    selectGeminiFallbackModel("gemini-2.0-flash-lite", DEFAULT_GEMINI_MODEL),
    DEFAULT_GEMINI_FALLBACK_MODEL,
    "modelo de respaldo",
  );
  assertEquals(DEFAULT_GEMINI_FALLBACK_MODEL, "gemini-3.5-flash", "respaldo por defecto");
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
  assertEquals(shouldFallbackProviderError(error), false, "no duplica llamadas por limite temporal");
});

Deno.test("calcula el reinicio diario en la medianoche de Los Angeles", () => {
  assertEquals(
    secondsUntilNextPacificMidnight(new Date("2026-07-20T10:00:00.000Z")),
    21 * 60 * 60,
    "espera durante horario de verano",
  );
  assertEquals(
    secondsUntilNextPacificMidnight(new Date("2026-03-08T08:00:00.000Z")),
    23 * 60 * 60,
    "dia del cambio a horario de verano",
  );
});

Deno.test("la cuota diaria espera al reinicio y no consume el fallback", () => {
  const error = {
    status: 429,
    message: JSON.stringify({
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Quota exceeded for requests per day (RPD).",
      },
    }),
  };
  const classified = classifyProviderError(error, new Date("2026-07-20T10:00:00.000Z"));
  assertEquals(classified.responseCode, "SCAN_DAILY_QUOTA_EXCEEDED", "codigo diario");
  assertEquals(classified.retryAfterSeconds, 21 * 60 * 60, "espera al reinicio");
  assertEquals(shouldFallbackProviderError(error), false, "no duplica llamadas por cuota diaria");
});

Deno.test("clasifica indisponibilidad del proveedor", () => {
  const classified = classifyProviderError({ status: 503 });
  assertEquals(classified.responseCode, "SCAN_TEMPORARY_ERROR", "codigo");
  assertEquals(classified.responseStatus, 503, "estado HTTP");
  assertEquals(shouldFallbackProviderError({ status: 503 }), true, "usa respaldo");
});

Deno.test("solo usa respaldo por modelo no disponible o error temporal", () => {
  assertEquals(
    shouldFallbackProviderError({ status: 404, message: "Model is not available" }),
    true,
    "modelo no disponible",
  );
  assertEquals(shouldFallbackProviderError({ status: 429 }), false, "429 sin respaldo");
  assertEquals(shouldFallbackProviderError({ status: 504 }), false, "timeout sin segunda llamada");
});
