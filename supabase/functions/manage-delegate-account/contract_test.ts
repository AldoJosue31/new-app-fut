import { createHandler } from "./index.ts";

const assertEquals = (
  actual: unknown,
  expected: unknown,
  message: string,
) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: esperado ${JSON.stringify(expected)}, recibido ${
        JSON.stringify(actual)
      }`,
    );
  }
};

const configuredEnv = () => "test-value";

type HandlerOptions = NonNullable<Parameters<typeof createHandler>[0]>;
type Authorizer = NonNullable<HandlerOptions["authorizeTeamManager"]>;

const createAuthorizer = (delegateEmail = "delegate@example.com") =>
  (async () => ({
    actorProfileId: "manager-1",
    delegateProfileId: "delegate-1",
    team: {
      id: 17,
      name: "Azules",
      division_id: 3,
      delegate_name: "Delegado Uno",
      contact_phone: null,
    },
    adminClient: {
      auth: {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                id: "delegate-1",
                email: delegateEmail,
              },
            },
            error: null,
          }),
        },
      },
    },
  })) as unknown as Authorizer;

const jsonRequest = (body: unknown, method = "POST") =>
  new Request("http://localhost/functions/v1/manage-delegate-account", {
    method,
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });

Deno.test("manage-delegate-account conserva preflight CORS y metodo POST", async () => {
  const handler = createHandler({ getEnv: configuredEnv });
  const optionsResponse = await handler(jsonRequest({}, "OPTIONS"));
  const getResponse = await handler(jsonRequest({}, "GET"));

  assertEquals(optionsResponse.status, 200, "OPTIONS debe responder 200");
  assertEquals(
    optionsResponse.headers.get("Access-Control-Allow-Methods"),
    "POST, OPTIONS",
    "CORS debe anunciar POST y OPTIONS",
  );
  assertEquals(getResponse.status, 405, "GET debe responder 405");
  assertEquals(
    await getResponse.json(),
    { error: "Metodo no permitido." },
    "GET debe conservar su error JSON",
  );
});

Deno.test("manage-delegate-account falla cerrado si faltan secretos", async () => {
  const handler = createHandler({ getEnv: () => undefined });
  const response = await handler(jsonRequest({ teamId: 17 }));

  assertEquals(response.status, 500, "la configuracion incompleta debe fallar");
  assertEquals(
    await response.json(),
    { error: "La funcion no esta configurada correctamente." },
    "el error de configuracion debe conservarse",
  );
});

Deno.test("manage-delegate-account valida teamId antes de autorizar", async () => {
  let authorizationCalls = 0;
  const handler = createHandler({
    getEnv: configuredEnv,
    authorizeTeamManager: (async (...args: unknown[]) => {
      authorizationCalls += 1;
      return await createAuthorizer()(...args as Parameters<Authorizer>);
    }) as Authorizer,
  });
  const response = await handler(jsonRequest({ teamId: "invalido" }));

  assertEquals(response.status, 400, "teamId invalido debe responder 400");
  assertEquals(
    await response.json(),
    { error: "teamId es obligatorio." },
    "teamId debe conservar su error JSON",
  );
  assertEquals(
    authorizationCalls,
    0,
    "no debe consultar Auth ni tablas con teamId invalido",
  );
});

Deno.test("manage-delegate-account get conserva email y respuesta publica", async () => {
  const handler = createHandler({
    getEnv: configuredEnv,
    authorizeTeamManager: createAuthorizer("delegate@example.com"),
  });
  const response = await handler(jsonRequest({ action: "get", teamId: 17 }));

  assertEquals(response.status, 200, "get debe responder 200");
  assertEquals(
    await response.json(),
    {
      success: true,
      email: "delegate@example.com",
    },
    "get debe conservar el contrato de cuenta",
  );
});

Deno.test("manage-delegate-account congela validaciones de update", async () => {
  const handler = createHandler({
    getEnv: configuredEnv,
    authorizeTeamManager: createAuthorizer(),
  });
  const cases = [
    [
      { action: "otra", teamId: 17 },
      "Accion no valida.",
    ],
    [
      { action: "update", teamId: 17 },
      "El nombre es obligatorio.",
    ],
    [
      {
        action: "update",
        teamId: 17,
        fullName: "Delegado Uno",
      },
      "No hay cambios para aplicar.",
    ],
    [
      {
        action: "update",
        teamId: 17,
        fullName: "Delegado Uno",
        email: "correo-invalido",
      },
      "Escribe un correo valido.",
    ],
    [
      {
        action: "update",
        teamId: 17,
        fullName: "Delegado Uno",
        password: "12345",
      },
      "La nueva contrasena debe tener al menos 6 caracteres.",
    ],
    [
      {
        action: "update",
        teamId: 17,
        fullName: "Delegado Uno",
        email: "nuevo@example.com",
      },
      "Escribe un motivo de entre 5 y 240 caracteres para cambiar los datos de acceso.",
    ],
    [
      {
        action: "update",
        teamId: 17,
        fullName: "Delegado Uno",
        email: "nuevo@example.com",
        reason: "Cambio solicitado",
      },
      "Debes confirmar expresamente el cambio de la cuenta.",
    ],
  ];

  for (const [body, expectedError] of cases) {
    const response = await handler(jsonRequest(body));
    assertEquals(response.status, 400, "la validacion debe responder 400");
    assertEquals(
      await response.json(),
      { error: expectedError },
      "el mensaje de validacion debe conservarse",
    );
  }
});
