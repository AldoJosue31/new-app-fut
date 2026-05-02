import { supabase } from "../supabase/supabase.config";
import { compressImage } from "./imageProcessor";

/**
 * Sube una imagen procesada (crop) y su original a Supabase Storage,
 * aplicando compresion automatica a ambos archivos.
 *
 * @param {File} file - El archivo recortado.
 * @param {File} originalFile - El archivo original.
 * @param {string} bucket - Nombre del bucket.
 * @param {string} folder - Carpeta base.
 * @param {object} options - Opciones de nombre/cache para rutas estables.
 * @returns {Promise<{url: string|null, originalUrl: string|null}>}
 */
export const uploadImageToSupabase = async (
  file,
  originalFile,
  bucket = "logos",
  folder = "teams",
  options = {}
) => {
  if (!file) return { url: null, originalUrl: null };

  try {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const fileName = options.fileName || `${uniqueId}_crop.webp`;
    const fileNameOriginal = options.originalFileName || `${uniqueId}_original.webp`;
    const filePath = `${folder}/${fileName}`;
    const uploadOptions = {
      cacheControl: options.cacheControl || "3600",
      upsert: !!options.upsert,
    };
    const addCacheBuster = (url) =>
      options.cacheBuster ? `${url}?v=${Date.now()}` : url;

    console.log("Comprimiendo crop...");
    const compressedFile = await compressImage(file, 600, 0.9);

    const { error: errorCrop } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, uploadOptions);

    if (errorCrop) throw errorCrop;

    const url = addCacheBuster(
      supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl
    );
    let originalUrl = null;

    if (originalFile) {
      console.log("Comprimiendo original...");
      const compressedOriginal = await compressImage(originalFile, 1500, 0.85);
      const originalPath = `${folder}/${fileNameOriginal}`;

      const { error: errorOrig } = await supabase.storage
        .from(bucket)
        .upload(originalPath, compressedOriginal, uploadOptions);

      if (errorOrig) {
        if (options.requireOriginal) throw errorOrig;
      } else {
        originalUrl = addCacheBuster(
          supabase.storage.from(bucket).getPublicUrl(originalPath).data.publicUrl
        );
      }
    }

    return { url, originalUrl };
  } catch (error) {
    console.error("Error en uploadImageToSupabase:", error);
    throw error;
  }
};
