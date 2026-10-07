import test from "node:test";
import assert from "node:assert/strict";
import { createClient, FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import {
  DEFAULT_CEDULA_SCAN_TIMEOUT_MS,
  invokeCedulaScan,
  waitForCedulaScan,
} from "../src/utils/cedulaScanClient.js";
import {
  getCachedCedulaScanResult,
  getOrCreateCedulaScanRequest,
  resetCedulaScanRequestCache,
} from "../src/utils/cedulaScanRequestCache.js";

const image = {
  blob: new Blob(["imagen"], { type: "image/jpeg" }),
  mimeType: "image/jpeg",
  fileName: "cedula.jpg",
  detailImages: [{ blob: new Blob(["detalle"], { type: "image/jpeg" }), fileName: "detalle.jpg" }],
};
const context = { teams: [{ side: "local", name: "Tigres Norte" }, { side: "visitor", name: "Real Sur" }] };
const scanResult = {
  scan: { localTeam: { name: "Tigres Norte", score: 2 }, visitorTeam: { name: "Real Sur", score: 1 }, players: [] },
  requestId: "edge-success",
};
const clientFor = (invoke) => ({ functions: { invoke } });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};
const httpFailure = (status, body, headers = {}) => {
  const response = typeof body === "string"
    ? new Response(body, { status, headers })
    : Response.json(body, { status, headers });
  return { data: null, error: new FunctionsHttpError(response), response };
};

test.beforeEach(() => resetCedulaScanRequestCache());

test("envía imagen y detalles con FormData, identificador y señal; libera el plazo al completar", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let captured;
  const client = clientFor((name, options) => {
    captured = { name, ...options };
    return Promise.resolve({ data: scanResult, error: null });
  });
  assert.strictEqual(await invokeCedulaScan(client, image, context), scanResult);
  assert.equal(captured.name, "procesar-cedula");
  assert.ok(captured.body instanceof FormData);
  assert.equal(captured.body.get("image").name, "cedula.jpg");
  assert.equal(await captured.body.get("image").text(), "imagen");
  assert.equal(captured.body.get("mimeType"), "image/jpeg");
  assert.deepEqual(JSON.parse(captured.body.get("matchContext")), context);
  assert.equal(captured.body.getAll("detailImages").length, 1);
  assert.equal(await captured.body.get("detailImages").text(), "detalle");
  assert.match(captured.headers["x-request-id"], /^[\w-]+$/);
  assert.equal(captured.headers["Content-Type"], undefined, "fetch establece el boundary multipart");
  assert.equal(captured.signal.aborted, false);
  t.mock.timers.tick(DEFAULT_CEDULA_SCAN_TIMEOUT_MS);
  assert.equal(captured.signal.aborted, false, "una respuesta completa no debe abortarse después");
});

test("conserva cuota, reintento e identificador de la edge sin acortar Retry-After", async () => {
  const failure = httpFailure(429, {
    error: "Cuota diaria agotada.",
    code: "SCAN_DAILY_QUOTA_EXCEEDED",
    retryable: false,
    retryAfterSeconds: 86_500,
    requestId: "edge-quota",
  }, { "Retry-After": "90000" });
  await assert.rejects(invokeCedulaScan(clientFor(async () => failure), image, context), (error) => {
    assert.equal(error.message, "Cuota diaria agotada.");
    assert.equal(error.status, 429);
    assert.equal(error.code, "SCAN_DAILY_QUOTA_EXCEEDED");
    assert.equal(error.retryable, false);
    assert.equal(error.retryAfterSeconds, 90_000);
    assert.equal(error.requestId, "edge-quota");
    return true;
  });
  assert.equal((await failure.response.json()).code, "SCAN_DAILY_QUOTA_EXCEEDED", "la lectura usa un clone");
});

