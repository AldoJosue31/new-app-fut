import { toPng } from 'html-to-image';

export const exportElementAsPNG = async (
  elementRef,
  fileName = 'exportacion',
  bgColor = '#ffffff'
) => {
  if (!elementRef.current) return null;

  try {
    const element = elementRef.current;
    const safeFileName = String(fileName || 'exportacion').replace(/\.png$/i, '');
    const transparentFallback =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="100%" height="100%" fill="transparent"/></svg>'
      );

    if (document?.fonts?.ready) {
      await document.fonts.ready;
    }

    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: bgColor,
      quality: 1.0,
      pixelRatio: 2,
      imagePlaceholder: transparentFallback,
      style: {
        transform: 'scale(1)',
        margin: 0,
      },
    });

    const link = document.createElement('a');
    link.download = `${safeFileName}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
    document.body.removeChild(link);

    return dataUrl;
  } catch (error) {
    console.error('Error al exportar la imagen:', error);
    throw error;
  }
};
