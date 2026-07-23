const GOOGLE_VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
const DEFAULT_TIMEOUT_MS = 12_000;
const MIN_TIMEOUT_MS = 3_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_CLIENT_OCR_JSON_LENGTH = 160_000;
const MAX_OCR_TEXT_LENGTH = 40_000;
const MAX_OCR_LINES = 800;
const MAX_LINE_TEXT_LENGTH = 500;

export type OcrBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DocumentOcrLine = {
  text: string;
  confidence: number;
  boundingBox?: OcrBoundingBox;
};

export type DocumentOcrProvider = "client" | "google-vision";

export type DocumentOcrResult = {
  provider: DocumentOcrProvider;
  text: string;
  lines: DocumentOcrLine[];
  confidence: number;
  /**
   * Salida estructurada propuesta por el cliente. Siempre debe revalidarse con
   * el contexto cerrado del servidor antes de utilizarse.
   */
  structuredScan?: unknown;
};

export type DocumentOcrPolicy =
  | "auto"
  | "client-only"
  | "google-vision"
  | "gemini"
  | "disabled";

export type DocumentOcrResolution = {
  result: DocumentOcrResult | null;
  attempted: boolean;
};

export type DocumentOcrErrorClassification = {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
  retryAfterSeconds: number;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type VisionVertex = { x?: unknown; y?: unknown };
type VisionBoundingPoly = { vertices?: VisionVertex[] };
type VisionSymbol = {
  text?: unknown;
  confidence?: unknown;
  property?: { detectedBreak?: { type?: unknown } };
};
type VisionWord = {
  symbols?: VisionSymbol[];
  confidence?: unknown;
  boundingBox?: VisionBoundingPoly;
};
type VisionParagraph = {
  words?: VisionWord[];
  confidence?: unknown;
};
type VisionResponse = {
  responses?: Array<{
    error?: { code?: unknown; status?: unknown; message?: unknown };
    fullTextAnnotation?: {
      text?: unknown;
      pages?: Array<{
        width?: unknown;
        height?: unknown;
        blocks?: Array<{ paragraphs?: VisionParagraph[] }>;
      }>;
    };
  }>;
};

export class DocumentOcrError extends Error {
  status: number;
  code: string;
  retryable: boolean;
  retryAfterSeconds: number;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      retryable?: boolean;
      retryAfterSeconds?: number;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "DocumentOcrError";
    this.status = Number(options.status) || 0;
    this.code = String(options.code || "OCR_ERROR");
    this.retryable = Boolean(options.retryable);
    this.retryAfterSeconds = Math.max(0, Number(options.retryAfterSeconds) || 0);
  }
}

const sanitizeText = (value: unknown, maxLength: number) =>
  String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);

const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeOcrConfidence = (value: unknown) => {
  const parsed = finiteNumber(value, 0);
  const normalized = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  return Math.min(1, Math.max(0, normalized));
};

const normalizeBoundingBox = (value: unknown): OcrBoundingBox | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const x = finiteNumber(candidate.x, Number.NaN);
  const y = finiteNumber(candidate.y, Number.NaN);
  const width = finiteNumber(candidate.width, Number.NaN);
  const height = finiteNumber(candidate.height, Number.NaN);
  if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) {
    return undefined;
  }
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    width: Math.min(1 - Math.min(1, Math.max(0, x)), width),
    height: Math.min(1 - Math.min(1, Math.max(0, y)), height),
  };
};

const averageLineConfidence = (lines: DocumentOcrLine[]) => {
  let weightedTotal = 0;
  let weight = 0;
  for (const line of lines) {
    const lineWeight = Math.max(1, line.text.length);
    weightedTotal += line.confidence * lineWeight;
    weight += lineWeight;
  }
  return weight ? weightedTotal / weight : 0;
};