test("lee Retry-After como fecha HTTP y respeta un plazo explícito cero", async (t) => {
  const now = Date.UTC(2026, 9, 7, 18, 0);
  t.mock.timers.enable({ apis: ["Date"], now });
  const client = clientFor(async () => httpFailure(429, "Gateway limit", {
    "Retry-After": new Date(now + 240_000).toUTCString(), "X-Request-Id": "gateway-date",
  }));
  await assert.rejects(invokeCedulaScan(client, image, context), (error) => {
    assert.equal(error.retryAfterSeconds, 240);
    assert.equal(error.requestId, "gateway-date");
    return true;
  });
  for (const retryAfter of ["0", new Date(now - 240_000).toUTCString()]) {
    await assert.rejects(invokeCedulaScan(clientFor(async () => httpFailure(429, "Gateway limit", {
      "Retry-After": retryAfter,
    })), image, context), (error) => error.retryAfterSeconds === 0);
  }
});

test("distingue sesión, permisos, red y timeout del gateway", async () => {
  for (const [status, code, retryable] of [[401, "SCAN_AUTH_REQUIRED", false], [403, "SCAN_FORBIDDEN", false], [504, "SCAN_TIMEOUT", true]]) {
    await assert.rejects(invokeCedulaScan(clientFor(async () => httpFailure(status, "Gateway error")), image, context),
      (error) => error.status === status && error.code === code && error.retryable === retryable);
  }
  for (const invoke of [
    async () => ({ data: null, error: new FunctionsFetchError(new TypeError("Failed to fetch")) }),
    async () => { throw new TypeError("Failed to fetch"); },
  ]) {
    await assert.rejects(invokeCedulaScan(clientFor(invoke), image, context), (error) => {
      assert.equal(error.status, 0);
      assert.equal(error.code, "SCAN_NETWORK_ERROR");
      assert.equal(error.retryable, true);
      assert.ok(error.requestId);
      return true;
    });
  }
});

test("conserva código del gateway cuando responde sin JSON", async () => {
  await assert.rejects(invokeCedulaScan(clientFor(async () => httpFailure(546, "Resource limit", {
    "sb-error-code": "WORKER_LIMIT", "x-request-id": "worker-id",
  })), image, context), (error) => error.code === "WORKER_LIMIT" && error.status === 546
    && error.requestId === "worker-id" && error.retryable === true);
});

test("funciona con el SDK instalado y su transporte multipart real", async () => {
  let captured;
  const client = createClient("https://scan-test.supabase.co", "sb_publishable_test", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, options) => {
      captured = { url, ...options };
      return Response.json(scanResult);
    } },
  });
  assert.deepEqual(await invokeCedulaScan(client, image, context), scanResult);
  assert.equal(captured.url, "https://scan-test.supabase.co/functions/v1/procesar-cedula");
  assert.equal(captured.method, "POST");
  assert.ok(captured.body instanceof FormData);
  assert.equal(new Headers(captured.headers).has("Content-Type"), false);
  assert.equal(captured.signal.aborted, false);
});

test("un transporte que rechaza al abortar conserva el error del plazo del cliente", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let aborts = 0;
  const client = clientFor((_, { signal }) => new Promise((resolve) => {
    signal.addEventListener("abort", () => {
      aborts += 1;
      resolve({ error: new FunctionsFetchError(new DOMException("Aborted", "AbortError")) });
    });
  }));
  const rejected = assert.rejects(invokeCedulaScan(client, image, context, { timeoutMs: 100 }),
    (error) => error.code === "SCAN_CLIENT_TIMEOUT");
  await Promise.resolve();
  t.mock.timers.tick(100);
  await rejected;
  assert.equal(aborts, 1);
});

