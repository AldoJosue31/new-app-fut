import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const [
  { createHandler: createManagerHandler },
  { createHandler: deleteManagerHandler },
  { createHandler: updateManagerLimitsHandler },
  { createHandler: updateManagerSuspensionHandler },
  { createHandler: updateManagerHandler },
  { createHandler: unlinkDelegateHandler },
  { createHandler: divisionWorkspaceHandler },
] = await Promise.all([
  import("../src/server/api/handlers/admin/managers/create.js"),
  import("../src/server/api/handlers/admin/managers/delete.js"),
  import("../src/server/api/handlers/admin/managers/limits.js"),
  import("../src/server/api/handlers/admin/managers/suspension.js"),
  import("../src/server/api/handlers/admin/managers/update.js"),
  import("../src/server/api/handlers/delegates/unlink.js"),
  import("../src/server/api/handlers/divisions/workspace.js"),
]);

const createResponse = () => ({
  body: null,
  statusCode: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const expectResponse = (res, statusCode, body) => {
  assert.equal(res.statusCode, statusCode);
  assert.deepEqual(res.body, body);
};

test("cada endpoint conserva su metodo HTTP publico", async () => {
  const cases = [
    [createManagerHandler(), "GET"],
    [deleteManagerHandler(), "POST"],
    [updateManagerLimitsHandler(), "POST"],
    [updateManagerSuspensionHandler(), "POST"],
    [updateManagerHandler(), "POST"],
    [unlinkDelegateHandler(), "GET"],
    [divisionWorkspaceHandler(), "POST"],
  ];

  for (const [handler, method] of cases) {
    const res = createResponse();
    await handler({ method, headers: {}, query: {} }, res);
    expectResponse(res, 405, { error: "Method not allowed" });
  }
});

test("los endpoints admin propagan 401 antes de leer el payload", async () => {
  const unauthorized = new Error("Unauthorized");
  unauthorized.statusCode = 401;
  let bodyRead = false;
  const handler = createManagerHandler({
    readJsonBody: async () => {
      bodyRead = true;
      return {};
    },
    requireAdmin: async () => {
      throw unauthorized;
    },
  });
  const res = createResponse();

  await handler({ method: "POST", headers: {} }, res);

  expectResponse(res, 401, { error: "Unauthorized" });
  assert.equal(bodyRead, false);
});

test("los siete endpoints validan sus identificadores y campos obligatorios", async () => {
  const allowAdmin = async () => ({ user: { id: "admin-1" } });
  const allowUser = async () => ({
    client: {},
    user: { id: "user-1" },
  });
  const cases = [
    [
      createManagerHandler({
        readJsonBody: async () => ({}),
        requireAdmin: allowAdmin,
      }),
      { method: "POST", headers: {} },
      400,
      "email, password, fullName y leagueName son obligatorios.",
    ],
    [
      deleteManagerHandler({
        readJsonBody: async () => ({}),
        requireAdmin: allowAdmin,
      }),
      { method: "DELETE", headers: {} },
      400,
      "email es obligatorio.",
    ],
    [
      updateManagerLimitsHandler({
        readJsonBody: async () => ({ leagueId: 0 }),
        requireAdmin: allowAdmin,
      }),
      { method: "PATCH", headers: {} },
      400,
      "leagueId es obligatorio.",
    ],
    [
      updateManagerSuspensionHandler({
        readJsonBody: async () => ({}),
        requireAdmin: allowAdmin,
      }),
      { method: "PATCH", headers: {} },
      400,
      "userId es obligatorio.",
    ],
    [
      updateManagerHandler({
        readJsonBody: async () => ({}),
        requireAdmin: allowAdmin,
      }),
      { method: "PATCH", headers: {} },
      400,
      "userId es obligatorio.",
    ],
    [
      unlinkDelegateHandler({
        readJsonBody: async () => ({ teamId: "invalido" }),
        requireManager: allowAdmin,
        requireUser: allowUser,
      }),
      { method: "POST", headers: {} },
      400,
      "teamId es obligatorio.",
    ],
    [
      divisionWorkspaceHandler({
        requireUser: allowUser,
      }),
      {
        method: "GET",
        headers: {},
        query: { divisionId: "invalido" },
      },
      400,
      "divisionId invalido.",
    ],
  ];

  for (const [handler, req, statusCode, error] of cases) {
    const res = createResponse();
    await handler(req, res);
    expectResponse(res, statusCode, { error });
  }
});

test("crear manager normaliza datos y conserva el RPC de activacion", async () => {
  const calls = [];
  const adminClient = {
    auth: {
      admin: {
        createUser: async (payload) => {
          calls.push(["createUser", payload]);
          return { data: { user: { id: "manager-1" } }, error: null };
        },
        deleteUser: async (userId) => {
          calls.push(["deleteUser", userId]);
          return { error: null };
        },
      },
    },
    rpc: async (name, payload) => {
      calls.push(["rpc", name, payload]);
      return { error: null };
    },
  };
  const handler = createManagerHandler({
    readJsonBody: async () => ({
      email: "  MANAGER@Example.COM ",
      password: "secret",
      fullName: "  Manager Uno ",
      leagueName: "  Liga Centro ",
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: adminClient,
  });
  const res = createResponse();

  await handler({ method: "POST", headers: {} }, res);

  expectResponse(res, 200, { success: true, userId: "manager-1" });
  assert.deepEqual(calls, [
    [
      "createUser",
      {
        email: "manager@example.com",
        password: "secret",
        email_confirm: true,
        user_metadata: { full_name: "Manager Uno" },
      },
    ],
    [
      "rpc",
      "activar_nuevo_manager",
      {
        p_email: "manager@example.com",
        p_nombre: "Manager Uno",
        p_nombre_liga: "Liga Centro",
      },
    ],
  ]);
});

test("crear manager revierte Auth si falla la activacion", async () => {
  const deletedUsers = [];
  const activationError = new Error("Activation failed");
  const handler = createManagerHandler({
    readJsonBody: async () => ({
      email: "manager@example.com",
      password: "secret",
      fullName: "Manager Uno",
      leagueName: "Liga Centro",
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: {
      auth: {
        admin: {
          createUser: async () => ({
            data: { user: { id: "manager-1" } },
            error: null,
          }),
          deleteUser: async (userId) => {
            deletedUsers.push(userId);
            return { error: null };
          },
        },
      },
      rpc: async () => ({ error: activationError }),
    },
  });
  const res = createResponse();

  await handler({ method: "POST", headers: {} }, res);

  expectResponse(res, 500, { error: "Error interno del servidor." });
  assert.deepEqual(deletedUsers, ["manager-1"]);
});

test("eliminar manager conserva email normalizado y RPC actual", async () => {
  const calls = [];
  const handler = deleteManagerHandler({
    readJsonBody: async () => ({ email: " MANAGER@Example.COM " }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: {
      from: (table) => {
        assert.equal(table, "profiles");
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: { id: "manager-1", role: "manager" },
              error: null,
            };
          },
        };
      },
      rpc: async (name, payload) => {
        calls.push([name, payload]);
        return { error: null };
      },
    },
  });
  const res = createResponse();

  await handler({ method: "DELETE", headers: {} }, res);

  expectResponse(res, 200, { success: true });
  assert.deepEqual(calls, [
    [
      "borrar_usuario_por_email",
      { p_email: "manager@example.com" },
    ],
  ]);
});

test("actualizar manager solo envia los campos recibidos a Auth", async () => {
  const calls = [];
  const handler = updateManagerHandler({
    readJsonBody: async () => ({
      userId: " manager-1 ",
      email: " NEW@Example.COM ",
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: {
      auth: {
        admin: {
          updateUserById: async (userId, updates) => {
            calls.push([userId, updates]);
            return { error: null };
          },
        },
      },
      from: (table) => {
        assert.equal(table, "profiles");
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: { id: "manager-1", role: "manager" },
              error: null,
            };
          },
        };
      },
    },
  });
  const res = createResponse();

  await handler({ method: "PATCH", headers: {} }, res);

  expectResponse(res, 200, { success: true });
  assert.deepEqual(calls, [
    ["manager-1", { email: "new@example.com" }],
  ]);
});

test("delete y update nunca apuntan a roles distintos de manager", async () => {
  let destructiveCalls = 0;
  const nonManagerClient = {
    auth: {
      admin: {
        updateUserById: async () => {
          destructiveCalls += 1;
          return { error: null };
        },
      },
    },
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      async maybeSingle() {
        return {
          data: { id: "admin-2", role: "admin" },
          error: null,
        };
      },
    }),
    rpc: async () => {
      destructiveCalls += 1;
      return { error: null };
    },
  };
  const deleteHandler = deleteManagerHandler({
    readJsonBody: async () => ({ email: "admin@example.com" }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: nonManagerClient,
  });
  const updateHandler = updateManagerHandler({
    readJsonBody: async () => ({
      userId: "admin-2",
      email: "new-admin@example.com",
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: nonManagerClient,
  });
  const deleteResponse = createResponse();
  const updateResponse = createResponse();

  await deleteHandler({ method: "DELETE", headers: {} }, deleteResponse);
  await updateHandler({ method: "PATCH", headers: {} }, updateResponse);

  expectResponse(deleteResponse, 400, {
    error: "Solo se pueden eliminar cuentas manager.",
  });
  expectResponse(updateResponse, 400, {
    error: "Solo se pueden actualizar cuentas manager.",
  });
  assert.equal(destructiveCalls, 0);
});

test("actualizar limites conserva nulos y enteros en la tabla leagues", async () => {
  const calls = [];
  const league = {
    id: 9,
    max_divisions_total: 4,
    max_teams_total: null,
    max_players_total: 180,
  };
  const query = {
    update(updates) {
      calls.push(["update", updates]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    select(columns) {
      calls.push(["select", columns]);
      return this;
    },
    async single() {
      return { data: league, error: null };
    },
  };
  const handler = updateManagerLimitsHandler({
    readJsonBody: async () => ({
      leagueId: 9,
      max_divisions_total: 4,
      max_teams_total: "",
      max_players_total: 180,
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: {
      from: (table) => {
        calls.push(["from", table]);
        return query;
      },
    },
  });
  const res = createResponse();

  await handler({ method: "PATCH", headers: {} }, res);

  expectResponse(res, 200, { success: true, league });
  assert.deepEqual(calls[0], ["from", "leagues"]);
  assert.deepEqual(calls[1], [
    "update",
    {
      max_divisions_total: 4,
      max_teams_total: null,
      max_players_total: 180,
    },
  ]);
  assert.deepEqual(calls[2], ["eq", "id", 9]);
});

test("suspender manager actualiza profile y bloqueo de Auth", async () => {
  const calls = [];
  let profileQueryIndex = 0;
  const profile = {
    id: "manager-1",
    is_suspended: true,
    suspended_by: "admin-1",
    suspension_reason: "Revision",
  };
  const adminClient = {
    auth: {
      admin: {
        updateUserById: async (userId, updates) => {
          calls.push(["auth.updateUserById", userId, updates]);
          return { error: null };
        },
      },
    },
    from: (table) => {
      assert.equal(table, "profiles");
      const currentIndex = profileQueryIndex;
      profileQueryIndex += 1;
      return {
        select(columns) {
          calls.push(["select", currentIndex, columns]);
          return this;
        },
        update(updates) {
          calls.push(["update", updates]);
          assert.equal(updates.is_suspended, true);
          assert.equal(updates.suspended_by, "admin-1");
          assert.equal(updates.suspension_reason, "Revision");
          assert.match(updates.suspended_at, /^\d{4}-\d{2}-\d{2}T/);
          return this;
        },
        eq(column, value) {
          calls.push(["eq", currentIndex, column, value]);
          return this;
        },
        async single() {
          return currentIndex === 0
            ? {
                data: { id: "manager-1", role: "manager" },
                error: null,
              }
            : { data: profile, error: null };
        },
      };
    },
  };
  const handler = updateManagerSuspensionHandler({
    readJsonBody: async () => ({
      userId: "manager-1",
      suspended: true,
      reason: " Revision ",
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: adminClient,
  });
  const res = createResponse();

  await handler({ method: "PATCH", headers: {} }, res);

  expectResponse(res, 200, { success: true, profile });
  assert.deepEqual(calls.at(-1), [
    "auth.updateUserById",
    "manager-1",
    { ban_duration: "876000h" },
  ]);
});

test("suspension actualiza el profile con el cliente autenticado del admin", async () => {
  const profileUpdates = [];
  const profile = {
    id: "manager-1",
    is_suspended: true,
    suspended_at: "2026-08-18T00:00:00.000Z",
    suspended_by: "admin-1",
    suspension_reason: null,
  };
  const authenticatedAdminClient = {
    from: (table) => {
      assert.equal(table, "profiles");
      return {
        update(updates) {
          profileUpdates.push(updates);
          return this;
        },
        eq() {
          return this;
        },
        select() {
          return this;
        },
        async single() {
          return { data: profile, error: null };
        },
      };
    },
  };
  const serviceClient = {
    auth: {
      admin: {
        updateUserById: async () => ({ error: null }),
      },
    },
    from: (table) => {
      assert.equal(table, "profiles");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          return {
            data: {
              id: "manager-1",
              role: "manager",
              is_suspended: false,
              suspended_at: null,
              suspended_by: null,
              suspension_reason: null,
            },
            error: null,
          };
        },
      };
    },
  };
  const handler = updateManagerSuspensionHandler({
    readJsonBody: async () => ({ userId: "manager-1", suspended: true }),
    requireAdmin: async () => ({
      client: authenticatedAdminClient,
      user: { id: "admin-1" },
    }),
    supabaseAdmin: serviceClient,
  });
  const res = createResponse();

  await handler({ method: "PATCH", headers: {} }, res);

  expectResponse(res, 200, { success: true, profile });
  assert.equal(profileUpdates.length, 1);
  assert.equal(profileUpdates[0].is_suspended, true);
  assert.equal(profileUpdates[0].suspended_by, "admin-1");
});

test("reactivar manager omite el desbloqueo de Auth si ya no tiene veto activo", async () => {
  const calls = [];
  let profileQueryIndex = 0;
  const profile = {
    id: "manager-1",
    is_suspended: false,
    suspended_at: null,
    suspended_by: null,
    suspension_reason: null,
  };
  const handler = updateManagerSuspensionHandler({
    readJsonBody: async () => ({
      userId: "manager-1",
      suspended: false,
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: {
      auth: {
        admin: {
          getUserById: async (userId) => {
            calls.push(["auth.getUserById", userId]);
            return { data: { user: { banned_until: null } }, error: null };
          },
          updateUserById: async () => {
            assert.fail("No debe intentar desbloquear un usuario ya activo en Auth.");
          },
        },
      },
      from: (table) => {
        assert.equal(table, "profiles");
        const currentIndex = profileQueryIndex;
        profileQueryIndex += 1;

        return {
          select() {
            return this;
          },
          update(updates) {
            calls.push(["profile.update", updates]);
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            return currentIndex === 0
              ? {
                  data: {
                    id: "manager-1",
                    role: "manager",
                    is_suspended: true,
                    suspended_at: "2026-08-18T00:00:00.000Z",
                    suspended_by: "admin-1",
                    suspension_reason: null,
                  },
                  error: null,
                }
              : { data: profile, error: null };
          },
        };
      },
    },
  });
  const res = createResponse();

  await handler({ method: "PATCH", headers: {} }, res);

  expectResponse(res, 200, { success: true, profile });
  assert.deepEqual(calls, [
    ["auth.getUserById", "manager-1"],
    [
      "profile.update",
      {
        is_suspended: false,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      },
    ],
  ]);
});

test("suspension restaura el profile si falla el bloqueo de Auth", async () => {
  const updates = [];
  const originalProfile = {
    id: "manager-1",
    role: "manager",
    is_suspended: false,
    suspended_at: null,
    suspended_by: null,
    suspension_reason: null,
  };
  const adminClient = {
    auth: {
      admin: {
        updateUserById: async () => ({
          error: new Error("Auth ban failed"),
        }),
      },
    },
    from: () => {
      const query = {
        select() {
          return this;
        },
        update(values) {
          updates.push(values);
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          if (!updates.length) {
            return { data: originalProfile, error: null };
          }

          return {
            data: { ...originalProfile, ...updates[0] },
            error: null,
          };
        },
        then(resolve, reject) {
          return Promise.resolve({ error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const handler = updateManagerSuspensionHandler({
    readJsonBody: async () => ({
      userId: "manager-1",
      suspended: true,
      reason: "Revision manual",
    }),
    requireAdmin: async () => ({ user: { id: "admin-1" } }),
    supabaseAdmin: adminClient,
  });
  const res = createResponse();

  await handler({ method: "PATCH", headers: {} }, res);

  expectResponse(res, 500, { error: "Error interno del servidor." });
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[1], {
    is_suspended: false,
    suspended_at: null,
    suspended_by: null,
    suspension_reason: null,
  });
});

test("desvincular delegado evita borrar una cuenta con otras asignaciones", async () => {
  let deleteCalls = 0;
  const handler = unlinkDelegateHandler({
    readJsonBody: async () => ({ teamId: 17, deleteAccount: true }),
    requireManager: async () => ({ user: { id: "manager-1" } }),
    requireUser: async () => ({
      user: { id: "manager-1" },
      client: {
        rpc: async () => ({
          data: {
            success: true,
            delegate_profile_id: "delegate-1",
            remaining_assignments: 2,
          },
          error: null,
        }),
      },
    }),
    supabaseAdmin: {
      auth: {
        admin: {
          deleteUser: async () => {
            deleteCalls += 1;
            return { error: null };
          },
        },
      },
    },
  });
  const res = createResponse();

  await handler({ method: "POST", headers: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.remainingAssignments, 2);
  assert.equal(res.body.accountDeleted, false);
  assert.equal(deleteCalls, 0);
});

test("desvincular delegado no expone el error interno de Auth", async () => {
  const handler = unlinkDelegateHandler({
    readJsonBody: async () => ({ teamId: 17, deleteAccount: true }),
    requireManager: async () => ({ user: { id: "manager-1" } }),
    requireUser: async () => ({
      user: { id: "manager-1" },
      client: {
        rpc: async () => ({
          data: {
            success: true,
            delegate_profile_id: "delegate-1",
            remaining_assignments: 0,
          },
          error: null,
        }),
      },
    }),
    supabaseAdmin: {
      auth: {
        admin: {
          deleteUser: async () => ({
            error: new Error("sensitive-provider-detail"),
          }),
        },
      },
      from: () => ({
        update() {
          return this;
        },
        eq() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve({ error: null }).then(resolve, reject);
        },
      }),
    },
  });
  const res = createResponse();

  await handler({ method: "POST", headers: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.accountSuspended, true);
  assert.doesNotMatch(JSON.stringify(res.body), /sensitive-provider-detail/);
  assert.equal(
    res.body.warning,
    "La eliminacion automatica fallo y requiere revision administrativa.",
  );
});

test("workspace devuelve el contrato agregado con aliases estables", async () => {
  const divisionData = {
    id: 3,
    name: "Primera",
    leagues: { id: 1, name: "Liga Centro" },
    categories: { id: 2, name: "Libre" },
  };
  const tournamentData = {
    id: 7,
    name: "Apertura",
    divisions: { id: 3, name: "Primera", league_id: 1 },
  };
  const teams = [{ id: 10, name: "Azules", players: [{ id: 20 }] }];
  const standings = [{ team_id: 10, pts: 3 }];
  const matches = [{ id: 30 }];
  const resolvedQuery = (result) => {
    const query = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      in() {
        return this;
      },
      limit() {
        return this;
      },
      order() {
        return this;
      },
      async maybeSingle() {
        return result;
      },
      then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  };
  const tableResults = {
    divisions: { data: divisionData, error: null },
    tournaments: { data: tournamentData, error: null },
    teams: { data: teams, error: null },
    view_clasificacion: { data: standings, error: null },
    matches: { data: matches, error: null },
  };
  const handler = divisionWorkspaceHandler({
    requireUser: async () => ({ user: { id: "manager-1" } }),
    supabaseAdmin: {
      from: (table) => resolvedQuery(tableResults[table]),
    },
  });
  const res = createResponse();

  await handler(
    {
      method: "GET",
      headers: {},
      query: { divisionId: ["3"] },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.division, {
    id: 3,
    name: "Primera",
    league: { id: 1, name: "Liga Centro" },
    category: { id: 2, name: "Libre" },
  });
  assert.deepEqual(res.body.league, { id: 1, name: "Liga Centro" });
  assert.deepEqual(res.body.activeTournament, {
    id: 7,
    name: "Apertura",
    division: { id: 3, name: "Primera", league_id: 1 },
  });
  assert.deepEqual(res.body.teams, teams);
  assert.deepEqual(res.body.standings, standings);
  assert.deepEqual(res.body.matches, matches);
});

test("workspace conserva la politica de propietario y oculta otras ligas", async () => {
  const filters = [];
  const handler = divisionWorkspaceHandler({
    requireUser: async () => ({ user: { id: "manager-owner" } }),
    supabaseAdmin: {
      from: () => ({
        select() {
          return this;
        },
        eq(column, value) {
          filters.push([column, value]);
          return this;
        },
        async maybeSingle() {
          return { data: null, error: null };
        },
      }),
    },
  });
  const res = createResponse();

  await handler(
    {
      method: "GET",
      headers: {},
      query: { divisionId: "3" },
    },
    res,
  );

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "Division no encontrada." });
  assert.deepEqual(filters, [
    ["id", 3],
    ["leagues.owner_id", "manager-owner"],
  ]);
});
