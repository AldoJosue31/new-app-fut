import { readFile } from "node:fs/promises";
import path from "node:path";

const [imagePath, rawContext = '{"teams":[]}'] = process.argv.slice(2);
if (!imagePath) {
  console.error("Uso: node scripts/verify-cedula-edge.mjs <imagen|--smoke|--client-smoke> [matchContext JSON o base64:...]");
  process.exit(2);
}

const parseEnvFile = contents => Object.fromEntries(
  contents.split(/\r?\n/)
    .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map(line => {
      const separator = line.indexOf("=");
      return [
        line.slice(0, separator),
        line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2"),
      ];
    }),
);

const localEnv = {};
for (const envFile of [".env", ".env.local"]) {
  const contents = await readFile(envFile, "utf8").catch(error => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  Object.assign(localEnv, parseEnvFile(contents));
}
const setting = name => process.env[name] || localEnv[name];
const supabaseUrl = setting("NEXT_PUBLIC_SUPABASE_URL") || setting("VITE_APP_SUPABASE_URL");
const authKey = setting("CEDULA_VERIFY_ACCESS_TOKEN") || setting("SUPABASE_SERVICE_ROLE_KEY");
const apiKey = setting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || setting("VITE_APP_SUPABASE_ANON_KEY") || authKey;
if (!supabaseUrl || !authKey) throw new Error("Faltan URL y SUPABASE_SERVICE_ROLE_KEY o CEDULA_VERIFY_ACCESS_TOKEN para la verificacion autenticada.");

const smokePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const smoke = ["--smoke", "--client-smoke"].includes(imagePath);
const extension = smoke ? ".png" : path.extname(imagePath).toLowerCase();
const mimeType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
const image = smoke ? smokePng : await readFile(imagePath);
const formData = new FormData();
formData.append("image", new Blob([image], { type: mimeType }), smoke ? "smoke.png" : path.basename(imagePath));
formData.append("mimeType", mimeType);
const contextText = rawContext.startsWith("base64:")
  ? Buffer.from(rawContext.slice(7), "base64").toString("utf8")
  : rawContext;
const matchContext = JSON.parse(contextText);
if (imagePath === "--client-smoke") {
  matchContext.teams = [
    { side: "local", name: "Equipo Prueba Norte", players: ["Jugador Prueba Norte"] },
    { side: "visitor", name: "Equipo Prueba Sur", players: ["Jugador Prueba Sur"] },
  ];
  formData.append("clientOcr", JSON.stringify({ text: "cedula de prueba", confidence: 0.99, scan: {
    complete: true, playersComplete: true,
    teamBlocks: matchContext.teams.map((team, index) => ({
      block: index === 0 ? "first" : "second", name: team.name, score: 0, penaltyScore: 0,
      players: [{ name: team.players[0], goals: 0, ownGoals: 0, yellowCards: 0, redCards: 0 }],
    })),
    referee: "", date: "", time: "", observations: "",
    walkover: { detected: false, absentTeamBlock: "none", evidence: "" },
  } }));
}
formData.append("matchContext", JSON.stringify(matchContext));

const clientRequestId = `verify-cedula-${Date.now()}`;
const startedAt = Date.now();
const response = await fetch(`${supabaseUrl}/functions/v1/procesar-cedula`, {
  method: "POST",
  headers: { apikey: apiKey, Authorization: `Bearer ${authKey}`, "x-request-id": clientRequestId },
  body: formData,
  signal: AbortSignal.timeout(120_000),
});
const responseText = await response.text();
let body;
try {
  body = JSON.parse(responseText);
} catch {
  body = { raw: responseText.slice(0, 500) };
}

console.log(JSON.stringify({
  status: response.status,
  requestId: response.headers.get("x-request-id") || body?.requestId || clientRequestId,
  code: body?.code || "",
  error: body?.error || "",
  diagnostic: body?.diagnostic || null,
  hasScan: Boolean(body?.scan),
  provider: body?.scanMeta?.provider || "",
  cache: response.headers.get("x-scan-cache") || "",
  durationMs: Date.now() - startedAt,
  scores: body?.scan ? { local: body.scan.localTeam?.score, visitor: body.scan.visitorTeam?.score } : null,
  playerCount: body?.scan?.players?.length || 0,
}, null, 2));
if (!response.ok || !body?.scan) process.exitCode = 1;
if (imagePath === "--client-smoke" && (body?.scanMeta?.provider !== "client"
  || body?.scan?.localTeam?.name !== matchContext.teams[0].name
  || body?.scan?.visitorTeam?.name !== matchContext.teams[1].name)) process.exitCode = 1;
