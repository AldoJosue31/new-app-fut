import { supabase } from "../supabase/supabase.config";
import { compressImage } from "./imageProcessor"; // Importamos tu función de compresión

/**
 * Sube una imagen procesada (crop) y su original a Supabase Storage,
 * APLICANDO COMPRESIÓN AUTOMÁTICA a ambos archivos.
 * * @param {File} file - El archivo recortado.
 * @param {File} originalFile - El archivo original.
 * @param {string} bucket - Nombre del bucket.
 * @param {string} folder - Carpeta base.
 * @returns {Promise<{url: string|null, originalUrl: string|null}>}
 */
export const uploadImageToSupabase = async (file, originalFile, bucket = 'logos', folder = 'teams') => {
  if (!file) return { url: null, originalUrl: null };

  try {
    // 1. PREPARACIÓN DE NOMBRES
    const fileExt = file.name.split('.').pop() || 'png';
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const fileName = `${uniqueId}_crop.${fileExt}`;
    const fileNameOriginal = `${uniqueId}_original.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // 2. COMPRESIÓN DEL CROP (La imagen final que se ve)
    // Mantenemos buena calidad (0.9) y un tamaño razonable (600px) para avatares/logos
    console.log("Comprimiendo crop...");
    const compressedFile = await compressImage(file, 600, 0.9);

    // 3. SUBIR CROP COMPRIMIDO
    const { error: errorCrop } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, { cacheControl: '3600', upsert: false });

    if (errorCrop) throw errorCrop;

    const url = supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
    let originalUrl = null;

    // 4. COMPRESIÓN Y SUBIDA DEL ORIGINAL (Si existe)
    if (originalFile) {
      console.log("Comprimiendo original...");
      // El original puede ser muy grande (4000px+), lo limitamos a 1500px para ahorrar espacio
      // pero mantenemos suficiente calidad para futuras ediciones.
      const compressedOriginal = await compressImage(originalFile, 1500, 0.85);

      const originalPath = `${folder}/${fileNameOriginal}`;
      
      const { error: errorOrig } = await supabase.storage
        .from(bucket)
        .upload(originalPath, compressedOriginal, { cacheControl: '3600', upsert: false });

      if (!errorOrig) {
        originalUrl = supabase.storage.from(bucket).getPublicUrl(originalPath).data.publicUrl;
      }
    }

    return { url, originalUrl };

  } catch (error) {
    console.error("Error en uploadImageToSupabase:", error);
    throw error;
  }
};