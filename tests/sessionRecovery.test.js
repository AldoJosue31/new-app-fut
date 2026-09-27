import assert from "node:assert/strict";
import test from "node:test";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";

import { createSessionRecovery } from "../src/lib/auth/sessionRecovery.js";
import { isInvalidSessionError, isTransientAuthError } from "../src/lib/auth/sessionErrors.js";

const session = { user: { id: "manager-1" } };
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const setup = (overrides = {}) => {
  const events = [];
  const timers = new Map();
  let timerId = 0;
  const recovery = createSessionRecovery({
    auth: { getSession: async () => ({ data: { session }, error: null }) },
    migrateSession: async () => false,
    onSession: async (value) => { events.push(["session", value]); return true; },
    onSignedOut: () => events.push(["signed-out"]),
    onInvalidSession: async () => events.push(["invalid-session"]),
    onError: (error) => events.push(["retry", error]),
    schedule: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    cancel: (id) => timers.delete(id),
    ...overrides,
  });
  return { events, recovery, timers };
};

test("una renovacion temporalmente fallida conserva la sesion y se recupera", async () => {
  let calls = 0;
  const error = new AuthRetryableFetchError("Failed to fetch refresh token", 503);
  const { events, recovery, timers } = setup({
    auth: { getSession: async () => ++calls === 1
      ? { data: { session: null }, error }
      : { data: { session }, error: null } },
  });
  await recovery.recover();
  assert.deepEqual(events, [["retry", error]]);
  assert.equal(timers.size, 1);
  const [id, timer] = [...timers][0];
  assert.equal(timer.delay, 2000);
  timers.delete(id);
  timer.callback();
  await recovery.recover();
  assert.deepEqual(events, [["retry", error], ["session", session]]);
  assert.equal(timers.size, 0);
  recovery.dispose();
});

test("errores de red, limites y timeout nunca se clasifican como tokens invalidos", () => {
  for (const error of [
    new AuthRetryableFetchError("Invalid refresh token: connection failed", 0),
    new AuthApiError("Too many requests", 429, "over_request_rate_limit"),
    new AuthApiError("Timed out", 504, "request_timeout"),
    new TypeError("Failed to fetch"),
    { name: "AbortError", message: "Aborted" },
  ]) {
    assert.equal(isTransientAuthError(error), true);
    assert.equal(isInvalidSessionError(error), false);
  }
  assert.equal(isInvalidSessionError(new Error("refresh token failed")), false);
});

test("un refresh token realmente revocado cierra solo mediante el callback de sesion invalida", async () => {
  const { events, recovery, timers } = setup({
    auth: { getSession: async () => ({ data: { session: null },
      error: new AuthApiError("Revoked", 400, "refresh_token_not_found") }) },
  });
  await recovery.recover();
  assert.deepEqual(events, [["invalid-session"]]);
  assert.equal(timers.size, 0);
  recovery.dispose();
});

test("una sesion ausente sin error sigue siendo anonima", async () => {
  const { events, recovery, timers } = setup({
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
  });
  await recovery.recover();
  assert.deepEqual(events, [["signed-out"]]);
  assert.equal(timers.size, 0);
  recovery.dispose();
});

test("foco y conexion simultaneos comparten una sola recuperacion", async () => {
  const pending = deferred();
  let calls = 0;
  const { recovery, events } = setup({
    auth: { getSession: () => { calls += 1; return pending.promise; } },
  });
  const first = recovery.recover();
  const second = recovery.recover();
  assert.equal(first, second);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  pending.resolve({ data: { session }, error: null });
  await first;
  assert.deepEqual(events, [["session", session]]);
  recovery.dispose();
});

test("cerrar sesion cancela una respuesta tardia y permite recuperar otra cuenta", async () => {
  const pending = deferred();
  let calls = 0;
  const newSession = { user: { id: "manager-2" } };
  const { recovery, events } = setup({
    auth: { getSession: () => ++calls === 1 ? pending.promise
      : Promise.resolve({ data: { session: newSession }, error: null }) },
  });
  const first = recovery.recover();
  await new Promise((resolve) => setImmediate(resolve));
  recovery.invalidate();
  await recovery.recover();
  pending.resolve({ data: { session }, error: null });
  await first;
  assert.deepEqual(events, [["session", newSession]]);
  recovery.dispose();
});

test("una validacion de perfil tardia pierde permiso para actualizar el estado", async () => {
  const pending = deferred();
  let isCurrent;
  const { recovery, timers } = setup({
    onSession: async (_session, current) => {
      isCurrent = current;
      await pending.promise;
      return false;
    },
  });
  const attempt = recovery.recover();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(isCurrent(), true);
  recovery.invalidate();
  assert.equal(isCurrent(), false);
  pending.resolve();
  await attempt;
  assert.equal(timers.size, 0);
  recovery.dispose();
});

test("un perfil temporalmente no disponible se reintenta sin cerrar sesion", async () => {
  let validations = 0;
  const { recovery, events, timers } = setup({ onSession: async () => ++validations > 1 });
  await recovery.recover();
  assert.equal(timers.size, 1);
  await recovery.recover();
  assert.equal(validations, 2);
  assert.equal(timers.size, 0);
  assert.deepEqual(events, []);
  recovery.dispose();
});

test("los reintentos se espacian hasta 30 segundos y se cancelan al desmontar", async () => {
  const { recovery, events, timers } = setup({
    auth: { getSession: async () => { throw new TypeError("Failed to fetch"); } },
  });
  for (const delay of [2000, 4000, 8000, 16000, 30000, 30000]) {
    await recovery.recover();
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].delay, delay);
  }
  recovery.dispose();
  assert.equal(timers.size, 0);
  await recovery.recover();
  assert.equal(events.length, 6);
});

test("no intenta recuperar en segundo plano o sin red; al volver puede hacerlo", async () => {
  let available = false;
  const { recovery, events, timers } = setup({ canRecover: () => available });
  await recovery.recover();
  assert.deepEqual(events, []);
  assert.equal(timers.size, 0);
  available = true;
  await recovery.recover();
  assert.deepEqual(events, [["session", session]]);
  recovery.dispose();
});

test("un fallo durante migracion se reintenta antes de leer o reemplazar la sesion", async () => {
  let migrations = 0;
  let sessionReads = 0;
  const { recovery, events } = setup({
    migrateSession: async () => { if (++migrations === 1) throw new AuthRetryableFetchError("Offline", 0); },
    auth: { getSession: async () => { sessionReads += 1; return { data: { session }, error: null }; } },
  });
  await recovery.recover();
  assert.equal(sessionReads, 0);
  await recovery.recover();
  assert.equal(migrations, 2);
  assert.equal(sessionReads, 1);
  assert.equal(events[1][0], "session");
  recovery.dispose();
});
