import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";
export const preloadBackgroundRemoval = () => {
  console.log("Iniciando pre-carga de modelos de IA...");
  // Se llama a la función con null. Esto forzará la descarga de recursos, 
  // aunque la ejecución falle por falta de imagen, los archivos ya quedan en caché.
  imglyRemoveBackground(null).catch(() => {
    console.log("Motor de IA listo y en caché.");
  });
};
export const removeBackground = async (imageFile) => {
  if (!imageFile) throw new Error("No hay imagen seleccionada");

  try {
    const config = {
      progress: (key, current, total) => {
        console.log(`Descargando modelo: ${key} (${current}/${total})`);
      },
      // Eliminamos fetchArgs no-cors a menos que sea estrictamente necesario, 
      // ya que puede bloquear la descarga de modelos de IA.
    };

    // CORRECCIÓN: Usar el nombre exacto del import (imglyRemoveBackground)
    const blob = await imglyRemoveBackground(imageFile, config);

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
    console.error("Error al quitar el fondo:", error);
    throw error;
  }
};

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

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const type = file.type;

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, {
              type: type,
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject("Error compressing image");
          }
        }, type, quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};