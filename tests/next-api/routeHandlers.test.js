import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const routePaths = [
  "../../app/api/admin/managers/create/route.js",
  "../../app/api/admin/managers/delete/route.js",
  "../../app/api/admin/managers/limits/route.js",
  "../../app/api/admin/managers/suspension/route.js",
  "../../app/api/admin/managers/update/route.js",
  "../../app/api/delegates/account/route.js",
  "../../app/api/delegates/unlink/route.js",
  "../../app/api/divisions/[divisionId]/workspace/route.js",
];

const factoryPaths = [
  "../../app/api/admin/managers/create/routeFactory.js",
  "../../app/api/admin/managers/delete/routeFactory.js",
  "../../app/api/admin/managers/limits/routeFactory.js",
  "../../app/api/admin/managers/suspension/routeFactory.js",
  "../../app/api/admin/managers/update/routeFactory.js",
  "../../app/api/delegates/account/routeFactory.js",
  "../../app/api/delegates/unlink/routeFactory.js",
  "../../app/api/divisions/[divisionId]/workspace/routeFactory.js",
];

const [routeModules, factoryModules] = await Promise.all([
  Promise.all(routePaths.map((path) => import(path))),
  Promise.all(factoryPaths.map((path) => import(path))),
]);
const { createRouteHandler } = await import(
  "../../app/api/_lib/routeAdapter.js"
);

const authorization = "Bearer route-contract-token";

const assertBearer = async (request) => {
  assert.equal(request.headers.authorization, authorization);
  return {
    client: {},
    user: { id: "contract-user" },
  };
};

