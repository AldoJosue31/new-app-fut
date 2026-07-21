import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CACHE_TTL_MS,
  MAX_CACHE_ENTRIES,
  createCedulaScanFingerprint,
  getOrCreateCedulaScanRequest,
  resetCedulaScanRequestCache,
} from "../src/utils/cedulaScanRequestCache.js";

test.beforeEach(() => {
  resetCedulaScanRequestCache();
});

test("genera la misma huella para los mismos bytes y un contexto canónico", async () => {
  const bytes = new Uint8Array([10, 20, 30, 40]);
  const first = await createCedulaScanFingerprint(
    bytes.buffer,
    { visit: { name: "Azules", id: 22 }, local: { id: 11, name: "Rojos" } },
    "schema-v2",
  );
  const second = await createCedulaScanFingerprint(
    new Blob([bytes]),
    { local: { name: "Rojos", id: 11 }, visit: { id: 22, name: "Azules" } },
    "schema-v2",
  );

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("distingue imagen, partido, orden de listas y versión", async () => {
  const image = new Uint8Array([1, 2, 3]).buffer;
  const base = await createCedulaScanFingerprint(image, { matchId: 9, teams: [1, 2] }, "v1");

  assert.notEqual(
    base,
    await createCedulaScanFingerprint(new Uint8Array([1, 2, 4]).buffer, { matchId: 9, teams: [1, 2] }, "v1"),
  );
  assert.notEqual(
    base,
    await createCedulaScanFingerprint(image, { matchId: 10, teams: [1, 2] }, "v1"),
  );
  assert.notEqual(
    base,
    await createCedulaScanFingerprint(image, { matchId: 9, teams: [2, 1] }, "v1"),
  );
  assert.notEqual(
    base,
    await createCedulaScanFingerprint(image, { matchId: 9, teams: [1, 2] }, "v2"),
  );
});

test("une solicitudes concurrentes y reutiliza el resultado durante 30 minutos", async () => {
  let calls = 0;
  let resolveRequest;
  const factory = () => {
    calls += 1;
    return new Promise(resolve => {
      resolveRequest = resolve;
    });
  };

  const first = getOrCreateCedulaScanRequest("same-scan", factory);
  const second = getOrCreateCedulaScanRequest("same-scan", factory);

  assert.strictEqual(first, second);
  assert.equal(calls, 0, "la fábrica se ejecuta en la siguiente microtarea");
  await Promise.resolve();
  assert.equal(calls, 1);

  resolveRequest({ score: "2-1" });
  assert.deepEqual(await first, { score: "2-1" });
  assert.deepEqual(
    await getOrCreateCedulaScanRequest("same-scan", () => {
      calls += 1;
      return { score: "0-0" };
    }),
    { score: "2-1" },
  );
  assert.equal(calls, 1);
  assert.equal(DEFAULT_CACHE_TTL_MS, 30 * 60 * 1000);
});

test("vence por TTL y una solicitud fallida se puede reintentar", async () => {
  let currentTime = 1000;
  let calls = 0;
  const options = { ttlMs: 100, now: () => currentTime };
  const factory = () => ({ attempt: ++calls });

  assert.deepEqual(await getOrCreateCedulaScanRequest("ttl", factory, options), { attempt: 1 });
  currentTime = 1099;
  assert.deepEqual(await getOrCreateCedulaScanRequest("ttl", factory, options), { attempt: 1 });
  currentTime = 1100;
  assert.deepEqual(await getOrCreateCedulaScanRequest("ttl", factory, options), { attempt: 2 });

  const failed = getOrCreateCedulaScanRequest("retry", () => {
    throw new Error("sin cuota");
  }, options);
  await assert.rejects(failed, /sin cuota/);
  assert.equal(await getOrCreateCedulaScanRequest("retry", () => "ok", options), "ok");
});

test("mantiene como máximo diez resultados con política LRU", async () => {
  for (let index = 0; index < MAX_CACHE_ENTRIES; index += 1) {
    await getOrCreateCedulaScanRequest(`scan-${index}`, () => index);
  }

  // Touch scan-0 so scan-1 becomes the least recently used entry.
  assert.equal(await getOrCreateCedulaScanRequest("scan-0", () => -1), 0);
  await getOrCreateCedulaScanRequest("scan-10", () => 10);

  let scanZeroCalls = 0;
  assert.equal(await getOrCreateCedulaScanRequest("scan-0", () => ++scanZeroCalls), 0);
  assert.equal(scanZeroCalls, 0);

  let scanOneCalls = 0;
  assert.equal(await getOrCreateCedulaScanRequest("scan-1", () => {
    scanOneCalls += 1;
    return 101;
  }), 101);
  assert.equal(scanOneCalls, 1);
});

test("rechaza contextos circulares sin retener la imagen", async () => {
  const context = {};
  context.self = context;

  await assert.rejects(
    createCedulaScanFingerprint(new ArrayBuffer(0), context),
    /referencias circulares/,
  );
});
