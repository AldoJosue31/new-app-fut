import { removeBackground as imglyRemove } from "@imgly/background-removal";

export const removeLogoBackground = async (imageFile) => {
    try {
        // 1. Ejecución de la IA
        const aiBlob = await imglyRemove(imageFile);

        const originalUrl = URL.createObjectURL(imageFile);
        const aiUrl = URL.createObjectURL(aiBlob);

        const [originalImg, aiImg] = await Promise.all([
            loadImage(originalUrl),
            loadImage(aiUrl)
        ]);

        const width = originalImg.width;
        const height = originalImg.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(aiImg, 0, 0);
        const aiData = ctx.getImageData(0, 0, width, height);

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(originalImg, 0, 0);
        const origData = ctx.getImageData(0, 0, width, height);

        // --- MEJORA: MUESTREO DE PERÍMETRO (Entrenamiento para fondos complejos) ---
        
        // Creamos una paleta de colores basada en TODO el borde de la imagen
        const backgroundPalette = [];
        const sampleStep = 5; // Muestreamos cada 5 píxeles para cubrir todo el borde

        for (let x = 0; x < width; x += sampleStep) {
            backgroundPalette.push(getPixel(origData, x, 0, width)); // Borde superior
            backgroundPalette.push(getPixel(origData, x, height - 1, width)); // Borde inferior
        }
        for (let y = 0; y < height; y += sampleStep) {
            backgroundPalette.push(getPixel(origData, 0, y, width)); // Borde izquierdo
            backgroundPalette.push(getPixel(origData, width - 1, y, width)); // Borde derecho
        }

        // --- FLOOD FILL AVANZADO ---
        const isBackground = new Uint8Array(width * height);
        const queue = [];
        const tolerance = 38; // Tolerancia equilibrada para no invadir el logo

        // Semillas iniciales: Píxeles del borde que la IA identificó como transparentes
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    const idx = y * width + x;
                    const color = getPixel(origData, x, y, width);
                    
                    // Si la IA lo borró Y el color está en nuestra paleta de bordes
                    if (aiData.data[idx * 4 + 3] < 150 && matchesPalette(color, backgroundPalette, tolerance)) {
                        isBackground[idx] = 1;
                        queue.push(x, y);
                    }
                }
            }
        }

        // Expansión inteligente
        let head = 0;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        while (head < queue.length) {
            const cx = queue[head++];
            const cy = queue[head++];

            for (const [dx, dy] of dirs) {
                const nx = cx + dx;
                const ny = cy + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (isBackground[nIdx] === 0) {
                        const nColor = getPixel(origData, nx, ny, width);
                        
                        // Criterio de expansión: La IA debe haberlo debilitado O el color debe ser muy similar al fondo
                        const isAILikelyBackground = aiData.data[nIdx * 4 + 3] < 180;
                        const isColorLikelyBackground = matchesPalette(nColor, backgroundPalette, tolerance - 5);

                        if (isAILikelyBackground && isColorLikelyBackground) {
                            isBackground[nIdx] = 1;
                            queue.push(nx, ny);
                        }
                    }
                }
            }
        }

        // --- RECONSTRUCCIÓN FINAL ---
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            // Si NO fue marcado como fondo exterior por el algoritmo, restauramos el 100% de la opacidad original
            if (isBackground[i] === 0) {
                aiData.data[idx] = origData.data[idx];
                aiData.data[idx + 1] = origData.data[idx + 1];
                aiData.data[idx + 2] = origData.data[idx + 2];
                aiData.data[idx + 3] = origData.data[idx + 3];
            } else {
                // Es fondo real verificado, transparencia total
                aiData.data[idx + 3] = 0;
            }
        }

        URL.revokeObjectURL(originalUrl);
        URL.revokeObjectURL(aiUrl);
        ctx.putImageData(aiData, 0, 0);

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve({
                        file: new File([blob], `logo-kravitt-${imageFile.name}`, { type: "image/png" }),
                        preview: URL.createObjectURL(blob)
                    });
                } else reject(new Error("Error al generar blob"));
            }, "image/png");
        });

    } catch (error) {
        throw new Error("Error en el motor de logos: " + error.message);
    }
};

// --- HELPERS MEJORADOS ---

const getPixel = (imageData, x, y, width) => {
    const i = (y * width + x) * 4;
    return [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
};

const matchesPalette = (color, palette, tol) => {
    const r = color[0], g = color[1], b = color[2];
    for (let i = 0; i < palette.length; i++) {
        const p = palette[i];
        // Distancia euclidiana rápida
        const dist = Math.sqrt(
            (r - p[0]) ** 2 +
            (g - p[1]) ** 2 +
            (b - p[2]) ** 2
        );
        if (dist < tol) return true;
    }
    return false;
};

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};