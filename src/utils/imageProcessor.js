// src/utils/imageProcessor.js
import "client-only";

// Load the AI engine only after the user explicitly requests background removal.
export const removeBackground = async (...args) => {
  const { removeBackground: bgEngine } = await import("./bgRemoval");
  return bgEngine(...args);
};

// Compresión ultra rápida a WebP
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

        const outputType = 'image/webp'; 

        canvas.toBlob((blob) => {
          if (blob) {
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const newFile = new File([blob], newName, {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject("Error compressing image");
          }
        }, outputType, quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
