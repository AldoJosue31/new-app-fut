import { readFile } from "node:fs/promises";
import path from "node:path";

const [imagePath, rawContext] = process.argv.slice(2);
if (!imagePath || !rawContext) {
  console.error(
    "Uso: node scripts/verify-rol-juego-edge.mjs <imagen> <scanContext JSON o base64:...>",
  );
  process.exit(2);
}

const parseEnvFile = (contents) => Object.fromEntries(
  contents
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      const key = line.slice(0, separator);
      const value = line.slice(separator + 1).trim()
        .replace(/^(['"])(.*)\1$/, "$2");
      return [key, value];
    }),
);

const localEnv = parseEnvFile(await readFile(".env", "utf8"));
const supabaseUrl = localEnv.VITE_APP_SUPABASE_URL;
const authKey = localEnv.VITE_APP_SUPABASE_ANON_KEY ||
  localEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !authKey) {
  throw new Error("Faltan URL o credenciales de Supabase en .env");
}

const extension = path.extname(imagePath).toLowerCase();
const mimeType = extension === ".png"
  ? "image/png"
  : extension === ".webp"
  ? "image/webp"
  : "image/jpeg";
const image = await readFile(imagePath);
const formData = new FormData();
formData.append("image", new Blob([image], { type: mimeType }), path.basename(imagePath));
formData.append("mimeType", mimeType);
const contextText = rawContext.startsWith("base64:")
  ? Buffer.from(rawContext.slice(7), "base64").toString("utf8")
  : rawContext;
formData.append("scanContext", JSON.stringify(JSON.parse(contextText)));

const response = await fetch(
  `${supabaseUrl}/functions/v1/procesar-rol-juego`,
  {
    method: "POST",
    headers: {
      apikey: authKey,
      Authorization: `Bearer ${authKey}`,
    },
    body: formData,
  },
);
const responseText = await response.text();
let body;
try {
  body = JSON.parse(responseText);
} catch {
  body = { raw: responseText.slice(0, 500) };
}

console.log(JSON.stringify({
  status: response.status,
  requestId: response.headers.get("x-request-id") || body?.requestId || "",
  code: body?.code || "",
  error: body?.error || "",
  scan: body?.scan || null,
}, null, 2));
if (!response.ok) process.exitCode = 1;
