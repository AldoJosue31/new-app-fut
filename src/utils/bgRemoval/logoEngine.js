import { removeBackground as imglyRemove } from "@imgly/background-removal";

export const removeLogoBackground = async (imageFile) => {
    try {
        // Magia automática: la librería resuelve su propio modelo fp16 en la nube
        const blob = await imglyRemove(imageFile);
        
        return {
            file: new File([blob], `logo-sinfondo-${imageFile.name.replace(/\.[^/.]+$/, "")}.png`, { type: "image/png" }),
            preview: URL.createObjectURL(blob)
        };
    } catch (error) {
        throw new Error("Error en el motor de logos: " + error.message);
    }
};