test("vence y aborta un SDK que nunca resuelve, liberando el escaneo para reintentar", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  const client = clientFor((_, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const pending = getOrCreateCedulaScanRequest("hung", () => invokeCedulaScan(client, image, context, { timeoutMs: 100 }));
  const rejected = assert.rejects(pending, (error) => error.code === "SCAN_CLIENT_TIMEOUT"
    && error.name === "TimeoutError" && error.retryable === true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(100);
  await rejected;
  assert.equal(signal.aborted, true);
  assert.equal(getCachedCedulaScanResult("hung"), undefined);
  assert.strictEqual(await getOrCreateCedulaScanRequest("hung", () => invokeCedulaScan(
    clientFor(async () => ({ data: scanResult, error: null })), image, context,
  )), scanResult);
});

test("el plazo cubre también una lectura colgada del cuerpo de error", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  const client = clientFor((_, options) => {
    signal = options.signal;
    return { error: { context: { status: 429, json: () => new Promise(() => {}) } } };
  });
  const rejected = assert.rejects(invokeCedulaScan(client, image, context, { timeoutMs: 100 }),
    (error) => error.code === "SCAN_CLIENT_TIMEOUT");
  await Promise.resolve();
  t.mock.timers.tick(100);
  await rejected;
  assert.equal(signal.aborted, true);
});

test("una respuesta tardía después del timeout no se convierte en éxito ni repuebla caché", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const delayed = deferred();
  const pending = getOrCreateCedulaScanRequest("late", () => invokeCedulaScan(
    clientFor(() => delayed.promise), image, context, { timeoutMs: 100 },
  ));
  const rejected = assert.rejects(pending, (error) => error.code === "SCAN_CLIENT_TIMEOUT");
  await Promise.resolve();
  await Promise.resolve();
  t.mock.timers.tick(100);
  await rejected;
  delayed.resolve({ data: scanResult, error: null });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(getCachedCedulaScanResult("late"), undefined);
});

test("rechaza respuestas 200 incompletas antes de cachearlas y permite reintento real", async () => {
  for (const scan of [undefined, null, [], {}, { localTeam: {}, visitorTeam: {} }]) {
    let calls = 0;
    const client = clientFor(async () => ({ data: ++calls === 1 ? { scan } : scanResult, error: null }));
    await assert.rejects(getOrCreateCedulaScanRequest("invalid", () => invokeCedulaScan(client, image, context)),
      (error) => error.code === "SCAN_INVALID_RESPONSE" && error.retryable === false);
    assert.equal(getCachedCedulaScanResult("invalid"), undefined);
    assert.strictEqual(await getOrCreateCedulaScanRequest("invalid", () => invokeCedulaScan(client, image, context)), scanResult);
    assert.equal(calls, 2);
    resetCedulaScanRequestCache();
  }
});

test("abandonar un suscriptor permite que otro vuelva a unirse sin cancelar ni repetir la petición", async () => {
  const delayed = deferred();
  let calls = 0;
  const factory = () => { calls += 1; return delayed.promise; };
  const shared = getOrCreateCedulaScanRequest("shared", factory);
  const controller = new AbortController();
  const abandoned = assert.rejects(waitForCedulaScan(shared, controller.signal),
    (error) => error.name === "AbortError" && error.code === "SCAN_CANCELLED");
  await Promise.resolve();
  controller.abort();
  await abandoned;
  const rejoined = waitForCedulaScan(getOrCreateCedulaScanRequest("shared", factory), new AbortController().signal);
  delayed.resolve(scanResult);
  assert.strictEqual(await rejoined, scanResult);
  assert.equal(calls, 1);
  assert.strictEqual(getCachedCedulaScanResult("shared"), scanResult);
});

test("un suscriptor ya cancelado maneja también un rechazo posterior de la petición compartida", async () => {
  const delayed = deferred();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(waitForCedulaScan(delayed.promise, controller.signal), (error) => error.code === "SCAN_CANCELLED");
  delayed.reject(new Error("network later"));
  await Promise.resolve();
});

test("la espera transmite resultado o error y retira el listener del suscriptor", async () => {
  const controller = new AbortController();
  assert.strictEqual(await waitForCedulaScan(Promise.resolve(scanResult), controller.signal), scanResult);
  controller.abort();
  const error = new Error("edge failure");
  await assert.rejects(waitForCedulaScan(Promise.reject(error), new AbortController().signal), (caught) => caught === error);
  assert.strictEqual(await waitForCedulaScan(Promise.resolve(scanResult)), scanResult);
});
