import { classifyProviderError } from "./scanErrors.ts";
import { createProviderResourceKey, runScanWithFallback, ScanProviderCircuitBreaker } from "./scanProvider.ts";

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
};
const primary = { model: "primary", resourceKey: "credential:primary" };
const fallback = { model: "fallback", resourceKey: "credential:fallback" };
const additionalFallback = { model: "additional", resourceKey: "credential:additional" };
const failure = async (action: () => Promise<unknown>) => {
  try { await action(); } catch (error) { return classifyProviderError(error); }
  throw new Error("Se esperaba que la lectura fallara.");
};

Deno.test("el timeout real aborta el primario y completa con el respaldo", async () => {
  const attempted: string[] = [];
  let primaryAborted = false;
  const result = await runScanWithFallback({
    primary, fallback, circuit: new ScanProviderCircuitBreaker(),
    attemptTimeoutMs: 10, totalTimeoutMs: 1000,
    execute: (target, _, signal) => {
      attempted.push(target.model);
      if (target.model === fallback.model) return Promise.resolve("lectura del respaldo");
      signal.addEventListener("abort", () => { primaryAborted = true; });
      return new Promise<never>(() => {});
    },
  });
  assertEquals(result.value, "lectura del respaldo");
  assertEquals(attempted, ["primary", "fallback"]);
  assertEquals(primaryAborted, true);
});

Deno.test("el respaldo recibe solamente el tiempo restante del presupuesto total", async () => {
  let now = 0;
  const budgets: number[] = [];
  const error = await failure(() => runScanWithFallback({
    primary, fallback, circuit: new ScanProviderCircuitBreaker(() => now), now: () => now,
    execute: (target, timeoutMs) => {
      budgets.push(timeoutMs);
      now += timeoutMs;
      return Promise.reject({ status: 504, message: `${target.model} timeout` });
    },
    attemptTimeoutMs: 60_000, totalTimeoutMs: 90_000,
  }));
  assertEquals(budgets, [60_000, 30_000]);
  assertEquals(now, 90_000);
  assertEquals(error.responseCode, "SCAN_TIMEOUT");
});

Deno.test("no hace llamadas ni consume cuota de usuario durante el cooldown de ambos modelos", async () => {
  let now = 0;
  let calls = 0;
  let quotaChecks = 0;
  const circuit = new ScanProviderCircuitBreaker(() => now);
  const read = () => runScanWithFallback({
    primary, fallback, circuit, now: () => now,
    beforeExecute: () => { quotaChecks++; return Promise.resolve(); },
    execute: () => { calls++; return Promise.reject({ status: 429, headers: { "Retry-After": "33" } }); },
  });
  await failure(read);
  now = 5000;
  const error = await failure(read);
  assertEquals(calls, 2);
  assertEquals(quotaChecks, 1);
  assertEquals(error.retryAfterSeconds, 28);
  now = 34_000;
  await failure(read);
  assertEquals(calls, 4);
  assertEquals(quotaChecks, 2);
});

Deno.test("el agotamiento diario de un modelo conserva disponible el respaldo", async () => {
  const circuit = new ScanProviderCircuitBreaker();
  const calls: string[] = [];
  const read = () => runScanWithFallback({
    primary, fallback, circuit,
    execute: target => {
      calls.push(target.model);
      return target.model === primary.model
        ? Promise.reject({ status: 429, message: "Quota exceeded for requests per day (RPD)." })
        : Promise.resolve("lectura");
    },
  });
  await read();
  await read();
  assertEquals(calls, ["primary", "fallback", "fallback"]);
});

Deno.test("503 seguido de 429 informa la primera disponibilidad recuperable", async () => {
  let now = 0;
  const circuit = new ScanProviderCircuitBreaker(() => now);
  const error = await failure(() => runScanWithFallback({
    primary, fallback, circuit, now: () => now,
    execute: target => {
      if (target.model === primary.model) return Promise.reject({ status: 503 });
      now = 1000;
      return Promise.reject({ status: 429, headers: { "Retry-After": "20" } });
    },
  }));
  assertEquals(error.responseCode, "SCAN_TEMPORARY_ERROR");
  assertEquals(error.retryAfterSeconds, 4);
});

