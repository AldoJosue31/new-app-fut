import {
  authorizeRateLimitedRequest,
  corsJsonResponse,
  resolveCors,
} from "./edgeSecurity.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: esperado ${JSON.stringify(expected)}, recibido ${
        JSON.stringify(actual)
      }`,
    );
  }
};

const request = (origin?: string, authorization = "Bearer user-jwt") =>
  new Request("https://project.supabase.co/functions/v1/procesar-cedula", {
    method: "POST",
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
    },
  });

const env = (values: Record<string, string>) => (name: string) => values[name];

Deno.test("CORS refleja solo origenes configurados y agrega Vary", () => {
  const cors = resolveCors(request("https://app.example"), {
    getEnv: env({ EDGE_ALLOWED_ORIGINS: "https://app.example" }),
  });
  assertEquals(cors.allowed, true, "el origen configurado debe pasar");
  assertEquals(
    cors.headers["Access-Control-Allow-Origin"],
    "https://app.example",
    "debe reflejar el origen exacto",
  );
  assertEquals(
    cors.headers.Vary,
    "Origin",
    "las caches deben variar por Origin",
  );
});

Deno.test("CORS permite los aliases exactos de produccion", () => {
  const productionOrigins = [
    "https://futbolapp.vercel.app",
    "https://new-app-fut-aldojosue31s-projects.vercel.app",
    "https://new-app-fut-git-main-aldojosue31s-projects.vercel.app",
  ];
  const getEnv = env({
    EDGE_ALLOWED_ORIGINS: productionOrigins.join(","),
  });

  for (const origin of productionOrigins) {
    const cors = resolveCors(request(origin), { getEnv });
    assertEquals(cors.allowed, true, `${origin} debe estar permitido`);
    assertEquals(
      cors.headers["Access-Control-Allow-Origin"],
      origin,
      "debe reflejar cada alias de produccion",
    );
  }
});

Deno.test("CORS rechaza origenes no configurados", async () => {
  const cors = resolveCors(request("https://attacker.example"), {
    getEnv: env({ EDGE_ALLOWED_ORIGINS: "https://app.example" }),
  });
  const response = corsJsonResponse(
    cors,
    { error: "Origen no permitido." },
    403,
  );
  assertEquals(cors.allowed, false, "el origen ajeno debe rechazarse");
  assertEquals(response.status, 403, "el rechazo debe ser explicito");
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    null,
    "no debe emitir ACAO para el atacante",
  );
});

Deno.test("CORS no habilita localhost implicitamente", () => {
  const cors = resolveCors(request("http://localhost:3000"), {
    getEnv: env({
      EDGE_ALLOWED_ORIGINS: "https://futbolapp.vercel.app",
    }),
  });
  assertEquals(
    cors.allowed,
    false,
    "localhost debe declararse explicitamente en el ambiente local",
  );
});

Deno.test("el limitador falla si no hay Bearer", async () => {
  const decision = await authorizeRateLimitedRequest(request(undefined, ""), {
    scope: "procesar-cedula",
    getEnv: env({ EDGE_RATE_LIMIT_MODE: "enforce" }),
  });
  assertEquals(decision.status, 401, "la autenticacion debe ser obligatoria");
});

Deno.test("el limitador propaga 429 y Retry-After", async () => {
  const decision = await authorizeRateLimitedRequest(request(), {
    scope: "procesar-rol-juego",
    getEnv: env({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "publishable-key",
      EDGE_RATE_LIMIT_MODE: "enforce",
    }),
    fetcher: async () =>
      Response.json([{
        allowed: false,
        remaining: 0,
        retry_after_seconds: 73,
      }]),
  });
  assertEquals(decision.status, 429, "debe bloquear al superar la cuota");
  assertEquals(decision.headers?.["Retry-After"], "73", "debe indicar espera");
});

Deno.test("shadow conserva funcionalidad aunque el RPC falle", async () => {
  const decision = await authorizeRateLimitedRequest(request(), {
    scope: "procesar-cedula",
    getEnv: env({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "publishable-key",
      EDGE_RATE_LIMIT_MODE: "shadow",
    }),
    fetcher: async () => new Response("failure", { status: 500 }),
  });
  assertEquals(decision.allowed, true, "shadow no debe interrumpir el escaneo");
});
