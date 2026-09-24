import { type RawScheduleScan, selectScheduleForDivision } from "./matching.ts";

const CACHE_VERSION = "rol-juego-raw-v1";
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 12;
const MAX_READINGS_PER_IMAGE = 3;

type SelectionContext = Parameters<typeof selectScheduleForDivision>[1];
type CachedReading = {
  raw: RawScheduleScan;
  contextKey: string;
};
type CacheEntry = {
  readings: CachedReading[];
  expiresAt: number;
};

const bytesToHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (text: string) =>
  bytesToHex(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(text),
      ),
    ),
  );

/** La huella incluye el JWT verificado por el gateway, sin retenerlo. */
export const createRoleScanFingerprint = async (
  imageBase64: string,
  mimeType: string,
  authorization: string,
) => {
  const imageHash = await sha256Hex(imageBase64);
  return sha256Hex(JSON.stringify({
    version: CACHE_VERSION,
    imageHash,
    mimeType: mimeType.toLowerCase(),
    authorization,
  }));
};

const normalizeLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const contextKey = (context: SelectionContext) => JSON.stringify(context);

export class RoleScanCache {
  #entries = new Map<string, CacheEntry>();
  #ttlMs: number;
  #maxEntries: number;
  #now: () => number;

  constructor(options: {
    ttlMs?: number;
    maxEntries?: number;
    now?: () => number;
  } = {}) {
    this.#ttlMs = Math.max(1, options.ttlMs || DEFAULT_TTL_MS);
    this.#maxEntries = Math.max(1, options.maxEntries || DEFAULT_MAX_ENTRIES);
    this.#now = options.now || Date.now;
  }

  find(key: string, context: SelectionContext) {
    const entry = this.#entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return null;
    }

    this.#entries.delete(key);
    this.#entries.set(key, entry);
    const requestedContext = contextKey(context);
    for (const reading of [...entry.readings].reverse()) {
      const scan = selectScheduleForDivision(reading.raw, context);
      if (!scan.complete || scan.matchedTeamCount !== context.teams.length) {
        continue;
      }
      if (reading.contextKey === requestedContext) return scan;
      // Otra division solo puede usar la lectura si ambos encabezados visibles
      // coinciden de forma exacta. Los resultados ambiguos vuelven a Gemini.
      if (
        !context.divisionName || !context.roundTitle ||
        normalizeLabel(scan.sourceDivision) !==
          normalizeLabel(context.divisionName) ||
        normalizeLabel(scan.sourceRound) !== normalizeLabel(context.roundTitle)
      ) continue;
      return scan;
    }
    return null;
  }

  store(key: string, context: SelectionContext, raw: RawScheduleScan) {
    const selected = selectScheduleForDivision(raw, context);
    if (
      !selected.complete || selected.matchedTeamCount !== context.teams.length
    ) return;

    const existing = this.#entries.get(key);
    const validReadings = existing && existing.expiresAt > this.#now()
      ? existing.readings
      : [];
    const selectedContext = contextKey(context);
    const readings = [
      ...validReadings.filter((reading) =>
        reading.contextKey !== selectedContext
      ),
      { raw, contextKey: selectedContext },
    ].slice(-MAX_READINGS_PER_IMAGE);
    this.#entries.delete(key);
    this.#entries.set(key, { readings, expiresAt: this.#now() + this.#ttlMs });
    while (this.#entries.size > this.#maxEntries) {
      const oldest = this.#entries.keys().next().value;
      if (typeof oldest !== "string") break;
      this.#entries.delete(oldest);
    }
  }
}