Deno.test("cuota diaria del respaldo no impide reintentar el primario tras su limite temporal", async () => {
  const error = await failure(() => runScanWithFallback({
    primary, fallback, circuit: new ScanProviderCircuitBreaker(),
    execute: target => Promise.reject({ status: 429, message: target.model === primary.model ? "Retry in 20s" : "requests per day" }),
  }));
  assertEquals(error.responseCode, "SCAN_RATE_LIMITED");
  assertEquals(error.retryAfterSeconds, 20);
});

Deno.test("la cuota de usuario se consume una vez y su error no inicia Gemini", async () => {
  let calls = 0;
  let checks = 0;
  const unavailable = new Error("cuota de usuario");
  try {
    await runScanWithFallback({
      primary, fallback, circuit: new ScanProviderCircuitBreaker(),
      beforeExecute: () => { checks++; return Promise.reject(unavailable); },
      execute: () => { calls++; return Promise.resolve("no debe ejecutarse"); },
    });
    throw new Error("Se esperaba un rechazo de cuota.");
  } catch (error) {
    if (error !== unavailable) throw error;
  }
  assertEquals(checks, 1);
  assertEquals(calls, 0);
});

Deno.test("identifica cuota por credencial y modelo sin guardar la clave en el identificador", async () => {
  const left = await createProviderResourceKey("secret-a", "primary");
  const right = await createProviderResourceKey("secret-b", "primary");
  assertEquals(left.includes("secret-a"), false);
  assertEquals(left === right, false);
  assertEquals(left === await createProviderResourceKey("secret-a", "fallback"), false);
});

Deno.test("el tercer modelo completa tras 503 y 429 con una sola cuota de usuario", async () => {
  const calls: string[] = [];
  let checks = 0;
  const result = await runScanWithFallback({
    primary, fallback, additionalFallback, circuit: new ScanProviderCircuitBreaker(),
    beforeExecute: () => { checks++; return Promise.resolve(); },
    execute: target => {
      calls.push(target.model);
      if (target === primary) return Promise.reject({ status: 503 });
      if (target === fallback) return Promise.reject({ status: 429, headers: { "Retry-After": "20" } });
      return Promise.resolve("lectura del tercer modelo");
    },
  });
  assertEquals(result.value, "lectura del tercer modelo");
  assertEquals(result.attemptedModels, ["primary", "fallback", "additional"]);
  assertEquals(calls, ["primary", "fallback", "additional"]);
  assertEquals(checks, 1);
});

Deno.test("el tercer destino recibe solo el presupuesto restante y nunca extiende los 90s", async () => {
  let now = 0;
  const budgets: number[] = [];
  const error = await failure(() => runScanWithFallback({
    primary, fallback, additionalFallback, circuit: new ScanProviderCircuitBreaker(() => now), now: () => now,
    execute: (_, timeoutMs) => {
      budgets.push(timeoutMs);
      now += Math.min(35_000, timeoutMs);
      return Promise.reject({ status: 503 });
    },
  }));
  assertEquals(budgets, [45_000, 45_000, 20_000]);
  assertEquals(now, 90_000);
  assertEquals(error.responseCode, "SCAN_TEMPORARY_ERROR");
});

Deno.test("no repite un destino adicional duplicado ni inicia tercero tras consumir 90s", async () => {
  let calls = 0;
  await failure(() => runScanWithFallback({
    primary, fallback, additionalFallback: fallback, circuit: new ScanProviderCircuitBreaker(),
    execute: () => { calls++; return Promise.reject({ status: 503 }); },
  }));
  assertEquals(calls, 2);

  let now = 0;
  calls = 0;
  await failure(() => runScanWithFallback({
    primary, fallback, additionalFallback, circuit: new ScanProviderCircuitBreaker(() => now), now: () => now,
    execute: (_, timeoutMs) => {
      calls++;
      now += timeoutMs;
      return Promise.reject({ status: 504 });
    },
  }));
  assertEquals(now, 90_000);
  assertEquals(calls, 2);
});