const parseClientOcrValue = (value: unknown) => {
  if (typeof value !== "string") return value;
  if (!value.trim() || value.length > MAX_CLIENT_OCR_JSON_LENGTH) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const boundedStructuredScan = (value: unknown) => {
  if (value === undefined) return undefined;
  try {
    return JSON.stringify(value).length <= MAX_CLIENT_OCR_JSON_LENGTH ? value : undefined;
  } catch {
    return undefined;
  }
};

/** Normaliza OCR no confiable enviado por el navegador y aplica limites duros. */
export const normalizeClientOcr = (value: unknown): DocumentOcrResult | null => {
  const parsed = parseClientOcrValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const candidate = parsed as Record<string, unknown>;
  const rawLines = Array.isArray(candidate.lines)
    ? candidate.lines.slice(0, MAX_OCR_LINES)
    : [];
  const lines = rawLines.flatMap((rawLine): DocumentOcrLine[] => {
    if (!rawLine || typeof rawLine !== "object") return [];
    const line = rawLine as Record<string, unknown>;
    const text = sanitizeText(line.text, MAX_LINE_TEXT_LENGTH).replace(/\n+/g, " ");
    if (!text) return [];
    const boundingBox = normalizeBoundingBox(line.boundingBox);
    return [{
      text,
      confidence: normalizeOcrConfidence(line.confidence),
      ...(boundingBox ? { boundingBox } : {}),
    }];
  });
  const text = sanitizeText(
    candidate.text || lines.map((line) => line.text).join("\n"),
    MAX_OCR_TEXT_LENGTH,
  );
  const structuredScan = boundedStructuredScan(candidate.scan ?? candidate.structuredScan);
  if (!text && !lines.length && structuredScan === undefined) return null;

  const explicitConfidence = normalizeOcrConfidence(candidate.confidence);
  const confidence = explicitConfidence || averageLineConfidence(lines);
  return {
    provider: "client",
    text,
    lines,
    confidence,
    ...(structuredScan !== undefined ? { structuredScan } : {}),
  };
};

export const normalizeDocumentOcrPolicy = (
  value: unknown,
  fallback: DocumentOcrPolicy = "auto",
): DocumentOcrPolicy => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "vision") return "google-vision";
  if (["auto", "client-only", "google-vision", "gemini", "disabled"].includes(normalized)) {
    return normalized as DocumentOcrPolicy;
  }
  return fallback;
};

const timeoutMilliseconds = (value: unknown) => {
  const parsed = Math.trunc(finiteNumber(value, DEFAULT_TIMEOUT_MS));
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, parsed));
};

const retryAfterFromHeaders = (headers: Headers) => {
  const seconds = Math.ceil(finiteNumber(headers.get("retry-after"), 0));
  return Math.min(300, Math.max(0, seconds));
};

const verticesToBoundingBox = (
  vertices: VisionVertex[] | undefined,
  pageWidth: number,
  pageHeight: number,
): OcrBoundingBox | undefined => {
  const points = (Array.isArray(vertices) ? vertices : []).map((vertex) => ({
    x: finiteNumber(vertex?.x, 0),
    y: finiteNumber(vertex?.y, 0),
  }));
  if (!points.length) return undefined;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const normalizedX = Math.min(1, Math.max(0, minX / pageWidth));
  const normalizedY = Math.min(1, Math.max(0, minY / pageHeight));
  return {
    x: normalizedX,
    y: normalizedY,
    width: Math.min(1 - normalizedX, Math.max(0, (Math.max(...xs) - minX) / pageWidth)),
    height: Math.min(1 - normalizedY, Math.max(0, (Math.max(...ys) - minY) / pageHeight)),
  };
};

