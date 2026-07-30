import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server.js";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "test-publishable-key";

const { updateSession } = await import(
  "../../src/server/auth/sessionProxy.js"
);

test("proxy propaga cookies renovadas y headers anti-cache", async () => {
  let cookieAdapter;
  const request = new NextRequest("http://localhost/dashboard", {
    headers: {
      cookie: "existing=value",
    },
  });

  const response = await updateSession(request, {
    createClient: (_url, _key, options) => {
      cookieAdapter = options.cookies;
      return {
        auth: {
          getClaims: async () => {
            await cookieAdapter.setAll(
              [
                {
                  name: "sb-test-auth-token",
                  options: { httpOnly: false, path: "/", sameSite: "lax" },
                  value: "refreshed",
                },
              ],
              {
                "Cache-Control": "private, no-store",
                Expires: "0",
                Pragma: "no-cache",
              },
            );

            return {
              data: { claims: { sub: "user-1" } },
              error: null,
            };
          },
        },
      };
    },
  });

  assert.equal(cookieAdapter.getAll()[0].name, "existing");
  assert.equal(
    response.cookies.get("sb-test-auth-token")?.value,
    "refreshed",
  );
  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("expires"), "0");
});

test("proxy marca respuestas autenticadas como privadas aun sin refresh", async () => {
  const request = new NextRequest("http://localhost/configuracion");
  const response = await updateSession(request, {
    createClient: () => ({
      auth: {
        getClaims: async () => ({
          data: { claims: { sub: "user-2" } },
          error: null,
        }),
      },
    }),
  });

  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("proxy deja publica una solicitud sin sesion", async () => {
  const request = new NextRequest("http://localhost/landing");
  const response = await updateSession(request, {
    createClient: () => ({
      auth: {
        getClaims: async () => ({
          data: { claims: null },
          error: new Error("Auth session missing"),
        }),
      },
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), null);
});
