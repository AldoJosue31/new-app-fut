const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 10;

const resultCache = new Map();
const inFlightRequests = new Map();

const canonicalize = (value, ancestors = new Set()) => {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return `string:${JSON.stringify(value)}`;
    case "boolean":
      return `boolean:${value}`;
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError("El contexto de la cédula solo admite números finitos.");
      }
      return `number:${Object.is(value, -0) ? "-0" : String(value)}`;
    case "undefined":
      return "undefined";
    case "bigint":
      return `bigint:${value}`;
    case "object":
      break;
    default:
      throw new TypeError(`Tipo no admitido en el contexto de la cédula: ${typeof value}.`);
  }

  if (ancestors.has(value)) {
    throw new TypeError("El contexto de la cédula no puede contener referencias circulares.");
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return `array:[${value.map(item => canonicalize(item, ancestors)).join(",")}]`;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new TypeError("El contexto de la cédula contiene una fecha inválida.");
      }
      return `date:${JSON.stringify(value.toISOString())}`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("El contexto de la cédula debe contener objetos simples.");
    }

    const entries = Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalize(value[key], ancestors)}`);
    return `object:{${entries.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
};

const toBytes = async (source) => {
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }

  if (typeof Blob !== "undefined" && source instanceof Blob) {
    return new Uint8Array(await source.arrayBuffer());
  }

  throw new TypeError("La imagen debe ser un Blob, ArrayBuffer o una vista binaria.");
};

const digestHex = async (bytes) => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Este navegador no permite calcular una huella segura de la imagen.");
  }

  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * Creates a deterministic fingerprint without retaining the supplied image.
 * Object keys in `context` are sorted recursively; array order remains significant.
 */
export const createCedulaScanFingerprint = async (
  source,
  context = {},
  version = "cedula-scan-v2-player-details",
) => {
  const imageBytes = await toBytes(source);
  const imageDigest = await digestHex(imageBytes);
  const fingerprintInput = canonicalize({
    context,
    imageDigest,
    version: String(version),
  });

  return digestHex(new TextEncoder().encode(fingerprintInput));
};

const readCachedResult = (fingerprint, now) => {
  const cached = resultCache.get(fingerprint);
  if (!cached) return { found: false, value: undefined };

  if (cached.expiresAt <= now) {
    resultCache.delete(fingerprint);
    return { found: false, value: undefined };
  }

  // Map insertion order doubles as an LRU list.
  resultCache.delete(fingerprint);
  resultCache.set(fingerprint, cached);
  return { found: true, value: cached.value };
};

const writeCachedResult = (fingerprint, value, expiresAt) => {
  resultCache.delete(fingerprint);
  resultCache.set(fingerprint, { value, expiresAt });

  while (resultCache.size > MAX_CACHE_ENTRIES) {
    const oldestFingerprint = resultCache.keys().next().value;
    resultCache.delete(oldestFingerprint);
  }
};

/**
 * Returns a recent result or runs `requestFactory` once for all concurrent callers.
 * Results live only in this JavaScript module; rejected requests are never cached.
 */
export const getOrCreateCedulaScanRequest = (
  fingerprint,
  requestFactory,
  { ttlMs = DEFAULT_CACHE_TTL_MS, now = Date.now } = {},
) => {
  if (typeof fingerprint !== "string" || fingerprint.length === 0) {
    throw new TypeError("La huella del escaneo es obligatoria.");
  }
  if (typeof requestFactory !== "function") {
    throw new TypeError("La solicitud de escaneo debe ser una función.");
  }
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new TypeError("La duración de la caché debe ser un número positivo.");
  }
  if (typeof now !== "function") {
    throw new TypeError("El reloj de la caché debe ser una función.");
  }

  const cached = readCachedResult(fingerprint, now());
  if (cached.found) return Promise.resolve(cached.value);

  const inFlight = inFlightRequests.get(fingerprint);
  if (inFlight) return inFlight;

  const request = Promise.resolve()
    .then(requestFactory)
    .then((value) => {
      writeCachedResult(fingerprint, value, now() + ttlMs);
      return value;
    })
    .finally(() => {
      if (inFlightRequests.get(fingerprint) === request) {
        inFlightRequests.delete(fingerprint);
      }
    });

  inFlightRequests.set(fingerprint, request);
  return request;
};

export const resetCedulaScanRequestCache = () => {
  resultCache.clear();
  inFlightRequests.clear();
};

export { DEFAULT_CACHE_TTL_MS, MAX_CACHE_ENTRIES };
