import { authorizeScanRequest, createScanQuotaGate, ScanRequestError } from "./scanAuthorization.ts";

const actor = "6c1db26d-0a43-4320-a45a-9f26bb8c1e6a";
const token = `header.${btoa(JSON.stringify({ sub: actor, role: "authenticated" }))}.signature`;
const request = (authorization = `Bearer ${token}`) => new Request("https://example.com", { headers: { Authorization: authorization } });
const getEnv = (name: string) => ({
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: "server-secret",
}[name]);
const assertEquals = (actual: unknown, expected: unknown) => {
  if (actual !== expected) throw new Error(`Esperado ${expected}, recibido ${actual}`);
};
const rejection = async (read: () => Promise<unknown>) => {
  try { await read(); } catch (error) {
    if (error instanceof ScanRequestError) return error.decision;
    throw error;
  }
  throw new Error("Se esperaba un rechazo.");
};

Deno.test("autentica con PostgREST y el perfil activo antes de devolver la clave de cache", async () => {
  let observedUrl = "";
  let observedAuthorization = "";
  const result = await authorizeScanRequest(request(), {
    getEnv,
    fetcher: (input, init) => {
      observedUrl = String(input);
      observedAuthorization = new Headers(init?.headers).get("Authorization") || "";
      return Promise.resolve(Response.json([{ id: actor, is_suspended: false, is_deleted: false }]));
    },
  });
  assertEquals(result, actor);
  assertEquals(observedUrl.includes(`id=eq.${actor}`), true);
  assertEquals(observedAuthorization, `Bearer ${token}`);
});

Deno.test("una firma JWT invalida no obtiene resultados de cache", async () => {
  const result = await rejection(() => authorizeScanRequest(request(), {
    getEnv, fetcher: () => Promise.resolve(new Response("invalid jwt", { status: 401 })),
  }));
  assertEquals(result.status, 401);
  assertEquals(result.body?.code, "EDGE_AUTH_REJECTED");
});

Deno.test("rechaza perfiles suspendidos, eliminados o no visibles por RLS", async () => {
  for (const profiles of [[], [{ id: actor, is_suspended: true }], [{ id: actor, is_deleted: true }]]) {
    const result = await rejection(() => authorizeScanRequest(request(), {
      getEnv, fetcher: () => Promise.resolve(Response.json(profiles)),
    }));
    assertEquals(result.status, 403);
  }
});

Deno.test("solo la clave service role exacta evita verificar la firma con PostgREST", async () => {
  let calls = 0;
  const fetcher: typeof fetch = () => { calls++; return Promise.resolve(new Response("invalid", { status: 401 })); };
  assertEquals(await authorizeScanRequest(request("Bearer server-secret"), { getEnv, fetcher }), "service_role");
  const forgedToken = `header.${btoa(JSON.stringify({ sub: actor, role: "service_role" }))}.signature`;
  const result = await rejection(() => authorizeScanRequest(request(`Bearer ${forgedToken}`), { getEnv, fetcher }));
  assertEquals(result.status, 401);
  assertEquals(calls, 1);
});

Deno.test("acepta JWT service role sin sub solo despues de validar su firma en PostgREST", async () => {
  const serviceToken = `header.${btoa(JSON.stringify({ role: "service_role" }))}.valid-signature`;
  let verifiedAuthorization = "";
  let verifiedUrl = "";
  const result = await authorizeScanRequest(request(`Bearer ${serviceToken}`), {
    getEnv,
    fetcher: (input, init) => {
      verifiedUrl = String(input);
      verifiedAuthorization = new Headers(init?.headers).get("Authorization") || "";
      return Promise.resolve(Response.json([]));
    },
  });
  assertEquals(result, "service_role");
  assertEquals(verifiedUrl, "https://project.supabase.co/rest/v1/profiles?select=id&limit=0");
  assertEquals(verifiedAuthorization, `Bearer ${serviceToken}`);
});

Deno.test("rechaza JWT service role falsificado sin sub cuando PostgREST rechaza la firma", async () => {
  const serviceToken = `header.${btoa(JSON.stringify({ role: "service_role" }))}.forged-signature`;
  const result = await rejection(() => authorizeScanRequest(request(`Bearer ${serviceToken}`), {
    getEnv, fetcher: () => Promise.resolve(new Response("invalid jwt", { status: 401 })),
  }));
  assertEquals(result.status, 401);
  assertEquals(result.body?.code, "EDGE_AUTH_REJECTED");
});

Deno.test("error de red autenticando es recuperable y no se confunde con cuota Gemini", async () => {
  const result = await rejection(() => authorizeScanRequest(request(), {
    getEnv, fetcher: () => Promise.reject(new TypeError("fetch failed")),
  }));
  assertEquals(result.body?.code, "EDGE_AUTH_UNAVAILABLE");
  assertEquals(result.headers?.["Retry-After"], "5");
});

Deno.test("Vision y Gemini comparten un solo consumo de cuota por lectura", async () => {
  let checks = 0;
  const ensureRateLimit = createScanQuotaGate(() => {
    checks++;
    return Promise.resolve({ allowed: true });
  });
  await ensureRateLimit(); // OCR remoto.
  await ensureRateLimit(); // Gemini despues de un OCR no concluyente.
  assertEquals(checks, 1);
});

Deno.test("rechazo de cuota antes de Vision impide cualquier API externa y conserva el error", async () => {
  let checks = 0;
  let providerCalls = 0;
  const ensureRateLimit = createScanQuotaGate(() => {
    checks++;
    return Promise.resolve({ allowed: false, status: 429, body: { code: "EDGE_RATE_LIMITED" }, headers: { "Retry-After": "90" } });
  });
  const read = async () => {
    await ensureRateLimit();
    providerCalls++;
  };
  const rejected = await rejection(read);
  await rejection(read);
  assertEquals(rejected.body?.code, "EDGE_RATE_LIMITED");
  assertEquals(rejected.headers?.["Retry-After"], "90");
  assertEquals(providerCalls, 0);
  assertEquals(checks, 1);
});
