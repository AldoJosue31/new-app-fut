import assert from "node:assert/strict";
import test from "node:test";
import { AuthRetryableFetchError } from "@supabase/supabase-js";

const {
  AuthAccessError,
  getServerAuthSnapshot,
  requireRole,
  requireUser,
} = await import("../../src/server/auth/serverAuth.js");

const createClient = ({ profile, profileError = null, user, userError = null }) => ({
  auth: {
    getUser: async () => ({
      data: { user },
      error: userError,
    }),
  },
  from: (table) => {
    assert.equal(table, "profiles");
    return {
      select() {
        return this;
      },
      eq(column, value) {
        assert.equal(column, "id");
        assert.equal(value, user.id);
        return this;
      },
      async single() {
        return { data: profile, error: profileError };
      },
    };
  },
});

test("un error temporal de Auth queda pendiente en lugar de invalidar la sesion", async () => {
  for (const error of [
    new AuthRetryableFetchError("Offline", 0),
    new AuthRetryableFetchError("Service unavailable", 503),
    { name: "AuthApiError", status: 429 },
  ]) {
    const client = createClient({ user: null, userError: error });
    const snapshot = await getServerAuthSnapshot({ client });
    assert.equal(snapshot.status, "auth-unavailable");
    assert.equal(snapshot.reason, "auth-query-failed");
    assert.equal(snapshot.user, null);
    assert.equal(snapshot.profile, null);
    await assert.rejects(() => requireUser({ client }),
      (error) => error instanceof AuthAccessError && error.statusCode === 503);
  }
});

test("un fetch abortado o rechazado tambien conserva el estado pendiente", async () => {
  const client = { auth: { getUser: async () => { throw new TypeError("Failed to fetch"); } } };
  assert.equal((await getServerAuthSnapshot({ client })).status, "auth-unavailable");
});

test("snapshot anonimo no confia en una sesion invalida", async () => {
  const snapshot = await getServerAuthSnapshot({
    client: createClient({
      profile: null,
      user: null,
      userError: new Error("invalid jwt"),
    }),
  });

  assert.equal(snapshot.status, "anonymous");
  assert.equal(snapshot.user, null);
  assert.equal(snapshot.profile, null);
});

test("snapshot autentica manager y delegado activos", async () => {
  for (const role of ["manager", "delegate"]) {
    const user = { id: `${role}-1` };
    const profile = { id: user.id, is_suspended: false, role };
    const snapshot = await getServerAuthSnapshot({
      client: createClient({ profile, user }),
    });

    assert.equal(snapshot.status, "authenticated");
    assert.deepEqual(snapshot.user, user);
    assert.deepEqual(snapshot.profile, profile);
  }
});

test("suspension expulsa manager/delegate pero no cambia la regla admin", async () => {
  const suspendedManager = await getServerAuthSnapshot({
    client: createClient({
      profile: {
        id: "manager-1",
        is_suspended: true,
        role: "manager",
      },
      user: { id: "manager-1" },
    }),
  });
  const admin = await getServerAuthSnapshot({
    client: createClient({
      profile: {
        id: "admin-1",
        is_suspended: true,
        role: "admin",
      },
      user: { id: "admin-1" },
    }),
  });

  assert.equal(suspendedManager.status, "blocked");
  assert.equal(suspendedManager.reason, "account-suspended");
  assert.equal(admin.status, "authenticated");
});

test("un fallo transitorio de perfiles queda pendiente y no muestra privado", async () => {
  const snapshot = await getServerAuthSnapshot({
    client: createClient({
      profile: null,
      profileError: { code: "NETWORK", message: "offline" },
      user: { id: "manager-1" },
    }),
  });

  assert.equal(snapshot.status, "profile-unavailable");
  assert.equal(snapshot.user.id, "manager-1");
  assert.equal(snapshot.profile, null);
});

test("requireRole diferencia 401, 403 y acceso valido", async () => {
  const managerClient = createClient({
    profile: {
      id: "manager-1",
      is_suspended: false,
      role: "manager",
    },
    user: { id: "manager-1" },
  });

  await assert.rejects(
    () => requireRole(["admin"], { client: managerClient }),
    (error) =>
      error instanceof AuthAccessError &&
      error.statusCode === 403,
  );

  const auth = await requireRole(["manager"], {
    client: managerClient,
  });
  assert.equal(auth.profile.role, "manager");

  await assert.rejects(
    () =>
      requireRole(["manager"], {
        client: createClient({
          profile: null,
          user: null,
          userError: new Error("invalid jwt"),
        }),
      }),
    (error) =>
      error instanceof AuthAccessError &&
      error.statusCode === 401,
  );
});