const mergeBoxes = (boxes: Array<OcrBoundingBox | undefined>) => {
  const present = boxes.filter((box): box is OcrBoundingBox => Boolean(box));
  if (!present.length) return undefined;
  const minX = Math.min(...present.map((box) => box.x));
  const minY = Math.min(...present.map((box) => box.y));
  const maxX = Math.max(...present.map((box) => box.x + box.width));
  const maxY = Math.max(...present.map((box) => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const paragraphLines = (
  paragraph: VisionParagraph,
  pageWidth: number,
  pageHeight: number,
): DocumentOcrLine[] => {
  const lines: DocumentOcrLine[] = [];
  let words: Array<{ text: string; confidence: number; boundingBox?: OcrBoundingBox }> = [];
  const flush = () => {
    const text = sanitizeText(words.map((word) => word.text).join(" "), MAX_LINE_TEXT_LENGTH)
      .replace(/\s+([,.;:!?])/g, "$1");
    if (text) {
      const totalCharacters = words.reduce((total, word) => total + Math.max(1, word.text.length), 0);
      const confidence = totalCharacters
        ? words.reduce(
          (total, word) => total + (word.confidence * Math.max(1, word.text.length)),
          0,
        ) / totalCharacters
        : normalizeOcrConfidence(paragraph.confidence);
      const boundingBox = mergeBoxes(words.map((word) => word.boundingBox));
      lines.push({ text, confidence, ...(boundingBox ? { boundingBox } : {}) });
    }
    words = [];
  };

  for (const word of Array.isArray(paragraph.words) ? paragraph.words : []) {
    const symbols = Array.isArray(word.symbols) ? word.symbols : [];
    const text = sanitizeText(symbols.map((symbol) => symbol.text || "").join(""), MAX_LINE_TEXT_LENGTH);
    if (!text) continue;
    const symbolConfidence = symbols.length
      ? symbols.reduce((total, symbol) => total + normalizeOcrConfidence(symbol.confidence), 0) /
        symbols.length
      : 0;
    words.push({
      text,
      confidence: normalizeOcrConfidence(word.confidence) || symbolConfidence ||
        normalizeOcrConfidence(paragraph.confidence),
      boundingBox: verticesToBoundingBox(
        word.boundingBox?.vertices,
        pageWidth,
        pageHeight,
      ),
    });
    const breakType = String(symbols.at(-1)?.property?.detectedBreak?.type || "");
    if (breakType === "LINE_BREAK" || breakType === "EOL_SURE") flush();
  }
  flush();
  return lines;
};

export const parseGoogleVisionResponse = (payload: unknown): DocumentOcrResult => {
  const response = (payload as VisionResponse)?.responses?.[0];
  if (response?.error) {
    const status = Math.trunc(finiteNumber(response.error.code, 0));
    throw new DocumentOcrError(
      sanitizeText(response.error.message, 500) || "Google Vision rechazo el analisis.",
      { status, code: String(response.error.status || "OCR_PROVIDER_ERROR") },
    );
  }
  const annotation = response?.fullTextAnnotation;
  const text = sanitizeText(annotation?.text, MAX_OCR_TEXT_LENGTH);
  const lines = (Array.isArray(annotation?.pages) ? annotation.pages : [])
    .flatMap((page) => {
      const pageWidth = Math.max(1, finiteNumber(page.width, 1));
      const pageHeight = Math.max(1, finiteNumber(page.height, 1));
      return (Array.isArray(page.blocks) ? page.blocks : [])
        .flatMap((block) => Array.isArray(block.paragraphs) ? block.paragraphs : [])
        .flatMap((paragraph) => paragraphLines(paragraph, pageWidth, pageHeight));
    })
    .slice(0, MAX_OCR_LINES);
  const normalizedLines = lines.length
    ? lines
    : text.split("\n").slice(0, MAX_OCR_LINES).flatMap((line): DocumentOcrLine[] => {
      const clean = sanitizeText(line, MAX_LINE_TEXT_LENGTH);
      return clean ? [{ text: clean, confidence: 0 }] : [];
    });
  if (!text && !normalizedLines.length) {
    throw new DocumentOcrError("Google Vision no encontro texto legible.", {
      code: "OCR_NO_TEXT",
      retryable: false,
    });
  }
  return {
    provider: "google-vision",
    text: text || normalizedLines.map((line) => line.text).join("\n"),
    lines: normalizedLines,
    confidence: averageLineConfidence(normalizedLines),
  };
};

export const classifyDocumentOcrError = (
  error: unknown,
): DocumentOcrErrorClassification => {
  const candidate = error as {
    status?: unknown;
    code?: unknown;
    name?: unknown;
    message?: unknown;
    retryable?: unknown;
    retryAfterSeconds?: unknown;
  };
  const status = Math.trunc(finiteNumber(candidate?.status, 0));
  const upstreamCode = String(candidate?.code || "");
  const rawMessage = sanitizeText(candidate?.message, 500);
  if (candidate instanceof DocumentOcrError && candidate.code === "OCR_NOT_CONFIGURED") {
    return { status: 0, code: candidate.code, message: candidate.message, retryable: false, retryAfterSeconds: 0 };
  }
  if (candidate instanceof DocumentOcrError && candidate.code === "OCR_NO_TEXT") {
    return { status: 0, code: candidate.code, message: candidate.message, retryable: false, retryAfterSeconds: 0 };
  }
  if (candidate?.name === "AbortError" || /abort|timeout|timed out/i.test(rawMessage)) {
    return {
      status: 504,
      code: "OCR_TIMEOUT",
      message: "El OCR documental tardo mas de lo permitido.",
      retryable: true,
      retryAfterSeconds: 2,
    };
  }
  if (status === 429 || upstreamCode === "RESOURCE_EXHAUSTED") {
    return {
      status: 429,
      code: "OCR_RATE_LIMITED",
      message: "El OCR documental alcanzo temporalmente su limite.",
      retryable: true,
      retryAfterSeconds: Math.max(5, finiteNumber(candidate?.retryAfterSeconds, 20)),
    };
  }
  if (status === 401 || status === 403 || upstreamCode === "PERMISSION_DENIED") {
    return {
      status,
      code: "OCR_PROVIDER_AUTH_ERROR",
      message: "El OCR documental no pudo autenticarse.",
      retryable: false,
      retryAfterSeconds: 0,
    };
  }
  if (status === 400 || upstreamCode === "INVALID_ARGUMENT") {
    return {
      status,
      code: "OCR_CONFIGURATION_ERROR",
      message: "El OCR documental rechazo la configuracion o la imagen.",
      retryable: false,
      retryAfterSeconds: 0,
    };
  }
  if (status >= 500 || /fetch failed|network|connection|econnreset/i.test(rawMessage)) {
    return {
      status: status || 503,
      code: "OCR_TEMPORARY_ERROR",
      message: "El OCR documental no esta disponible temporalmente.",
      retryable: true,
      retryAfterSeconds: Math.max(2, finiteNumber(candidate?.retryAfterSeconds, 5)),
    };
  }
  return {
    status,
    code: upstreamCode || "OCR_ERROR",
    message: rawMessage || "No se pudo ejecutar el OCR documental.",
    retryable: Boolean(candidate?.retryable),
    retryAfterSeconds: Math.max(0, finiteNumber(candidate?.retryAfterSeconds, 0)),
  };
};

export const readDocumentWithGoogleVision = async (options: {
  imageBase64: string;
  mimeType: string;
  apiKey: string;
  timeoutMs?: unknown;
  languageHints?: string[];
  parent?: string;
  fetchImpl?: FetchLike;
}): Promise<DocumentOcrResult> => {
  const apiKey = String(options.apiKey || "").trim();
  if (!apiKey) {
    throw new DocumentOcrError("GOOGLE_CLOUD_VISION_API_KEY no esta configurada.", {
      code: "OCR_NOT_CONFIGURED",
    });
  }
  const imageBase64 = String(options.imageBase64 || "")
    .replace(/^data:[^;,]+;base64,/i, "")
    .replace(/\s+/g, "");
  if (!imageBase64) {
    throw new DocumentOcrError("La imagen para OCR esta vacia.", {
      status: 400,
      code: "INVALID_ARGUMENT",
    });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds(options.timeoutMs));
  const fetchImpl = options.fetchImpl || fetch;
  const languageHints = (Array.isArray(options.languageHints) ? options.languageHints : ["es"])
    .map((hint) => sanitizeText(hint, 12))
    .filter(Boolean)
    .slice(0, 4);
  const parent = /^projects\/[a-z0-9._:-]+\/locations\/(?:us|eu)$/i.test(String(options.parent || ""))
    ? String(options.parent)
    : "";

  try {
    const response = await fetchImpl(GOOGLE_VISION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // La clave nunca viaja en URL para evitar que aparezca en logs/proxies.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints },
        }],
        ...(parent ? { parent } : {}),
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerError = (payload as { error?: { code?: unknown; status?: unknown; message?: unknown } })?.error;
      throw new DocumentOcrError(
        sanitizeText(providerError?.message, 500) || `Google Vision respondio ${response.status}.`,
        {
          status: response.status,
          code: String(providerError?.status || "OCR_HTTP_ERROR"),
          retryable: response.status === 429 || response.status >= 500,
          retryAfterSeconds: retryAfterFromHeaders(response.headers),
        },
      );
    }
    return parseGoogleVisionResponse(payload);
  } catch (error) {
    if (error instanceof DocumentOcrError) throw error;
    const classified = classifyDocumentOcrError(error);
    throw new DocumentOcrError(classified.message, {
      status: classified.status,
      code: classified.code,
      retryable: classified.retryable,
      retryAfterSeconds: classified.retryAfterSeconds,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Prioridad estable: OCR ya calculado en navegador > Vision opcional > sin OCR.
 * Nunca ejecuta Vision despues de recibir un clientOcr valido, incluso si es
 * incompleto; la funcion llamadora decide si necesita Gemini.
 */
export const resolveDocumentOcr = async (options: {
  clientOcr?: unknown;
  imageBase64: string;
  mimeType: string;
  apiKey?: string;
  policy?: unknown;
  defaultPolicy?: DocumentOcrPolicy;
  timeoutMs?: unknown;
  languageHints?: string[];
  parent?: string;
  fetchImpl?: FetchLike;
}): Promise<DocumentOcrResolution> => {
  const policy = normalizeDocumentOcrPolicy(
    options.policy,
    options.defaultPolicy || "auto",
  );
  if (policy === "disabled" || policy === "gemini") {
    return { result: null, attempted: false };
  }
  const clientResult = normalizeClientOcr(options.clientOcr);
  if (clientResult) return { result: clientResult, attempted: true };
  if (policy === "client-only") return { result: null, attempted: false };
  if (!String(options.apiKey || "").trim() && policy === "auto") {
    return { result: null, attempted: false };
  }
  return {
    result: await readDocumentWithGoogleVision({
      imageBase64: options.imageBase64,
      mimeType: options.mimeType,
      apiKey: options.apiKey || "",
      timeoutMs: options.timeoutMs,
      languageHints: options.languageHints,
      parent: options.parent,
      fetchImpl: options.fetchImpl,
    }),
    attempted: true,
  };
};

export const createScanMeta = (options: {
  provider: DocumentOcrProvider | "gemini";
  fallbackUsed?: boolean;
  confidence?: number | null;
  ocrResult?: DocumentOcrResult | null;
}) => ({
  provider: options.provider,
  fallbackUsed: Boolean(options.fallbackUsed),
  confidence: options.confidence === null || options.confidence === undefined
    ? null
    : normalizeOcrConfidence(options.confidence),
  ...(options.ocrResult
    ? {
      ocrProvider: options.ocrResult.provider,
      ocrConfidence: normalizeOcrConfidence(options.ocrResult.confidence),
    }
    : {}),
});
