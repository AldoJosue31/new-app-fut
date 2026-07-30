import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server.js";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable-key";

const { createAuthCallbackHandler } = await import(
  "../../src/server/auth/callbackHandler.js"
);

test("callback PKCE intercambia el codigo y conserva un retorno interno", async () => {
  const exchanges = [];
  const handler = createAuthCallbackHandler({
    createClient: (_request, response) => ({
      auth: {
        exchangeCodeForSession: async (code) => {
          exchanges.push(code);
          response.cookies.set("sb-auth", "session", {
            path: "/",
            sameSite: "lax",
          });
          return { data: { session: {} }, error: null };
        },
      },
    }),
  });

  const response = await handler(
    new NextRequest(
      "http://localhost/auth/callback?code=pkce-code&next=%2Fconfiguracion",
    ),
  );

  assert.deepEqual(exchanges, ["pkce-code"]);
  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "http://localhost/configuracion",
  );
  assert.equal(response.cookies.get("sb-auth")?.value, "session");
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("callback rechaza retornos externos", async () => {
  const handler = createAuthCallbackHandler({
    createClient: () => ({
      auth: {
        exchangeCodeForSession: async () => ({
          data: { session: {} },
          error: null,
        }),
      },
    }),
  });

  const response = await handler(
    new NextRequest(
      "http://localhost/auth/callback?code=pkce-code&next=https%3A%2F%2Fevil.invalid",
    ),
  );

  assert.equal(
    response.headers.get("location"),
    "http://localhost/dashboard",
  );
});

test("callback convierte errores OAuth en query params del login", async () => {
  const handler = createAuthCallbackHandler();
  const response = await handler(
    new NextRequest(
      "http://localhost/auth/callback?error=access_denied&error_description=Cancelled",
    ),
  );
  const location = new URL(response.headers.get("location"));

  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("error"), "access_denied");
  assert.equal(location.searchParams.get("error_description"), "Cancelled");
  assert.equal(response.status, 303);
});

test("callback falla cerrado si no puede intercambiar el codigo", async () => {
  const handler = createAuthCallbackHandler({
    createClient: () => ({
      auth: {
        exchangeCodeForSession: async () => ({
          data: { session: null },
          error: new Error("invalid code"),
        }),
      },
    }),
  });
  const response = await handler(
    new NextRequest("http://localhost/auth/callback?code=bad-code"),
  );
  const location = new URL(response.headers.get("location"));

  assert.equal(location.pathname, "/login");
  assert.equal(
    location.searchParams.get("error"),
    "code_exchange_failed",
  );
});
