import { toBlob, toPng } from 'html-to-image';

export const exportElementAsPNG = async (elementRef, fileName = 'exportacion', bgColor = '#ffffff') => {
  if (!elementRef.current) {
    throw new Error('No se encontro el elemento a exportar.');
  }

  const placeholderSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="32" fill="#e2e8f0" />
      <circle cx="32" cy="24" r="12" fill="#94a3b8" />
      <path d="M14 54c4-10 14-16 18-16s14 6 18 16" fill="#94a3b8" />
    </svg>
  `;

  const exportOptions = {
    cacheBust: true,
    backgroundColor: bgColor,
    quality: 1.0,
    pixelRatio: 2,
    imagePlaceholder: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg)}`,
    style: {
      transform: 'scale(1)',
      margin: 0,
    }
  };

  try {
    const element = elementRef.current;
    await document.fonts.ready;

    const blob = await toBlob(element, exportOptions);
    if (blob) {
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.download = `${fileName}.png`;
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    }

    const dataUrl = await toPng(element, exportOptions);
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error al exportar la imagen:', error);
    throw error;
  }
};
