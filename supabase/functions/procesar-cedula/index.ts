import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "@google/genai";

const MAX_BASE64_LENGTH = 17_500_000;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const textField = (description: string) => ({ type: "string", description });
const countField = (description: string) => ({ type: "integer", minimum: 0, description });

// JSON Schema es el equivalente del modelo Pydantic para la salida estructurada de Gemini.
const matchSheetSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentTitle: textField("Titulo o encabezado visible del documento; vacio si no existe."),
    localTeam: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: textField("Nombre del equipo identificado como local."),
        score: countField("Marcador final del equipo local."),
      },
      required: ["name", "score"],
    },
    visitorTeam: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: textField("Nombre del equipo identificado como visitante."),
        score: countField("Marcador final del equipo visitante."),
      },
      required: ["name", "score"],
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
        absentTeam: { type: "string", enum: ["local", "visitor", "both", "unknown", "none"], description: "Equipo que no se presento segun la seccion o texto de la cedula." },
        absentTeamName: textField("Nombre del equipo ausente tal como aparece escrito; vacio si no aparece."),
        evidence: textField("Frase visible que sustenta la deteccion, por ejemplo 'No se presento equipo X'."),
      },
      required: ["detected", "absentTeam", "absentTeamName", "evidence"],
    },
    penalties: {
      type: "object",
      additionalProperties: false,
      properties: {
        local: countField("Goles de tanda de penales del local; cero si no hay tanda."),
        visitor: countField("Goles de tanda de penales del visitante; cero si no hay tanda."),
      },
      required: ["local", "visitor"],
    },
    players: {
      type: "array",
      description: "Jugadores legibles que aparecen en alineaciones, goles o tarjetas. No duplicar personas.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: textField("Nombre del jugador exactamente como se alcanza a leer."),
          team: { type: "string", enum: ["local", "visitor", "unknown"] },
          goals: countField("Cantidad de goles anotados."),
          ownGoals: countField("Cantidad de autogoles."),
          yellowCards: countField("Cantidad de tarjetas amarillas."),
          redCards: countField("Cantidad de tarjetas rojas."),
          participated: { type: "boolean", description: "Verdadero si aparece en la alineacion o tuvo un evento." },
        },
        required: ["name", "team", "goals", "ownGoals", "yellowCards", "redCards", "participated"],
      },
    },
  },
  required: ["documentTitle", "localTeam", "visitorTeam", "referee", "date", "time", "observations", "walkover", "penalties", "players"],
} as const;

const instructions = `Analiza esta imagen como una cedula arbitral de futbol amateur.
Transcribe solamente datos visibles. No corrijas nombres ni los relaciones con bases de datos.
Separa local y visitante segun las etiquetas o posicion del documento.
Cuenta goles y tarjetas por jugador cuando las marcas sean claras.
Busca cuidadosamente indicaciones de inasistencia en toda la imagen, especialmente dentro del espacio donde deberia ir la lista de jugadores de cada equipo. Ejemplos: "No se presento", "No se presento equipo X", "no llegaron", "inasistencia", "W.O." o "victoria por default".
Si la frase esta escrita dentro del bloque de jugadores de un equipo, usa la ubicacion de ese bloque para identificar si el ausente es local o visitante, aunque la frase no incluya el nombre.
Marca walkover.detected=true solamente cuando exista evidencia textual visible. Si ambos equipos aparecen como ausentes usa absentTeam=both. Si la frase existe pero no se puede determinar el equipo usa unknown.
Si un dato no es legible usa cadena vacia, cero o unknown segun su tipo.
No inventes jugadores, resultados, fechas ni arbitros.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: corsHeaders,
});

const hasValidUserSession = async (req: Request) => {
  const authorization = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  return response.ok;
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") {
      return jsonResponse({ error: "Metodo no permitido." }, 405);
    }

    try {
      if (!(await hasValidUserSession(req))) {
        return jsonResponse({ error: "Debes iniciar sesion para escanear una cedula." }, 401);
      }

      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) {
        return jsonResponse({ error: "GEMINI_API_KEY no esta configurada." }, 500);
      }

      const { imageBase64, mimeType } = await req.json();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return jsonResponse({ error: "Formato de imagen no admitido." }, 400);
      }
      if (typeof imageBase64 !== "string" || !imageBase64.length || imageBase64.length > MAX_BASE64_LENGTH) {
        return jsonResponse({ error: "La imagen esta vacia o excede el tamano permitido." }, 400);
      }

      const client = new GoogleGenAI({ apiKey });
      const interaction = await client.interactions.create({
        model: Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash",
        input: [
          { type: "text", text: instructions },
          { type: "image", data: imageBase64, mime_type: mimeType },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: matchSheetSchema,
        },
      });

      const outputText = interaction.output_text;
      if (!outputText) throw new Error("Gemini no devolvio contenido.");
      return jsonResponse({ scan: JSON.parse(outputText) });
    } catch (error) {
      console.error("procesar-cedula:", error);
      return jsonResponse({ error: "No se pudo interpretar la cedula. Intenta con una foto mas clara." }, 502);
    }
});
