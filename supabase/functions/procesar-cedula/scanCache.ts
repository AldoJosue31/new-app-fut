export const CEDULA_SCAN_CACHE_VERSION = "cedula-scan-v1";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type CacheSource = "hit" | "miss" | "coalesced";

const bytesToHex = (bytes: Uint8Array) =>
  [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (bytes: Uint8Array) =>
  bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
};

export const createScanRequestFingerprint = async (
  imageBytes: Uint8Array,
  mimeType: string,
  scope: unknown,
) => {
  const imageHash = await sha256Hex(imageBytes);
  const descriptor = JSON.stringify(canonicalize({
    version: CEDULA_SCAN_CACHE_VERSION,
    imageHash,
    mimeType: String(mimeType || "").toLowerCase(),
    scope,
  }));
  return sha256Hex(new TextEncoder().encode(descriptor));
};

export class EphemeralScanCache<T> {
  #entries = new Map<string, CacheEntry<T>>();
  #pending = new Map<string, Promise<T>>();
  #ttlMs: number;
  #maxEntries: number;
  #now: () => number;

  constructor(options: { ttlMs?: number; maxEntries?: number; now?: () => number } = {}) {
    this.#ttlMs = Math.max(1, options.ttlMs || 30 * 60 * 1000);
    this.#maxEntries = Math.max(1, options.maxEntries || 24);
    this.#now = options.now || Date.now;
  }

  #read(key: string) {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }

    // Reinserta para mantener orden LRU sin guardar contadores adicionales.
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry.value;
  }

  #write(key: string, value: T) {
    this.#entries.delete(key);
    this.#entries.set(key, { value, expiresAt: this.#now() + this.#ttlMs });
    while (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value;
      if (typeof oldestKey !== "string") break;
      this.#entries.delete(oldestKey);
    }
  }

  async getOrCreate(key: string, create: () => Promise<T>): Promise<{ value: T; source: CacheSource }> {
    const cached = this.#read(key);
    if (cached !== undefined) return { value: cached, source: "hit" };

    const pending = this.#pending.get(key);
    if (pending) return { value: await pending, source: "coalesced" };

    const request = Promise.resolve().then(create);
    this.#pending.set(key, request);
    try {
      const value = await request;
      this.#write(key, value);
      return { value, source: "miss" };
    } finally {
      if (this.#pending.get(key) === request) this.#pending.delete(key);
    }
  }
}
