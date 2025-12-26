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

      img.onload = () => {
        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject("No se pudo procesar la imagen");
          return;
        }

        // Dibujar imagen original
        ctx.drawImage(img, 0, 0);

        // Obtener data de píxeles
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // --- ALGORITMO FLOOD FILL (Inundación) ---
        
        // 1. Obtener el color de fondo de la esquina superior izquierda (0,0)
        const startPos = 0;
        const bgR = data[startPos];
        const bgG = data[startPos + 1];
        const bgB = data[startPos + 2];
        const bgA = data[startPos + 3];

        // Tolerancia: Qué tan parecido debe ser el color para borrarse (0-255)
        // 30-50 es un buen rango para cubrir compresiones JPG leves
        const tolerance = 50; 

        // Función para comparar colores
        const matchColor = (pos) => {
          const r = data[pos];
          const g = data[pos + 1];
          const b = data[pos + 2];
          const a = data[pos + 3];
          
          // Si ya es transparente, no coincide (ya lo procesamos o era transparente)
          if (a === 0) return false;

          // Distancia de color simple
          return (
            Math.abs(r - bgR) <= tolerance &&
            Math.abs(g - bgG) <= tolerance &&
            Math.abs(b - bgB) <= tolerance
          );
        };

        // Pila para el algoritmo (Stack) - Empezamos desde las 4 esquinas para asegurar
        // Formato: [x, y]
        const stack = [
            [0, 0], 
            [width - 1, 0], 
            [0, height - 1], 
            [width - 1, height - 1]
        ];

        // Matriz de visitados para no repetir
        const visited = new Uint8Array(width * height);

        const getPos = (x, y) => (y * width + x) * 4;

        while (stack.length > 0) {
          const [x, y] = stack.pop();
          const pos = getPos(x, y);

          // Si está fuera de límites, ya visitado o no coincide con el color de fondo -> saltar
          if (x < 0 || x >= width || y < 0 || y >= height || visited[y * width + x]) continue;
          
          visited[y * width + x] = 1; // Marcar como visitado

          if (matchColor(pos)) {
            // BORRAR PÍXEL (Hacer transparente)
            data[pos + 3] = 0;

            // Agregar vecinos a la pila (Arriba, Abajo, Izquierda, Derecha)
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
          }
        }

        // --- FIN ALGORITMO ---

        // Poner la imagen modificada de nuevo
        ctx.putImageData(imageData, 0, 0);

        // Convertir a archivo PNG
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