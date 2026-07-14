import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "@google/genai";

const MAX_BASE64_LENGTH = 17_500_000;
const GEMINI_TIMEOUT_MS = 45_000;
const GEMINI_THINKING_LEVEL = "low";
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const textField = (description: string) => ({ type: "string", description });
const countField = (description: string) => ({ type: "integer", minimum: 0, description });
const playerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: textField("Nombre del jugador exactamente como se alcanza a leer."),
    goals: countField("Cantidad de goles anotados."),
    ownGoals: countField("Cantidad de autogoles."),
    yellowCards: countField("Cantidad de tarjetas amarillas."),
    redCards: countField("Cantidad de tarjetas rojas."),
  },
  required: ["name", "goals", "ownGoals", "yellowCards", "redCards"],
} as const;

// JSON Schema es el equivalente del modelo Pydantic para la salida estructurada de Gemini.
const matchSheetSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    teamBlocks: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      description: "Dos bloques neutrales de equipo en orden visual. Cada nombre, marcador y penal debe permanecer unido al mismo bloque, sin decidir cual es local o visitante.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          block: { type: "string", enum: ["first", "second"], description: "first para el primer bloque visual y second para el otro." },
          name: textField("Nombre exactamente como aparece en este bloque del documento."),
          score: countField("Marcador final escrito para este mismo equipo. No usar el orden local/visitante ni recalcularlo con los jugadores."),
          penaltyScore: countField("Goles de tanda de penales escritos para este mismo equipo; cero si no hay tanda."),
          players: {
            type: "array",
            description: "Jugadores legibles de este mismo bloque. No incluir jugadores del otro equipo ni duplicar personas.",
            items: playerSchema,
          },
        },
        required: ["block", "name", "score", "penaltyScore", "players"],
      },
    },
    referee: textField("Nombre completo del arbitro; vacio si no es legible."),
    date: textField("Fecha en formato YYYY-MM-DD; vacio si no se puede determinar."),
    time: textField("Hora en formato HH:MM de 24 horas; vacio si no se puede determinar."),
    observations: textField("Observaciones escritas en la cedula; vacio si no existen."),
    walkover: {
      type: "object",
      additionalProperties: false,
      description: "Deteccion de inasistencia o victoria por default escrita en cualquier parte de la cedula, incluidas las listas de jugadores.",
      properties: {
        detected: { type: "boolean", description: "Verdadero solo si hay texto visible que indique que uno o ambos equipos no se presentaron, W.O. o victoria por default." },
        absentTeamBlock: { type: "string", enum: ["first", "second", "both", "unknown", "none"], description: "Bloque visual del equipo que no se presento. No clasificarlo como local o visitante." },
        absentTeamName: textField("Nombre del equipo ausente tal como aparece escrito; vacio si no aparece."),
        evidence: textField("Frase visible que sustenta la deteccion, por ejemplo 'No se presento equipo X'."),
      },
      required: ["detected", "absentTeamBlock", "absentTeamName", "evidence"],
    },
  },
  required: ["teamBlocks", "referee", "date", "time", "observations", "walkover"],
} as const;

