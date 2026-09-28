import { canvasToBlob, detectImageMimeType, loadImageSource, MAX_SCAN_IMAGE_BYTES } from './scanImageUtils.js';

export const CEDULA_PHOTO_BUCKET = 'match-cedulas';
export const MAX_CEDULA_PHOTO_BYTES = 500 * 1024;

const positiveId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Identificador de cédula inválido.');
  return id;
};

export const cedulaTournamentFolder = ({ leagueId, tournamentId }) =>
  `${positiveId(leagueId)}/${positiveId(tournamentId)}`;

export const cedulaPhotoPath = (context) =>
  `${cedulaTournamentFolder(context)}/${positiveId(context.matchId)}.jpg`;

// La copia de archivo se comprime aparte; el OCR conserva su imagen de mayor calidad.
export const compressCedulaPhoto = async (file) => {
  if (!file?.size) throw new Error('La foto está vacía.');
  if (file.size > MAX_SCAN_IMAGE_BYTES) throw new Error('La foto debe pesar menos de 12 MB.');
  if (!(await detectImageMimeType(file)).startsWith('image/')) {
    throw new Error('Selecciona una imagen válida.');
  }
  const decoded = await loadImageSource(file);
  try {
    if (!decoded.width || !decoded.height) throw new Error('La foto no tiene dimensiones válidas.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo comprimir la foto en este navegador.');
    for (const maxSide of [2200, 1900, 1600, 1400]) {
      const scale = Math.min(1, maxSide / Math.max(decoded.width, decoded.height));
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.84, 0.76, 0.68, 0.6]) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        if (blob?.size && blob.size <= MAX_CEDULA_PHOTO_BYTES && blob.type === 'image/jpeg') {
          return blob;
        }
      }
    }
    throw new Error('No se pudo reducir la foto a 500 KB. Prueba con una foto más cercana y bien iluminada.');
  } finally {
    decoded.release();
  }
};
