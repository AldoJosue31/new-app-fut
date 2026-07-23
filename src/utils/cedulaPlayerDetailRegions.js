export const CEDULA_PLAYER_DETAIL_VERSION = "cedula-player-details-v1";

const boundedDimension = (value) => {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Recortes superpuestos de las dos tablas de jugadores del formato A4.
 * Conservan encabezados y columnas GOL/TA/TR para que el modelo pueda seguir
 * cada renglon sin perder la referencia de equipo de la imagen completa.
 */
export const getCedulaPlayerDetailRegions = (imageWidth, imageHeight) => {
  const width = boundedDimension(imageWidth);
  const height = boundedDimension(imageHeight);
  if (!width || !height) return [];

  const landscape = width > height;
  const topRatio = landscape ? 0.05 : 0.1;
  const heightRatio = landscape ? 0.86 : 0.73;
  const top = Math.max(0, Math.floor(height * topRatio));
  const cropHeight = Math.min(height - top, Math.max(1, Math.ceil(height * heightRatio)));
  const overlap = Math.max(2, Math.ceil(width * 0.08));
  const halfWidth = Math.ceil(width / 2);

  return [
    {
      id: "first-player-table",
      label: "Detalle ampliado del primer bloque visual de jugadores (izquierda).",
      x: 0,
      y: top,
      width: Math.min(width, halfWidth + overlap),
      height: cropHeight,
    },
    {
      id: "second-player-table",
      label: "Detalle ampliado del segundo bloque visual de jugadores (derecha).",
      x: Math.max(0, halfWidth - overlap),
      y: top,
      width: Math.min(width - Math.max(0, halfWidth - overlap), halfWidth + overlap),
      height: cropHeight,
    },
  ];
};
