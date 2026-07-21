import { createScanRequestFingerprint, EphemeralScanCache } from "./scanCache.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(`${message}: esperado ${expected}, recibido ${actual}`);
};

Deno.test("la huella incluye imagen, contexto y no depende del orden de llaves", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const first = await createScanRequestFingerprint(bytes, "image/jpeg", {
    user: "one",
    match: { visitor: "B", local: "A" },
  });
  const reordered = await createScanRequestFingerprint(bytes, "image/jpeg", {
    match: { local: "A", visitor: "B" },
    user: "one",
  });
  const otherMatch = await createScanRequestFingerprint(bytes, "image/jpeg", {
    user: "one",
    match: { local: "A", visitor: "C" },
  });

  assertEquals(first, reordered, "orden estable");
  assertEquals(first === otherMatch, false, "otro partido no reutiliza el resultado");
});

Deno.test("coalesce solicitudes concurrentes y conserva el exito", async () => {
  let calls = 0;
  let release!: (value: string) => void;
  const deferred = new Promise<string>(resolve => { release = resolve; });
  const cache = new EphemeralScanCache<string>();
  const create = () => {
    calls += 1;
    return deferred;
  };

  const first = cache.getOrCreate("same", create);
  const second = cache.getOrCreate("same", create);
  await Promise.resolve();
  assertEquals(calls, 1, "una sola llamada en vuelo");
  release("scan");
  const [firstResult, secondResult] = await Promise.all([first, second]);
  const thirdResult = await cache.getOrCreate("same", async () => "unexpected");

  assertEquals(firstResult.value, "scan", "primer resultado");
  assertEquals(secondResult.source, "coalesced", "segunda solicitud coalescida");
  assertEquals(thirdResult.source, "hit", "resultado reutilizado");
});

Deno.test("un fallo no queda almacenado", async () => {
  const cache = new EphemeralScanCache<string>();
  let calls = 0;
  try {
    await cache.getOrCreate("retry", async () => {
      calls += 1;
      throw new Error("temporary");
    });
  } catch { /* esperado */ }

  const result = await cache.getOrCreate("retry", async () => {
    calls += 1;
    return "ok";
  });
  assertEquals(calls, 2, "vuelve a ejecutar tras el fallo");
  assertEquals(result.value, "ok", "segundo intento exitoso");
});

Deno.test("expira resultados y aplica limite LRU", async () => {
  let now = 1_000;
  const cache = new EphemeralScanCache<string>({ ttlMs: 100, maxEntries: 2, now: () => now });
  await cache.getOrCreate("a", async () => "A");
  await cache.getOrCreate("b", async () => "B");
  await cache.getOrCreate("a", async () => "unexpected");
  await cache.getOrCreate("c", async () => "C");
  const b = await cache.getOrCreate("b", async () => "B2");
  assertEquals(b.source, "miss", "expulsa la entrada menos reciente");

  now += 101;
  const a = await cache.getOrCreate("a", async () => "A2");
  assertEquals(a.source, "miss", "expira por TTL");
});
