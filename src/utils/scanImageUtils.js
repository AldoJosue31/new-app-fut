export const MAX_SCAN_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_SCAN_IMAGE_SIDE = 2200;

const PASSTHROUGH_IMAGE_BYTES = 2.5 * 1024 * 1024;
const DIRECT_SCAN_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MIME_TYPE_ALIASES = new Map([
  ["image/jpg", "image/jpeg"],
  ["image/jpe", "image/jpeg"],
  ["image/pjpeg", "image/jpeg"],
  ["image/x-png", "image/png"],
  ["image/x-webp", "image/webp"],
  ["image/x-heic", "image/heic"],
  ["image/x-heif", "image/heif"],
  ["image/avif-sequence", "image/avif"],
  ["image/gif87a", "image/gif"],
  ["image/gif89a", "image/gif"],
  ["image/x-ms-bmp", "image/bmp"],
  ["image/x-bmp", "image/bmp"],
  ["image/x-tiff", "image/tiff"],
]);

const EXTENSION_MIME_TYPES = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["jpe", "image/jpeg"],
  ["jfif", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["heic", "image/heic"],
  ["heif", "image/heif"],
  ["hif", "image/heif"],
  ["avif", "image/avif"],
  ["gif", "image/gif"],
  ["bmp", "image/bmp"],
  ["dib", "image/bmp"],
  ["tif", "image/tiff"],
  ["tiff", "image/tiff"],
  ["svg", "image/svg+xml"],
  ["ico", "image/x-icon"],
]);

const normalizeMimeValue = (value) => {
  const mimeType = String(value || "").trim().toLowerCase().split(";")[0];
  return MIME_TYPE_ALIASES.get(mimeType) || mimeType;
};

const mimeTypeFromExtension = (fileName) => {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase();
  return EXTENSION_MIME_TYPES.get(extension) || "";
};

const startsWithBytes = (bytes, signature) => (
  signature.every((value, index) => bytes[index] === value)
);

const asciiAt = (bytes, start, length) => (
  String.fromCharCode(...bytes.subarray(start, start + length))
);

const mimeTypeFromBytes = (bytes) => {
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (["GIF87a", "GIF89a"].includes(asciiAt(bytes, 0, 6))) return "image/gif";
  if (asciiAt(bytes, 0, 2) === "BM") return "image/bmp";
  if (
    startsWithBytes(bytes, [0x49, 0x49, 0x2a, 0x00])
    || startsWithBytes(bytes, [0x4d, 0x4d, 0x00, 0x2a])
  ) {
    return "image/tiff";
  }

  if (asciiAt(bytes, 4, 4) === "ftyp") {
    const brand = asciiAt(bytes, 8, 4).toLowerCase();
    if (["avif", "avis"].includes(brand)) return "image/avif";
    if (
      ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]
        .includes(brand)
    ) {
      return "image/heif";
    }
  }

  const textHeader = new TextDecoder().decode(bytes).trimStart().toLowerCase();
  if (textHeader.startsWith("<svg") || (textHeader.startsWith("<?xml") && textHeader.includes("<svg"))) {
    return "image/svg+xml";
  }
  return "";
};

export const normalizeImageMimeType = (file) => (
  normalizeMimeValue(file?.type) || mimeTypeFromExtension(file?.name)
);

export const isPotentialImageFile = (file) => {
  if (!file || typeof file.slice !== "function") return false;
  const mimeType = normalizeMimeValue(file.type);
  return (
    !mimeType
    || mimeType === "application/octet-stream"
    || mimeType.startsWith("image/")
    || Boolean(mimeTypeFromExtension(file.name))
  );
};

export const detectImageMimeType = async (file) => {
  let detectedMimeType = "";
  try {
    const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    detectedMimeType = mimeTypeFromBytes(bytes);
  } catch {
    // Algunos proveedores moviles no permiten una lectura anticipada; se usa su metadata.
  }
  return detectedMimeType || normalizeImageMimeType(file);
};

export const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, mimeType, quality);
});

const loadImageSource = async (file) => {
  if (typeof window.createImageBitmap === "function") {
    try {
      const bitmap = await window.createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Safari y algunos WebViews solo exponen ciertos formatos mediante Image.
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const release = () => URL.revokeObjectURL(objectUrl);
    image.onload = () => resolve({
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      release,
    });
    image.onerror = () => {
      release();
      reject(new Error("El navegador no puede abrir este formato de imagen."));
    };
    image.src = objectUrl;
  });
};

const originalFilePayload = (file, mimeType, fallbackName, detailImages) => ({
  blob: file,
  mimeType,
  fileName: file.name || fallbackName,
  detailImages,
});

export const prepareImageForScan = async (file, {
  fallbackName = "imagen",
  optimizedName = "imagen-optimizada",
  maxImageSide = MAX_SCAN_IMAGE_SIDE,
  createDetailImages,
} = {}) => {
  if (!file?.size) throw new Error("La imagen seleccionada esta vacia o ya no esta disponible.");
  if (file.size > MAX_SCAN_IMAGE_BYTES) {
    throw new Error("La imagen debe pesar menos de 12 MB.");
  }

  const sourceMimeType = await detectImageMimeType(file);
  if (!sourceMimeType.startsWith("image/")) {
    throw new Error("El archivo seleccionado no contiene una imagen valida.");
  }

  let decoded = null;
  let detailImages = [];
  try {
    decoded = await loadImageSource(file);
    if (!decoded.width || !decoded.height) {
      throw new Error("La imagen no contiene dimensiones validas.");
    }

    if (typeof createDetailImages === "function") {
      try {
        detailImages = await createDetailImages(decoded);
      } catch {
        // Los recortes son opcionales; la imagen completa sigue siendo util.
      }
    }

    if (
      DIRECT_SCAN_MIME_TYPES.has(sourceMimeType)
      && file.size <= PASSTHROUGH_IMAGE_BYTES
    ) {
      return originalFilePayload(file, sourceMimeType, fallbackName, detailImages);
    }

    const scale = Math.min(1, maxImageSide / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas no disponible");

    const preferredMimeType = sourceMimeType === "image/png" && file.size < 3 * 1024 * 1024
      ? "image/png"
      : sourceMimeType === "image/webp" ? "image/webp" : "image/jpeg";
    if (preferredMimeType === "image/jpeg") {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    let outputMimeType = preferredMimeType;
    let optimizedBlob = await canvasToBlob(canvas, preferredMimeType, 0.9);
    if (!optimizedBlob && preferredMimeType !== "image/jpeg") {
      outputMimeType = "image/jpeg";
      optimizedBlob = await canvasToBlob(canvas, outputMimeType, 0.9);
    }
    if (!optimizedBlob) throw new Error("No se pudo convertir la imagen.");

    const extension = outputMimeType === "image/png"
      ? "png"
      : outputMimeType === "image/webp" ? "webp" : "jpg";
    return {
      blob: optimizedBlob,
      mimeType: outputMimeType,
      fileName: `${optimizedName}.${extension}`,
      detailImages,
    };
  } catch (error) {
    if (DIRECT_SCAN_MIME_TYPES.has(sourceMimeType)) {
      return originalFilePayload(file, sourceMimeType, fallbackName, detailImages);
    }
    throw new Error(
      "El navegador no pudo convertir esta imagen. Intenta compartirla como JPG, PNG o HEIC.",
      { cause: error },
    );
  } finally {
    decoded?.release?.();
  }
};
