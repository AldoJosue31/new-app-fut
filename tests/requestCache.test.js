import assert from "node:assert/strict";
import test from "node:test";
import { createRequestCache } from "../src/utils/requestCache.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

test("comparte una consulta y cancelar un suscriptor no cancela a los demas", async () => {
  const cache = createRequestCache({ ttlMs: 100 });
  const gate = deferred();
  let calls = 0;
  let requestSignal;
  const load = (signal) => { calls++; requestSignal = signal; return gate.promise; };
  const controller = new AbortController();
  const first = cache.read("week", load, { signal: controller.signal });
  const second = cache.read("week", load);
  const aborted = assert.rejects(first, { name: "AbortError" });
  await Promise.resolve();
  controller.abort();
  await aborted;
  assert.equal(calls, 1);
  assert.equal(requestSignal.aborted, false);
  gate.resolve(["match"]);
  assert.deepEqual(await second, ["match"]);
  assert.deepEqual(await cache.read("week", load), ["match"]);
  assert.equal(calls, 1);
});

test("muestra datos anteriores mientras renueva una entrada vencida", async () => {
  let currentTime = 0;
  const cache = createRequestCache({ ttlMs: 10, now: () => currentTime });
  await cache.read("week", async () => ["old"]);
  currentTime = 11;
  const gate = deferred();
  let displayed;
  const pending = cache.read("week", () => gate.promise, {
    onCachedData: (data) => { displayed = data; },
  });
  assert.deepEqual(displayed, ["old"]);
  gate.resolve(["new"]);
  assert.deepEqual(await pending, ["new"]);
});

test("cancela una consulta abandonada y permite reintentarlo", async () => {
  const cache = createRequestCache({ ttlMs: 100 });
  const controller = new AbortController();
  let requestSignal;
  const first = cache.read("week", (signal) => {
    requestSignal = signal;
    return new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  }, { signal: controller.signal });
  await Promise.resolve();
  const aborted = assert.rejects(first, { name: "AbortError" });
  controller.abort();
  await aborted;
  await Promise.resolve();
  assert.equal(requestSignal.aborted, true);
  assert.deepEqual(await cache.read("week", async () => []), []);
});

test("un reemplazo inmediato comparte la consulta y los errores no quedan cacheados", async () => {
  const cache = createRequestCache({ ttlMs: 100 });
  const gate = deferred();
  const controller = new AbortController();
  let calls = 0;
  const load = () => { calls++; return gate.promise; };
  const first = cache.read("week", load, { signal: controller.signal });
  const aborted = assert.rejects(first, { name: "AbortError" });
  controller.abort();
  const second = cache.read("week", load);
  gate.resolve([]);
  await aborted;
  await second;
  assert.equal(calls, 1);
  await assert.rejects(cache.read("failed", async () => { throw new Error("Network"); }), /Network/);
  assert.deepEqual(await cache.read("failed", async () => ["retry"]), ["retry"]);
});

test("limita las entradas y no inicia consultas ya canceladas", async () => {
  const cache = createRequestCache({ ttlMs: 100, maxEntries: 1 });
  await cache.read("first", async () => [1]);
  await cache.read("second", async () => [2]);
  let reads = 0;
  assert.deepEqual(await cache.read("first", async () => { reads++; return [3]; }), [3]);
  assert.equal(reads, 1);
  await assert.rejects(cache.read("aborted", () => assert.fail("Must not query"), {
    signal: AbortSignal.abort(),
  }), { name: "AbortError" });
});

test("una lectura anterior no sobrescribe datos publicados por una comprobacion reciente", async () => {
  const cache = createRequestCache({ ttlMs: 100 });
  const gate = deferred();
  const olderRequest = cache.read("week", () => gate.promise);
  cache.set("week", ["latest"]);
  gate.resolve(["older"]);
  await olderRequest;
  assert.deepEqual(await cache.read("week", () => assert.fail("Already cached")), ["latest"]);
});
