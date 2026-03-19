// src/utils/imageProcessor.js
import { removeBackground as bgEngine } from "./bgRemoval";

// 1. Exportamos el motor modularizado de IA
export const removeBackground = bgEngine;

// Dummy para evitar el error de importación en tus otras pantallas (Equipos.jsx, etc)
export const preloadBackgroundRemoval = () => {
  console.log("Motor IA @imgly (Vía CDN) listo para usarse.");
};

// 2. Compresión ultra rápida a WebP
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