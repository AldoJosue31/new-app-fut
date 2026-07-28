import assert from "node:assert/strict";
import test from "node:test";

const {
  authorizeTeamManager,
  createHandler,
} = await import(
  "../src/server/api/handlers/delegates/account.js"
);

const createResponse = () => ({
  body: null,
  statusCode: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const createAuthorizationClient = ({
  actorRole = "manager",
  actorSuspended = false,
  actorDeleted = false,
  actorUserId = "actor-1",
  leagueAdmin = false,
  ownerId = "owner-1",
} = {}) => {
  let actorProfileRead = false;
  const rows = {
    teams: {
      id: 17,
      name: "Azules",
      division_id: 3,
      delegate_name: "Delegado Uno",
      contact_phone: null,
    },
    divisions: { league_id: 9 },
    leagues: { owner_id: ownerId },
    league_admins: leagueAdmin ? { user_id: actorUserId } : null,
    team_delegates: { delegate_profile_id: "delegate-1" },
  };

  return {
    from(table) {
      let selectedColumns = "";
      return {
        select(columns) {
          selectedColumns = columns;
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          if (table === "profiles") {
            if (!actorProfileRead && selectedColumns.includes("is_suspended")) {
              actorProfileRead = true;
              return {
                data: {
                  id: actorUserId,
                  role: actorRole,
                  is_suspended: actorSuspended,
                  is_deleted: actorDeleted,
                },
                error: null,
              };
            }

            return {
              data: { id: "delegate-1", role: "delegate" },
              error: null,
            };
          }

          return { data: rows[table] ?? null, error: null };
        },
      };
    },
  };
};

test("autoriza admin, propietario y league_admin; rechaza otra liga", async () => {
  const allowedCases = [
    {
      actorRole: "admin",
      actorUserId: "admin-1",
      ownerId: "other-owner",
    },
    {
      actorRole: "manager",
      actorUserId: "owner-1",
      ownerId: "owner-1",
    },
    {
      actorRole: "manager",
      actorUserId: "league-admin-1",
      leagueAdmin: true,
      ownerId: "other-owner",
    },
  ];

  for (const authorizationCase of allowedCases) {
    const result = await authorizeTeamManager({}, 17, {
      requireUser: async () => ({
        user: { id: authorizationCase.actorUserId },
      }),
      supabaseAdmin: createAuthorizationClient(authorizationCase),
    });

    assert.equal(result.actorProfileId, authorizationCase.actorUserId);
    assert.equal(result.delegateProfileId, "delegate-1");
    assert.equal(result.team.id, 17);
  }

  await assert.rejects(
    () =>
      authorizeTeamManager({}, 17, {
        requireUser: async () => ({ user: { id: "outsider-1" } }),
        supabaseAdmin: createAuthorizationClient({
          actorUserId: "outsider-1",
          ownerId: "owner-1",
        }),
      }),
    (error) =>
      error.statusCode === 403 &&
      error.message === "No tienes permisos para administrar este equipo.",
  );
});

test("rechaza actores suspendidos, eliminados y roles sin privilegios", async () => {
  for (const authorizationCase of [
    {
      actorRole: "manager",
      actorSuspended: true,
      actorUserId: "manager-1",
    },
    {
      actorDeleted: true,
      actorRole: "manager",
      actorUserId: "deleted-manager-1",
    },
    {
      actorRole: "delegate",
      actorUserId: "delegate-actor",
    },
  ]) {
    await assert.rejects(
      () =>
        authorizeTeamManager({}, 17, {
          requireUser: async () => ({
            user: { id: authorizationCase.actorUserId },
          }),
          supabaseAdmin: createAuthorizationClient(authorizationCase),
        }),
      (error) =>
        error.statusCode === 403 &&
        error.message ===
          "No tienes permisos para administrar este delegado.",
    );
  }
});

const createAuthorizedDependencies = (
  body,
  delegateEmail = "delegate@example.com",
) => ({
  readJsonBody: async () => body,
  authorizeTeamManager: async () => ({
    actorProfileId: "manager-1",
    delegateProfileId: "delegate-1",
    team: {
      id: 17,
      name: "Azules",
      division_id: 3,
      delegate_name: "Delegado Uno",
      contact_phone: null,
    },
  }),
  supabaseAdmin: {
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
});

test("action get conserva el contrato de la Edge Function", async () => {
  const handler = createHandler(
    createAuthorizedDependencies({ action: "get", teamId: 17 }),
  );
  const response = createResponse();

  await handler({ method: "POST" }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    success: true,
    email: "delegate@example.com",
  });
});

test("action update conserva las validaciones congeladas", async () => {
  const cases = [
    [{ action: "otra", teamId: 17 }, "Accion no valida."],
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
    const handler = createHandler(createAuthorizedDependencies(body));
    const response = createResponse();

    await handler({ method: "POST" }, response);

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { error: expectedError });
  }
});
