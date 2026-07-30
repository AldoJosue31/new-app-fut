import assert from "node:assert/strict";
import test from "node:test";

import {
  getLegacySessionStorageKey,
  migrateLegacySession,
  parseLegacySession,
} from "../src/lib/supabase/legacySession.js";

test("deriva la clave legacy desde el project ref", () => {
  assert.equal(
    getLegacySessionStorageKey("https://project-ref.supabase.co"),
    "sb-project-ref-auth-token",
  );
});

test("extrae solo tokens validos de los formatos legacy conocidos", () => {
  const expected = {
    access_token: "access",
    refresh_token: "refresh",
  };

  assert.deepEqual(
    parseLegacySession(JSON.stringify(expected)),
    expected,
  );
  assert.deepEqual(
    parseLegacySession(
      JSON.stringify({ currentSession: expected }),
    ),
    expected,
  );
  assert.deepEqual(
    parseLegacySession(JSON.stringify({ session: expected })),
    expected,
  );
});

test("rechaza storage corrupto o incompleto", () => {
  assert.equal(parseLegacySession("not-json"), null);
  assert.equal(
    parseLegacySession(JSON.stringify({ access_token: "access" })),
    null,
  );
  assert.equal(parseLegacySession(null), null);
});

test("migra una sesion local a cookies una sola vez", async () => {
  const removed = [];
  const setSessions = [];
  const storageKey = "sb-project-ref-auth-token";
  const storage = {
    getItem: (key) =>
      key === storageKey
        ? JSON.stringify({
            access_token: "access",
            refresh_token: "refresh",
          })
        : null,
    removeItem: (key) => removed.push(key),
  };

  const migrated = await migrateLegacySession({
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      setSession: async (tokens) => {
        setSessions.push(tokens);
        return {
          data: { session: { user: { id: "user-1" } } },
          error: null,
        };
      },
    },
    storage,
    supabaseUrl: "https://project-ref.supabase.co",
  });

  assert.equal(migrated, true);
  assert.deepEqual(setSessions, [
    {
      access_token: "access",
      refresh_token: "refresh",
    },
  ]);
  assert.deepEqual(removed, [storageKey]);
});

test("no toca localStorage cuando ya existe cookie SSR", async () => {
  let storageReads = 0;
  const migrated = await migrateLegacySession({
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      }),
    },
    storage: {
      getItem: () => {
        storageReads += 1;
        return null;
      },
    },
    supabaseUrl: "https://project-ref.supabase.co",
  });

  assert.equal(migrated, false);
  assert.equal(storageReads, 0);
});
