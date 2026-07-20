import {
  classifyProviderError,
  DEFAULT_GEMINI_MODEL,
  selectGeminiModel,
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
