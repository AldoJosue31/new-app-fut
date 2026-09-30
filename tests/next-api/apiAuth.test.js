import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const { requireUser } = await import(
  "../../src/server/api/supabaseAdmin.js"
);

const createVerifiedClient = (user, onGetUser) => ({
  auth: {
    getUser: async (...args) => {
      onGetUser?.(args);
      return {
        data: { user },
        error: null,
      };
    },
  },
});

test("requireUser conserva Bearer y reutiliza la verificacion por request", async () => {
  let createCalls = 0;
  let getUserCalls = 0;
  const request = {
    headers: {
      authorization: "Bearer bearer-token",
    },
  };
  const options = {
    createBearerClient: (token) => {
      createCalls += 1;
      assert.equal(token, "bearer-token");
      return createVerifiedClient({ id: "bearer-user" }, (args) => {
        getUserCalls += 1;
        assert.deepEqual(args, ["bearer-token"]);
      });
    },
  };

  const first = await requireUser(request, options);
  const second = await requireUser(request, options);

  assert.equal(first.authTransport, "bearer");
  assert.equal(first.user.id, "bearer-user");
  assert.equal(second, first);
  assert.equal(createCalls, 1);
  assert.equal(getUserCalls, 1);
});

test("requireUser admite la sesion SSR desde cookies", async () => {
  let getUserArguments = null;
  const request = {
    headers: {
      cookie: "sb-test-auth-token=fake",
    },
    responseHeaders: new Headers(),
  };

  const result = await requireUser(request, {
    createCookieClient: (receivedRequest) => {
      assert.equal(receivedRequest, request);
      return createVerifiedClient({ id: "cookie-user" }, (args) => {
        getUserArguments = args;
      });
    },
  });

  assert.equal(result.authTransport, "cookie");
  assert.equal(result.accessToken, null);
  assert.equal(result.user.id, "cookie-user");
  assert.deepEqual(getUserArguments, []);
});

test("requireUser falla cerrado sin Bearer ni cookie", async () => {
  await assert.rejects(
    () => requireUser({ headers: {} }),
    (error) => error.statusCode === 401 && error.message === "Unauthorized",
  );
});

test("requireUser devuelve 503 ante un fallo temporal con cookies o Bearer", async () => {
  for (const headers of [{ cookie: "sb-auth=session" }, { authorization: "Bearer token" }]) {
    const createClient = () => ({ auth: { getUser: async () => ({
      data: { user: null }, error: { name: "AuthRetryableFetchError", status: 503 },
    }) } });
    await assert.rejects(() => requireUser({ headers }, {
      createCookieClient: createClient, createBearerClient: createClient,
    }), (error) => error.statusCode === 503);
  }
});

test("requireUser sigue rechazando una sesion realmente invalida", async () => {
  await assert.rejects(() => requireUser({ headers: { cookie: "sb-auth=session" } }, {
    createCookieClient: () => ({ auth: { getUser: async () => ({
      data: { user: null }, error: { code: "bad_jwt", status: 401 },
    }) } }),
  }), (error) => error.statusCode === 401);
});
