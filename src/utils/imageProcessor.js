// src/utils/imageProcessor.js
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

/**
 * Resuelve un publicPath potencialmente relativo a una URL absoluta segura.
 * - Si ya es absoluto (tiene esquema), se devuelve tal cual.
 * - Si empieza con '//' añade el protocolo actual.
 * - Si empieza con '/' lo resuelve contra window.location.origin.
 * - Si es relativo lo resuelve contra document.baseURI.
 */
const resolvePublicPath = (p) => {
  if (!p) return p;
  try {
    // esquema (http:, https:, data:, etc.)
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(p)) return p;
    if (p.startsWith('//')) return `${window.location.protocol}${p}`;
    if (p.startsWith('/')) {
      // asegurar una sola barra final
      return `${window.location.origin}${p.replace(/\/?$/, '/')}`;
    }
    // ruta relativa -> resuelve contra base del documento
    return new URL(p, document.baseURI).href;
  } catch (e) {
    // fallback: devolver lo que vino y dejar que la librería lance el error si no puede
    console.warn("resolvePublicPath fallo, usando raw path:", p, e);
    return p;
  }
};

// Valida que la IA devolvió un blob OK
const validateBlob = (blob) => {
  if (!blob || blob.size === 0) throw new Error("La IA generó una imagen vacía.");
  return blob;
};

export const preloadBackgroundRemoval = () => {
  console.log("Pre-cargando IA desde local...");
  try {
    const config = { publicPath: resolvePublicPath("/imgly-static/") };
    // Nota: la librería puede rechazar; lo capturamos con catch
    imglyRemoveBackground(null, config).catch(() => {});
  } catch (e) {
    /* ignorar errores de precarga */
  }
};

export const removeBackground = async (imageFile) => {
  if (!imageFile) throw new Error("No hay imagen seleccionada");

  // base config (sin publicPath todavía)
  const baseConfig = {
    debug: true,
    progress: (key, current, total) => {
      if (total > 0) {
        const percent = Math.round((current / total) * 100);
        if (percent % 20 === 0) console.log(`Procesando IA: ${percent}%`);
      }
    },
  };

  // intentos: 1) usar alias local (resuelto a URL absoluta), 2) CDN
  try {
    const configLocal = {
      ...baseConfig,
      publicPath: resolvePublicPath("/imgly-static/"),
    };

    // Llamada principal (usa publicPath absoluto)
    const blob = await imglyRemoveBackground(imageFile, configLocal);
    validateBlob(blob);

    const newFile = new File(
      [blob],
      `sin-fondo-${imageFile.name.replace(/\.[^/.]+$/, "")}.png`,
      { type: "image/png" }
    );

    return {
      file: newFile,
      preview: URL.createObjectURL(blob),
    };
  } catch (error) {
    console.error("Error removeBackground:", error);

    // Si fue fallo por base URL inválida o por fetch/404, intentar CDN de respaldo
    const message = (error && (error.message || "")).toLowerCase();
    if (
      message.includes("invalid base url") ||
      message.includes("invalid url") ||
      message.includes("fetch") ||
      message.includes("404") ||
      message.includes("failed to fetch")
    ) {
      console.warn("Fallo local (o URL inválida), intentando CDN de respaldo...");
      try {
        return await removeBackgroundWithCDN(imageFile);
      } catch (cdnErr) {
        console.error("También falló CDN de respaldo:", cdnErr);
        throw cdnErr;
      }
    }

    throw error;
  }
};

const removeBackgroundWithCDN = async (imageFile) => {
  // CDN público (ya es absoluta)
  const config = {
    publicPath: "https://unpkg.com/@imgly/background-removal-data@1.4.2/dist/",
    debug: true,
  };

  const blob = await imglyRemoveBackground(imageFile, config);
  validateBlob(blob);

  return {
    file: new File([blob], `sin-fondo-cdn-${imageFile.name.replace(/\.[^/.]+$/, "")}.png`, {
      type: "image/png",
    }),
    preview: URL.createObjectURL(blob),
  };
};

/**
 * CAMBIOS REALIZADOS:
 * 1. Forzamos la salida a 'image/webp'.
 * 2. Cambiamos la extensión del archivo a .webp.
 * 3. Ahora el parámetro 'quality' SÍ funcionará para imágenes con transparencia.
 */
export const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("No file provided");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Lógica de redimensionamiento (mantenida igual)
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Dibujar la imagen
        ctx.drawImage(img, 0, 0, width, height);

        // --- AQUÍ ESTÁ LA MAGIA DE LA COMPRESIÓN ---
        // Forzamos WebP para soportar transparencia + compresión alta
        const outputType = 'image/webp'; 

        canvas.toBlob((blob) => {
          if (blob) {
            // Cambiamos la extensión del nombre a .webp
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            
            const newFile = new File([blob], newName, {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject("Error compressing image");
          }
        }, outputType, quality); // Ahora quality (0.8) sí afecta al peso
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};