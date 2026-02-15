import { toPng } from 'html-to-image';

export const exportElementAsPNG = async (elementRef, fileName = 'exportacion', bgColor = '#ffffff') => {
  if (!elementRef.current) return;

  try {
    const element = elementRef.current;

    // Aseguramos que las fuentes estén cargadas antes de la captura
    await document.fonts.ready;

    // Generar la imagen con el color de fondo dinámico
    const dataUrl = await toPng(element, {
      cacheBust: true, 
      backgroundColor: bgColor, // AHORA ES DINÁMICO
      quality: 1.0,
      pixelRatio: 2, 
      style: {
        transform: 'scale(1)', 
        margin: 0,
      }
    });

    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error('Error al exportar la imagen:', error);
  }
};