const instructions = `# Objetivo
Analiza esta imagen como una cedula arbitral de futbol amateur y transcribe solamente datos visibles.

# Regla critica para equipos y marcadores
- NO decidas cual equipo es local o visitante. En ligas amateur las etiquetas, columnas y posiciones pueden estar invertidas o no respetarse.
- Extrae dos bloques neutrales: first es el primer bloque visual (arriba o izquierda) y second es el otro (abajo o derecha).
- Trata nombre del equipo, marcador final y penales como una sola unidad inseparable. Lee el bloque o renglon completo antes de pasar al siguiente.
- Un marcador pertenece al nombre escrito en su mismo renglon, columna, recuadro o referencia explicita. Nunca intercambies marcadores para que coincidan con un orden local/visitante, con el equipo ganador esperado ni con la lista de jugadores.
- No recalcules el marcador final sumando marcas de jugadores; transcribe el marcador general visible. Los goles por jugador se extraen por separado.

Ejemplo conceptual: si el primer bloque dice "Tigres" junto a 3 y el segundo dice "Leones" junto a 1, devuelve first={name:"Tigres",score:3} y second={name:"Leones",score:1}, aunque otra etiqueta del formato sugiera que Leones es local. La aplicacion resolvera los lados despues usando los nombres registrados.

# Resto de datos
- No corrijas nombres ni los relaciones con bases de datos.
- Cuenta goles y tarjetas por jugador cuando las marcas sean claras y agrega cada jugador directamente en players de su mismo bloque first o second.
Busca cuidadosamente indicaciones de inasistencia en toda la imagen, especialmente dentro del espacio donde deberia ir la lista de jugadores de cada equipo. Ejemplos: "No se presento", "No se presento equipo X", "no llegaron", "inasistencia", "W.O." o "victoria por default".
Si la frase esta escrita dentro del bloque de jugadores de un equipo, usa first o second segun ese bloque, aunque la frase no incluya el nombre.
Marca walkover.detected=true solamente cuando exista evidencia textual visible. Si ambos equipos aparecen como ausentes usa absentTeamBlock=both. Si la frase existe pero no se puede determinar el bloque usa unknown.
Si un dato no es legible usa cadena vacia, cero o unknown segun su tipo. No inventes jugadores, resultados, fechas ni arbitros.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: corsHeaders,
});

const isTimeoutError = (error: unknown) => {
  const candidate = error as { message?: string; name?: string; status?: number };
  const message = `${candidate?.name || ""} ${candidate?.message || ""}`;
  return [408, 504].includes(Number(candidate?.status)) || /abort|deadline|timed?\s*out|timeout/i.test(message);
};

const isTransientGeminiError = (error: unknown) => {
  const status = Number((error as { status?: number })?.status);
  return isTimeoutError(error) || [429, 500, 502, 503, 504].includes(status);
};

const createScanInteraction = (
  client: GoogleGenAI,
  model: string,
  imageBase64: string,
  mimeType: string,
) => client.interactions.create({
  model,
  generation_config: {
    thinking_level: GEMINI_THINKING_LEVEL,
  },
  input: [
    { type: "text", text: instructions },
    // Se mantiene alta resolucion visual para no perder nombres, dorsales ni marcas pequenas.
    { type: "image", data: imageBase64, mime_type: mimeType, resolution: "high" },
  ],
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: matchSheetSchema,
  },
}, {
  // Dos intentos de 45 s evitan esperas cercanas a dos minutos y caben con margen en Supabase.
  timeout: GEMINI_TIMEOUT_MS,
  maxRetries: 0,
});

type GeminiTeamBlock = {
  block?: "first" | "second";
  name?: string;
  score?: number;
  penaltyScore?: number;
  players?: GeminiPlayer[];
};

type GeminiPlayer = Record<string, unknown>;

type GeminiScan = {
  teamBlocks?: GeminiTeamBlock[];
  referee?: string;
  date?: string;
  time?: string;
  observations?: string;
  walkover?: {
    detected?: boolean;
    absentTeamBlock?: "first" | "second" | "both" | "unknown" | "none";
    absentTeamName?: string;
    evidence?: string;
  };
};

const toNonNegativeInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

const normalizeGeminiScan = (raw: GeminiScan) => {
  const blocks = Array.isArray(raw.teamBlocks) ? raw.teamBlocks : [];
  const firstBlock = blocks.find(block => block?.block === "first") || blocks[0] || {};
  const secondBlock = blocks.find(block => block?.block === "second" && block !== firstBlock)
    || blocks.find(block => block !== firstBlock)
    || {};
  const first = {
    block: "first",
    name: String(firstBlock.name || ""),
    score: toNonNegativeInteger(firstBlock.score),
    penaltyScore: toNonNegativeInteger(firstBlock.penaltyScore),
  };
  const second = {
    block: "second",
    name: String(secondBlock.name || ""),
    score: toNonNegativeInteger(secondBlock.score),
    penaltyScore: toNonNegativeInteger(secondBlock.penaltyScore),
  };
  const blockToLegacySide = {
    first: "local",
    second: "visitor",
    both: "both",
    unknown: "unknown",
    none: "none",
  } as const;
  const walkover = raw.walkover || {};

  // localTeam/visitorTeam se conservan solo como contrato legado del cliente.
  // Semanticamente representan el primer y segundo bloque visual, respectivamente.
  return {
    documentTitle: "",
    teamBlocks: [first, second],
    localTeam: { name: first.name, score: first.score },
    visitorTeam: { name: second.name, score: second.score },
    referee: String(raw.referee || ""),
    date: String(raw.date || ""),
    time: String(raw.time || ""),
    observations: String(raw.observations || ""),
    walkover: {
      detected: Boolean(walkover.detected),
      absentTeam: blockToLegacySide[walkover.absentTeamBlock || "unknown"],
      absentTeamName: String(walkover.absentTeamName || ""),
      evidence: String(walkover.evidence || ""),
    },
    penalties: { local: first.penaltyScore, visitor: second.penaltyScore },
    players: [
      ...(firstBlock.players || []).map(player => ({ ...player, team: "local", participated: true })),
      ...(secondBlock.players || []).map(player => ({ ...player, team: "visitor", participated: true })),
    ],
  };
};

const bytesToBase64 = (bytes: Uint8Array) => {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const readImageRequest = async (req: Request) => {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) throw new Error("INVALID_IMAGE_FILE");
    if (!image.size || image.size > 12 * 1024 * 1024) throw new Error("INVALID_IMAGE_SIZE");
    const mimeType = String(formData.get("mimeType") || image.type || "").toLowerCase();
    return {
      imageBase64: bytesToBase64(new Uint8Array(await image.arrayBuffer())),
      mimeType,
      inputBytes: image.size,
    };
  }

  const { imageBase64, mimeType } = await req.json();
  return {
    imageBase64,
    mimeType,
    inputBytes: typeof imageBase64 === "string" ? Math.floor(imageBase64.length * 0.75) : 0,
  };
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") {
      return jsonResponse({ error: "Metodo no permitido." }, 405);
    }

    try {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) {
        return jsonResponse({ error: "GEMINI_API_KEY no esta configurada." }, 500);
      }

      let imageRequest;
      try {
        imageRequest = await readImageRequest(req);
      } catch {
        return jsonResponse({ error: "No se pudo leer la imagen enviada." }, 400);
      }
      const { imageBase64, mimeType, inputBytes } = imageRequest;
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return jsonResponse({ error: "Formato de imagen no admitido." }, 400);
      }
      if (typeof imageBase64 !== "string" || !imageBase64.length || imageBase64.length > MAX_BASE64_LENGTH) {
        return jsonResponse({ error: "La imagen esta vacia o excede el tamano permitido." }, 400);
      }

      const client = new GoogleGenAI({ apiKey });
      const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash";
      const geminiStartedAt = performance.now();
      let attempts = 1;
      let interaction;
      try {
        interaction = await createScanInteraction(client, model, imageBase64, mimeType);
      } catch (error) {
        if (!isTransientGeminiError(error)) throw error;
        attempts = 2;
        console.warn("procesar-cedula: reintentando lectura de alta resolucion", error);
        interaction = await createScanInteraction(client, model, imageBase64, mimeType);
      }

      const outputText = interaction.output_text;
      if (!outputText) throw new Error("Gemini no devolvio contenido.");
      console.info("procesar-cedula: metricas", JSON.stringify({
        durationMs: Math.round(performance.now() - geminiStartedAt),
        attempts,
        inputBytes,
        mimeType,
        thinkingLevel: GEMINI_THINKING_LEVEL,
        visualResolution: "high",
        inputTokens: interaction.usage?.total_input_tokens,
        thoughtTokens: interaction.usage?.total_thought_tokens,
        outputTokens: interaction.usage?.total_output_tokens,
      }));
      return jsonResponse({ scan: normalizeGeminiScan(JSON.parse(outputText) as GeminiScan) });
    } catch (error) {
      console.error("procesar-cedula:", error);
      if (isTransientGeminiError(error)) {
        return jsonResponse({
          error: isTimeoutError(error)
            ? "El analisis tardo mas de lo esperado. Intenta nuevamente con la misma imagen."
            : "El servicio de lectura esta temporalmente ocupado. Intenta nuevamente.",
          code: isTimeoutError(error) ? "SCAN_TIMEOUT" : "SCAN_TEMPORARY_ERROR",
          retryable: true,
        }, 503);
      }
      return jsonResponse({ error: "No se pudo interpretar la cedula. Intenta con una foto mas clara." }, 502);
    }
});
