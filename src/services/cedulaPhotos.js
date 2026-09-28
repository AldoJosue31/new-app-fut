import { CEDULA_PHOTO_BUCKET, cedulaPhotoPath, cedulaTournamentFolder, MAX_CEDULA_PHOTO_BYTES } from '../utils/cedulaPhotoUtils.js';

// Cliente explícito para usar las mismas políticas RLS en todas las operaciones.
export const loadCedulaPhoto = async (client, context) => {
  const bucket = client.storage.from(CEDULA_PHOTO_BUCKET);
  const path = cedulaPhotoPath(context);
  const name = path.split('/').at(-1);
  const { data: files, error } = await bucket.list(cedulaTournamentFolder(context), { search: name, limit: 100 });
  if (error) throw error;
  if (!files?.some(file => file.name === name)) return null;
  const { data, error: downloadError } = await bucket.download(path);
  if (downloadError) throw downloadError;
  return data;
};

export const saveCedulaPhoto = async (client, context, blob) => {
  if (!blob?.size || blob.size > MAX_CEDULA_PHOTO_BYTES || blob.type !== 'image/jpeg') {
    throw new Error('La copia de la cédula debe ser JPG y pesar hasta 500 KB.');
  }
  const { error } = await client.storage.from(CEDULA_PHOTO_BUCKET).upload(cedulaPhotoPath(context), blob, {
    contentType: 'image/jpeg', cacheControl: '0', upsert: true,
  });
  if (error) throw error;
};

export const removeCedulaPhoto = async (client, context) => {
  const { error } = await client.storage.from(CEDULA_PHOTO_BUCKET).remove([cedulaPhotoPath(context)]);
  if (error) throw error;
};

export const removeTournamentCedulaPhotos = async (client, context) => {
  const folder = cedulaTournamentFolder(context);
  const bucket = client.storage.from(CEDULA_PHOTO_BUCKET);
  // Volver a la primera página después de borrar evita saltar archivos por el offset.
  for (;;) {
    const { data, error } = await bucket.list(folder, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!data?.length) return;
    if (data.some(file => !/^\d+\.jpg$/.test(file.name))) {
      throw new Error('La carpeta de cédulas contiene un archivo inesperado.');
    }
    const { data: removed, error: removeError } = await bucket.remove(data.map(file => `${folder}/${file.name}`));
    if (removeError) throw removeError;
    if (removed?.length !== data.length) throw new Error('No se pudieron borrar todas las fotos de las cédulas. Intenta finalizar de nuevo.');
  }
};

export const deleteTournamentWithCedulas = async (client, tournamentId) => {
  const id = Number(tournamentId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('ID de torneo inválido.');
  const { data: tournament, error: lockError } = await client.from('tournaments')
    .update({ cedula_uploads_locked: true }).eq('id', id)
    .select('id, divisions!inner(league_id)').single();
  if (lockError) throw lockError;
  try {
    await removeTournamentCedulaPhotos(client, { leagueId: tournament.divisions.league_id, tournamentId: id });
    const { data: deleted, error } = await client.from('tournaments').delete().eq('id', id).select('id').single();
    if (error) throw error;
    if (!deleted?.id) throw new Error('No se pudo eliminar el torneo.');
    return { success: true };
  } catch (error) {
    // El torneo sigue disponible para reintentar si Storage falla.
    const { error: unlockError } = await client.from('tournaments').update({ cedula_uploads_locked: false }).eq('id', id);
    if (unlockError) throw new Error('La limpieza quedó pendiente. Intenta finalizar el torneo de nuevo.', { cause: error });
    throw error;
  }
};
