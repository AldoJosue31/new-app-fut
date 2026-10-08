import {
  classifyProviderError,
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_EXTRA_FALLBACK_MODEL,
  selectGeminiFallbackModel,
  selectGeminiExtraFallbackModel,
  selectGeminiModel,
  secondsUntilNextPacificMidnight,
  shouldFallbackProviderError,
} from "./scanErrors.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: esperado ${expected}, recibido ${actual}`);
};

Deno.test("usa Gemini 3.8 Flash y reemplaza modelos retirados", () => {
  assertEquals(selectGeminiModel("models/gemini-2.0-flash"), DEFAULT_GEMINI_MODEL, "modelo primario");
  assertEquals(
    selectGeminiModel("gemini-3.1-flash-lite-preview"),
    DEFAULT_GEMINI_MODEL,
    "preview retirado",
  );
  assertEquals(DEFAULT_GEMINI_MODEL, "gemini-3.8-flash", "modelo principal por defecto");
  assertEquals(selectGeminiModel("gemini-3.5-flash"), "gemini-3.5-flash", "modelo vigente");
});

Deno.test("elige un modelo alterno vigente", () => {
  assertEquals(
    selectGeminiFallbackModel("gemini-2.0-flash-lite", DEFAULT_GEMINI_MODEL),
    DEFAULT_GEMINI_FALLBACK_MODEL,
    "modelo de respaldo",
  );
  assertEquals(DEFAULT_GEMINI_FALLBACK_MODEL, "gemini-3.6-flash", "respaldo por defecto");
});

Deno.test("usa el modelo alterno ante incompatibilidad de configuracion", () => {
  assertEquals(
    shouldFallbackProviderError({ status: 400, message: "Request contains an invalid argument" }),
    true,
    "fallback de compatibilidad",
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
  assertEquals(shouldFallbackProviderError(error), true, "usa respaldo por limite temporal");
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

Deno.test("la cuota diaria conserva el reinicio y usa el modelo de respaldo", () => {
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
  assertEquals(shouldFallbackProviderError(error), true, "usa respaldo por cuota diaria");
});

Deno.test("clasifica indisponibilidad del proveedor", () => {
  const classified = classifyProviderError({ status: 503 });
  assertEquals(classified.responseCode, "SCAN_TEMPORARY_ERROR", "codigo");
  assertEquals(classified.responseStatus, 503, "estado HTTP");
  assertEquals(shouldFallbackProviderError({ status: 503 }), true, "usa respaldo");
});

Deno.test("usa respaldo por indisponibilidad o agotamiento del modelo principal", () => {
  assertEquals(
    shouldFallbackProviderError({ status: 404, message: "Model is not available" }),
    true,
    "modelo no disponible",
  );
  assertEquals(shouldFallbackProviderError({ status: 429 }), true, "429 con respaldo");
  assertEquals(shouldFallbackProviderError({ status: 504 }), true, "timeout con respaldo acotado");
});

Deno.test("respeta Retry-After largo y la fecha HTTP del proveedor", () => {
  const now = new Date("2026-10-07T12:00:00.000Z");
  assertEquals(classifyProviderError({ status: 429, headers: new Headers({ "Retry-After": "600" }) }, now).retryAfterSeconds, 600, "espera sin truncar");
  assertEquals(classifyProviderError({ status: 429, headers: { "Retry-After": "Wed, 07 Oct 2026 12:05:00 GMT" } }, now).retryAfterSeconds, 300, "espera con fecha");
});

Deno.test("clasifica limite de gasto aunque aparezca solo en el mensaje", () => {
  const classified = classifyProviderError({ statusCode: 429, message: "Project spend-based rate limit exceeded" });
  assertEquals(classified.responseCode, "SCAN_BILLING_LIMIT", "codigo de gasto");
  assertEquals(shouldFallbackProviderError({ status: 429, message: "Project spend limit exceeded" }), false, "no repite una cuota compartida de gasto");
});

Deno.test("respaldo adicional usa Flash 3.7, respeta off e ignora retirados y duplicados", () => {
  const select = (configured: string) => selectGeminiExtraFallbackModel(configured, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_FALLBACK_MODEL);
  assertEquals(select(""), DEFAULT_GEMINI_EXTRA_FALLBACK_MODEL, "modelo adicional");
  assertEquals(DEFAULT_GEMINI_EXTRA_FALLBACK_MODEL, "gemini-3.7-flash", "Flash completo");
  assertEquals(select("off"), "", "desactivado");
  assertEquals(select("models/gemini-3.8-flash"), DEFAULT_GEMINI_EXTRA_FALLBACK_MODEL, "sin duplicar principal");
  assertEquals(select("gemini-2.0-flash"), DEFAULT_GEMINI_EXTRA_FALLBACK_MODEL, "sin retirados");
  assertEquals(select("gemini-3.5-flash-lite"), DEFAULT_GEMINI_EXTRA_FALLBACK_MODEL, "sin Lite");
  assertEquals(select("gemini-3.1-pro-preview"), DEFAULT_GEMINI_EXTRA_FALLBACK_MODEL, "sin Pro");
  assertEquals(selectGeminiExtraFallbackModel("", "gemini-3.7-flash", DEFAULT_GEMINI_FALLBACK_MODEL), "", "default ya usado");
});