const createRequest = (pathname, method, body) =>
  new Request(`http://localhost${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: authorization,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    method,
  });

test("las ocho rutas App Router exponen metodos HTTP sin exports invalidos", () => {
  const allowedExports = new Set([
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
    "dynamic",
    "runtime",
  ]);

  for (const routeModule of routeModules) {
    assert.equal(routeModule.dynamic, "force-dynamic");
    assert.equal(routeModule.runtime, "nodejs");
    assert.deepEqual(
      Object.keys(routeModule).filter((key) => !allowedExports.has(key)),
      [],
    );
  }
});

test("las ocho rutas conservan el gate del metodo y su JSON 405", async () => {
  const wrongMethods = [
    "GET",
    "POST",
    "POST",
    "POST",
    "POST",
    "GET",
    "GET",
    "POST",
  ];

  for (const [index, factoryModule] of factoryModules.entries()) {
    const route = factoryModule.createRoute({});
    const request = createRequest("/api/contract", wrongMethods[index]);
    const context =
      index === 7
        ? { params: Promise.resolve({ divisionId: "3" }) }
        : undefined;
    const response = await route(request, context);

    assert.equal(response.status, 405);
    assert.match(
      response.headers.get("cache-control") || "",
      /private.*no-store/,
    );
    assert.deepEqual(await response.json(), { error: "Method not allowed" });
  }
});

test("las ocho rutas leen Bearer y preservan sus validaciones de entrada", async () => {
  const adminDependencies = {
    requireAdmin: assertBearer,
    supabaseAdmin: {},
  };
  const cases = [
    {
      body: {},
      dependencies: adminDependencies,
      error: "email, password, fullName y leagueName son obligatorios.",
      method: "POST",
      pathname: "/api/admin/managers/create",
    },
    {
      body: {},
      dependencies: adminDependencies,
      error: "email es obligatorio.",
      method: "DELETE",
      pathname: "/api/admin/managers/delete",
    },
    {
      body: { leagueId: 0 },
      dependencies: adminDependencies,
      error: "leagueId es obligatorio.",
      method: "PATCH",
      pathname: "/api/admin/managers/limits",
    },
    {
      body: {},
      dependencies: adminDependencies,
      error: "userId es obligatorio.",
      method: "PATCH",
      pathname: "/api/admin/managers/suspension",
    },
    {
      body: {},
      dependencies: adminDependencies,
      error: "userId es obligatorio.",
      method: "PATCH",
      pathname: "/api/admin/managers/update",
    },
    {
      body: { teamId: "invalido" },
      dependencies: {
        requireUser: assertBearer,
        supabaseAdmin: {},
      },
      error: "teamId es obligatorio.",
      method: "POST",
      pathname: "/api/delegates/account",
    },
    {
      body: { teamId: "invalido" },
      dependencies: {
        requireManager: assertBearer,
        requireUser: assertBearer,
        supabaseAdmin: {},
      },
      error: "teamId es obligatorio.",
      method: "POST",
      pathname: "/api/delegates/unlink",
    },
    {
      dependencies: {
        requireUser: assertBearer,
        supabaseAdmin: {},
      },
      error: "divisionId invalido.",
      method: "GET",
      params: { divisionId: "invalido" },
      pathname: "/api/divisions/invalido/workspace",
    },
  ];

  for (const [index, contractCase] of cases.entries()) {
    const route = factoryModules[index].createRoute(contractCase.dependencies);
    const request = createRequest(
      contractCase.pathname,
      contractCase.method,
      contractCase.body,
    );
    const context = contractCase.params
      ? { params: Promise.resolve(contractCase.params) }
      : undefined;
    const response = await route(request, context);

    assert.equal(response.status, 400);
    assert.match(
      response.headers.get("content-type") || "",
      /^application\/json/,
    );
    assert.deepEqual(await response.json(), { error: contractCase.error });
  }
});

test("mutaciones con cookie exigen Origin del mismo origen", async () => {
  let handlerCalls = 0;
  const route = createRouteHandler(
    () => async (request, response) => {
      handlerCalls += 1;
      return response.status(200).json({
        cookie: request.headers.cookie,
      });
    },
    {},
  );

  const rejectedResponse = await route(
    new Request("http://localhost/api/private", {
      headers: {
        Cookie: "sb-test-auth-token=fake",
        Origin: "https://attacker.example",
      },
      method: "POST",
    }),
  );

  assert.equal(rejectedResponse.status, 403);
  assert.equal(handlerCalls, 0);
  assert.deepEqual(await rejectedResponse.json(), { error: "Forbidden" });
  assert.match(
    rejectedResponse.headers.get("x-request-id") || "",
    /^[0-9a-f-]{36}$/i,
  );
  assert.match(
    rejectedResponse.headers.get("server-timing") || "",
    /^app;dur=\d+(?:\.\d)?$/,
  );

  const allowedResponse = await route(
    new Request("http://localhost/api/private", {
      headers: {
        Cookie: "sb-test-auth-token=fake",
        Origin: "http://localhost",
        "X-Request-ID": "contract-cookie-request",
      },
      method: "POST",
    }),
  );

  assert.equal(allowedResponse.status, 200);
  assert.equal(handlerCalls, 1);
  assert.deepEqual(await allowedResponse.json(), {
    cookie: "sb-test-auth-token=fake",
  });
  assert.equal(
    allowedResponse.headers.get("x-request-id"),
    "contract-cookie-request",
  );
  assert.match(
    allowedResponse.headers.get("cache-control") || "",
    /private.*no-store/,
  );
  assert.match(
    allowedResponse.headers.get("vary") || "",
    /Authorization.*Cookie.*Origin/,
  );
  assert.match(
    allowedResponse.headers.get("server-timing") || "",
    /^app;dur=\d+(?:\.\d)?$/,
  );
});

test("Bearer conserva compatibilidad y no depende de Origin", async () => {
  const route = createRouteHandler(
    () => async (_request, response) =>
      response.status(200).json({ success: true }),
    {},
  );

  const response = await route(
    new Request("http://localhost/api/private", {
      headers: {
        Authorization: "Bearer explicit-client-token",
        Origin: "https://external-client.example",
      },
      method: "PATCH",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
});

test("dos identidades nunca comparten una respuesta privada", async () => {
  const route = createRouteHandler(
    () => async (request, response) =>
      response.status(200).json({
        authorization: request.headers.authorization,
      }),
    {},
  );

  const [firstResponse, secondResponse] = await Promise.all([
    route(
      new Request("http://localhost/api/private", {
        headers: { Authorization: "Bearer user-one" },
      }),
    ),
    route(
      new Request("http://localhost/api/private", {
        headers: { Authorization: "Bearer user-two" },
      }),
    ),
  ]);

  assert.deepEqual(await firstResponse.json(), {
    authorization: "Bearer user-one",
  });
  assert.deepEqual(await secondResponse.json(), {
    authorization: "Bearer user-two",
  });

  for (const response of [firstResponse, secondResponse]) {
    assert.match(
      response.headers.get("cache-control") || "",
      /private.*no-store/,
    );
    assert.match(response.headers.get("vary") || "", /Authorization/);
  }
});
