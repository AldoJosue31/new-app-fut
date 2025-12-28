export const removeBackground = (imageFile) => {
  return new Promise((resolve, reject) => {
    if (!imageFile) {
      reject("No hay imagen seleccionada");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject("No se pudo procesar la imagen");
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // --- 1. DETECCIÓN INTELIGENTE DEL COLOR DE FONDO ---
        // Muestreamos las 4 esquinas para determinar el color dominante del fondo
        const corners = [0, (width - 1) * 4, (height - 1) * width * 4, (width * height - 1) * 4];
        const colorCounts = {};
        let dominantColor = { r: data[0], g: data[1], b: data[2], count: 0 };

        corners.forEach(pos => {
            const key = `${data[pos]},${data[pos+1]},${data[pos+2]}`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
            if (colorCounts[key] > dominantColor.count) {
                dominantColor = { r: data[pos], g: data[pos+1], b: data[pos+2], count: colorCounts[key] };
            }
        });

        const bgR = dominantColor.r;
        const bgG = dominantColor.g;
        const bgB = dominantColor.b;

        // Tolerancia dinámica (ajustable)
        const tolerance = 60; 

        // --- 2. ALGORITMO DE INUNDACIÓN (Flood Fill) MEJORADO ---
        // Stack inicial con todos los píxeles del borde que coincidan con el fondo
        const stack = [];
        const visited = new Uint8Array(width * height); // 0: no visitado, 1: visitado

        // Función auxiliar para verificar coincidencia de color
        const matchColor = (pos) => {
          const r = data[pos], g = data[pos + 1], b = data[pos + 2], a = data[pos + 3];
          return a !== 0 && 
                 Math.abs(r - bgR) <= tolerance &&
                 Math.abs(g - bgG) <= tolerance &&
                 Math.abs(b - bgB) <= tolerance;
        };

        // Escanear bordes para encontrar puntos de inicio
        for (let x = 0; x < width; x++) {
            [0, height - 1].forEach(y => {
                const pos = (y * width + x) * 4;
                if (matchColor(pos)) stack.push([x, y]);
            });
        }
        for (let y = 0; y < height; y++) {
            [0, width - 1].forEach(x => {
                const pos = (y * width + x) * 4;
                if (matchColor(pos)) stack.push([x, y]);
            });
        }

        // Ejecutar Flood Fill
        while (stack.length > 0) {
          const [x, y] = stack.pop();
          const offset = y * width + x;
          const pos = offset * 4;

          if (x < 0 || x >= width || y < 0 || y >= height || visited[offset]) continue;
          visited[offset] = 1;

          if (matchColor(pos)) {
            data[pos + 3] = 0; // Hacer transparente

            // Agregar vecinos (4 direcciones)
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          }
        }

        // --- 3. SUAVIZADO DE BORDES (Anti-aliasing simple) ---
        // Iteramos para encontrar píxeles opacos vecinos de transparentes y reducir su opacidad
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const pos = (y * width + x) * 4;
                if (data[pos + 3] > 0) { // Si es visible
                    // Contar vecinos transparentes
                    let transparentNeighbors = 0;
                    if (data[((y-1)*width+x)*4 + 3] === 0) transparentNeighbors++;
                    if (data[((y+1)*width+x)*4 + 3] === 0) transparentNeighbors++;
                    if (data[(y*width+(x-1))*4 + 3] === 0) transparentNeighbors++;
                    if (data[(y*width+(x+1))*4 + 3] === 0) transparentNeighbors++;

                    if (transparentNeighbors > 0) {
                        data[pos + 3] = 255 - (transparentNeighbors * 60); // Difuminar borde
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File(
                [blob], 
                "sin-fondo-" + imageFile.name.replace(/\.[^/.]+$/, "") + ".png", 
                { type: "image/png" }
            );
            resolve({ 
              file: newFile, 
              preview: URL.createObjectURL(blob) 
            });
          } else {
            reject("Error al generar archivo");
          }
        }, 'image/png');
      };
      img.onerror = (err) => reject(err);
    };
  });
};