export const removePersonBackground = async (imageFile) => {
    try {
        const { removeBackground: imglyRemove } = await import("@imgly/background-removal");
        // Al NO pasarle configuración, la librería usa su propio CDN oficial automáticamente
        const blob = await imglyRemove(imageFile);
        
        return {
            file: new File([blob], `jugador-sinfondo-${imageFile.name.replace(/\.[^/.]+$/, "")}.png`, { type: "image/png" }),
            preview: URL.createObjectURL(blob)
        };
    } catch (error) {
        throw new Error("Error en el motor de jugadores: " + error.message);
    }
};
