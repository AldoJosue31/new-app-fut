import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable-key";
const { createPasswordRecoveryHandler } = await import("../../src/server/auth/recoveryHandler.js");
const session = { user: { id: "recovery-user" } };
const destination = (response) => new URL(response.headers.get("location"), "https://ligas.example");

test("el enlace con hash crea cookies y redirige sin exponer el token ni aceptar next", async () => {
  const verifications = [];
  const handler = createPasswordRecoveryHandler({ createClient: (_request, response) => ({ auth: {
    verifyOtp: async (args) => {
      verifications.push(args); response.cookies.set("sb-auth", "recovery-session");
      return { data: { session }, error: null };
    },
  } }) });
  const response = await handler(new NextRequest("https://ligas.example/auth/confirm?token_hash=secret-hash&type=recovery&next=https://evil.invalid"));
  assert.deepEqual(verifications, [{ token_hash: "secret-hash", type: "recovery" }]);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/restablecer-contrasena");
  assert.equal(response.cookies.get("sb-auth").value, "recovery-session");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("la plantilla predeterminada puede intercambiar su código PKCE", async () => {
  const calls = [];
  const handler = createPasswordRecoveryHandler({ createClient: () => ({ auth: {
    exchangeCodeForSession: async (code) => { calls.push(code); return { data: { session }, error: null }; },
  } }) });
  const response = await handler(new NextRequest("https://ligas.example/auth/confirm?code=pkce-recovery"));
  assert.deepEqual(calls, ["pkce-recovery"]);
  assert.equal(destination(response).search, "");
});

test("rechaza enlaces incompletos, otros tipos y errores sin consultar Auth", async () => {
  const handler = createPasswordRecoveryHandler({ createClient: () => { throw new Error("Must not call"); } });
  for (const query of ["", "token_hash=hash", "token_hash=hash&type=signup", "code=code&type=invite", "error=otp_expired&error_description=secret"]) {
    const response = await handler(new NextRequest(`https://ligas.example/auth/confirm?${query}`));
    const location = destination(response);
    assert.equal(location.pathname, "/restablecer-contrasena");
    assert.equal(location.search, "?error=invalid_link");
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

for (const [name, result] of [
  ["enlace vencido o utilizado", { data: { session: null }, error: { status: 403, code: "otp_expired" } }],
  ["verificación sin sesión", { data: { session: null }, error: null }],
]) test(`no autoriza ${name}`, async () => {
  const handler = createPasswordRecoveryHandler({ createClient: () => ({ auth: { verifyOtp: async () => result } }) });
  const response = await handler(new NextRequest("https://ligas.example/auth/confirm?token_hash=hash&type=recovery"));
  assert.equal(destination(response).search, "?error=invalid_link");
  assert.equal(response.cookies.getAll().length, 0);
});

test("los fallos técnicos conservan un estado recuperable", async () => {
  for (const verifyOtp of [async () => ({ data: null, error: { status: 503 } }), async () => { throw new Error("fetch failed"); }]) {
    const handler = createPasswordRecoveryHandler({ createClient: () => ({ auth: { verifyOtp } }) });
    const response = await handler(new NextRequest("https://ligas.example/auth/confirm?token_hash=hash&type=recovery"));
    assert.equal(destination(response).search, "?error=verification_unavailable");
  }
});
