import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

export const removeBackground = (imageFile) => {
  return new Promise((resolve, reject) => {
    if (!imageFile) {
      reject("No hay imagen seleccionada");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = URL.createObjectURL(imageFile);

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      if (!ctx) {
        reject("No se pudo crear el canvas");
        return;
      }

      const segmentation = new SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      segmentation.setOptions({
        modelSelection: 1, // 1 = modelo más preciso
      });

      segmentation.onResults((results) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Dibujar máscara
        ctx.drawImage(results.segmentationMask, 0, 0);

        // 2. Mantener solo el sujeto
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(img, 0, 0);

        // 3. Reset
        ctx.globalCompositeOperation = "source-over";

        canvas.toBlob((blob) => {
          if (!blob) {
            reject("Error al generar la imagen");
            return;
          }

          const newFile = new File(
            [blob],
            `sin-fondo-${imageFile.name.replace(/\.[^/.]+$/, "")}.png`,
            { type: "image/png" }
          );

          resolve({
            file: newFile,
            preview: URL.createObjectURL(blob),
          });
        }, "image/png");
      });

      await segmentation.send({ image: img });
    };

    img.onerror = () => reject("Error cargando la imagen");
  });
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