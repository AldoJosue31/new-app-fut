import {
  classifyDocumentOcrError,
  normalizeClientOcr,
  parseGoogleVisionResponse,
  resolveDocumentOcr,
} from "./documentOcr.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
  }
};

Deno.test("normaliza y limita OCR no confiable del navegador", () => {
  const lines = Array.from({ length: 805 }, (_, index) => ({
    text: index === 0 ? "<script> Equipo\u0000 Norte" : `Linea ${index}`,
    confidence: 92,
    boundingBox: { x: -2, y: 0.25, width: 8, height: 0.5 },
  }));
  const result = normalizeClientOcr({
    text: "<b>Rol</b>\u0001\nJornada 2",
    confidence: 92,
    lines,
    scan: { entries: [] },
  });

  assert(result, "Debe aceptar un objeto OCR valido.");
  assertEquals(result?.provider, "client", "Proveedor local");
  assertEquals(result?.confidence, 0.92, "Convierte porcentajes a 0..1");
  assertEquals(result?.lines.length, 800, "Limita la cantidad de lineas");
  assert(!result?.text.includes("<"), "Elimina delimitadores peligrosos");
  assertEquals(result?.lines[0].boundingBox, {
    x: 0,
    y: 0.25,
    width: 1,
    height: 0.5,
  }, "Normaliza el bounding box a 0..1");
  assert(result?.structuredScan !== undefined, "Conserva scan para revalidarlo en el servidor");
});

Deno.test("descarta scan estructurado enorme aunque llegue como objeto directo", () => {
  const result = normalizeClientOcr({
    text: "OCR valido",
    confidence: 0.9,
    scan: { payload: "x".repeat(170_000) },
  });
  assert(result, "Conserva el texto OCR limitado.");
  assert(result?.structuredScan === undefined, "No conserva estructuras mayores al limite.");
});

Deno.test("OCR local evita una segunda llamada a Vision", async () => {
  let calls = 0;
  const resolution = await resolveDocumentOcr({
    clientOcr: { text: "Jornada 3", confidence: 0.9 },
    imageBase64: "AQID",
    mimeType: "image/jpeg",
    apiKey: "secret",
    policy: "auto",
    fetchImpl: async () => {
      calls += 1;
      return Response.json({});
    },
  });

  assertEquals(calls, 0, "No llama Vision cuando ya existe OCR local");
  assertEquals(resolution.result?.provider, "client", "Usa el resultado local");
  assert(resolution.attempted, "Registra que hubo OCR local");
});

Deno.test("auto sin secreto conserva el camino Gemini sin llamar red", async () => {
  let calls = 0;
  const resolution = await resolveDocumentOcr({
    imageBase64: "AQID",
    mimeType: "image/jpeg",
    policy: "auto",
    fetchImpl: async () => {
      calls += 1;
      return Response.json({});
    },
  });

  assertEquals(calls, 0, "No llama Vision sin secreto");
  assertEquals(resolution, { result: null, attempted: false }, "Permite fallback sin OCR");
});

Deno.test("Vision usa header secreto y normaliza coordenadas por pagina", async () => {
  let receivedHeaders: Headers | null = null;
  let receivedBody: Record<string, unknown> | null = null;
  const resolution = await resolveDocumentOcr({
    imageBase64: "AQID",
    mimeType: "image/jpeg",
    apiKey: "vision-secret",
    policy: "google-vision",
    fetchImpl: async (_input, init) => {
      receivedHeaders = new Headers(init?.headers);
      receivedBody = JSON.parse(String(init?.body || "{}"));
      return Response.json({
        responses: [{
          fullTextAnnotation: {
            text: "Equipo Norte",
            pages: [{
              width: 1000,
              height: 500,
              blocks: [{
                paragraphs: [{
                  words: [{
                    confidence: 0.95,
                    boundingBox: {
                      vertices: [
                        { x: 100, y: 50 },
                        { x: 300, y: 50 },
                        { x: 300, y: 100 },
                        { x: 100, y: 100 },
                      ],
                    },
                    symbols: [
                      { text: "Equipo", confidence: 0.95 },
                    ],
                  }, {
                    confidence: 0.9,
                    boundingBox: {
                      vertices: [
                        { x: 310, y: 50 },
                        { x: 500, y: 50 },
                        { x: 500, y: 100 },
                        { x: 310, y: 100 },
                      ],
                    },
                    symbols: [
                      { text: "Norte", confidence: 0.9, property: { detectedBreak: { type: "LINE_BREAK" } } },
                    ],
                  }],
                }],
              }],
            }],
          },
        }],
      });
    },
  });

  assertEquals(receivedHeaders?.get("x-goog-api-key"), "vision-secret", "La clave va en header");
  assert(!JSON.stringify(receivedBody).includes("vision-secret"), "La clave no se filtra al body");
  assertEquals(resolution.result?.lines[0].boundingBox, {
    x: 0.1,
    y: 0.1,
    width: 0.4,
    height: 0.1,
  }, "Coordenadas relativas a la pagina");
  assertEquals(resolution.result?.provider, "google-vision", "Proveedor remoto");
});

Deno.test("parsea una respuesta Vision vacia y clasifica limites", () => {
  let emptyCode = "";
  try {
    parseGoogleVisionResponse({ responses: [{}] });
  } catch (error) {
    emptyCode = classifyDocumentOcrError(error).code;
  }
  assertEquals(emptyCode, "OCR_NO_TEXT", "Distingue una imagen sin texto");

  const limited = classifyDocumentOcrError({
    status: 429,
    code: "RESOURCE_EXHAUSTED",
    message: "quota",
    retryAfterSeconds: 17,
  });
  assertEquals(limited.code, "OCR_RATE_LIMITED", "Clasifica cuota de Vision");
  assert(limited.retryable, "Un limite temporal se puede reintentar");
  assertEquals(limited.retryAfterSeconds, 17, "Conserva Retry-After");
});
