export const DEFAULT_LEAGUE_COLOR = "#1CB0F6";

export function normalizeHexColor(value) {
  if (typeof value !== "string") return null;
  const hex = value.trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(hex)) return `#${hex.split("").map(char => char + char).join("").toUpperCase()}`;
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}

const channels = color => {
  const hex = normalizeHexColor(color);
  if (!hex) throw new Error("Color hexadecimal inválido.");
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
};
const toHex = values => `#${values.map(value => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

export function mixHexColors(color, target, amount) {
  const weight = Math.max(0, Math.min(1, amount));
  const targetChannels = channels(target);
  return toHex(channels(color).map((value, index) => value * (1 - weight) + targetChannels[index] * weight));
}

const luminance = color => channels(color).map(value => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

export function colorContrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function contrastingTextColor(background) {
  return colorContrast("#FFFFFF", background) >= colorContrast("#111827", background) ? "#FFFFFF" : "#111827";
}

export function readableAccent(color, background, minimumContrast = 4.5) {
  const normalized = normalizeHexColor(color);
  if (colorContrast(normalized, background) >= minimumContrast) return normalized;
  const target = contrastingTextColor(background);
  for (let weight = 0.05; weight <= 1; weight += 0.05) {
    const candidate = mixHexColors(normalized, target, weight);
    if (colorContrast(candidate, background) >= minimumContrast) return candidate;
  }
  return target;
}

// Quantize similar shades together so compression and anti-aliasing do not split
// the main logo color. Ignore transparent pixels and prefer ink over white paper.
export function dominantColorFromPixels(pixels) {
  const all = new Map();
  const ink = new Map();
  const chromatic = new Map();
  let opaqueWeight = 0;
  let chromaticWeight = 0;
  const add = (map, key, r, g, b, weight) => {
    const bucket = map.get(key) || { weight: 0, r: 0, g: 0, b: 0 };
    bucket.weight += weight;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    map.set(key, bucket);
  };
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const [r, g, b, alpha] = pixels.slice(index, index + 4);
    if (alpha < 128) continue;
    const weight = alpha / 255;
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    opaqueWeight += weight;
    add(all, key, r, g, b, weight);
    if (Math.min(r, g, b) < 235) add(ink, key, r, g, b, weight);
    if (Math.max(r, g, b) - Math.min(r, g, b) >= 24) {
      chromaticWeight += weight;
      add(chromatic, key, r, g, b, weight);
    }
  }
  const candidates = chromaticWeight >= opaqueWeight * 0.03 && chromatic.size ? chromatic : ink.size ? ink : all;
  let dominant = null;
  for (const bucket of candidates.values()) {
    if (!dominant || bucket.weight > dominant.weight) dominant = bucket;
  }
  return dominant ? toHex([dominant.r, dominant.g, dominant.b].map(value => value / dominant.weight)) : null;
}

export async function extractLogoColor(source, { signal } = {}) {
  if (!source) return null;
  const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);
  const image = new Image();
  image.crossOrigin = "anonymous";
  try {
    await new Promise((resolve, reject) => {
      const finish = error => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new DOMException("Detección cancelada.", "AbortError"));
      const timeout = setTimeout(() => finish(new Error("El logo tardó demasiado en cargar.")), 12000);
      image.onload = () => finish();
      image.onerror = () => finish(new Error("No se pudo leer el logo."));
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      image.src = objectUrl || source;
    });
    if (signal?.aborted) throw new DOMException("Detección cancelada.", "AbortError");
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No se pudo analizar el logo.");
    context.drawImage(image, 0, 0, 64, 64);
    return dominantColorFromPixels(context.getImageData(0, 0, 64, 64).data);
  } finally {
    image.src = "";
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
