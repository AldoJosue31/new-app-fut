import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { supabase } from '../lib/supabase/browserClient.js';
import { compressCedulaPhoto } from '../utils/cedulaPhotoUtils.js';
import { loadCedulaPhoto, removeCedulaPhoto, saveCedulaPhoto } from '../services/cedulaPhotos.js';

export function useMatchCedulaPhoto({ isOpen, matchId, tournament, client = supabase }) {
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const contextRef = useRef(null);
  const photoRef = useRef(null);
  const generationRef = useRef(0);
  const busyRef = useRef(false);
  const urlRef = useRef('');

  const updatePhoto = useCallback((blob, pending) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = blob ? URL.createObjectURL(blob) : '';
    const nextPhoto = blob ? { blob, url: urlRef.current, pending } : null;
    photoRef.current = nextPhoto;
    setPhoto(nextPhoto);
  }, []);

  const initialize = useEffectEvent(async (generation) => {
    contextRef.current = null;
    updatePhoto(null, false);
    setError('');
    busyRef.current = Boolean(isOpen && matchId && tournament?.id);
    setBusy(busyRef.current);
    if (!busyRef.current) return;
    try {
      let leagueId = tournament.division?.league_id || tournament.divisions?.league_id || tournament.league_id;
      if (!leagueId) {
        const { data, error: divisionError } = await client.from('divisions').select('league_id').eq('id', tournament.division_id).single();
        if (divisionError) throw divisionError;
        leagueId = data.league_id;
      }
      const context = { leagueId, tournamentId: tournament.id, matchId };
      const blob = await loadCedulaPhoto(client, context);
      if (generation !== generationRef.current) return;
      contextRef.current = context;
      updatePhoto(blob, false);
    } catch (loadError) {
      if (generation === generationRef.current) setError('No se pudo cargar la cédula: ' + loadError.message);
    } finally {
      if (generation === generationRef.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  });

  useEffect(() => {
    const generation = ++generationRef.current;
    void initialize(generation);
    return () => {
      generationRef.current += 1;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = '';
    };
  }, [isOpen, matchId, tournament?.id, client]);

  const runOperation = useCallback(async (operation) => {
    if (busyRef.current) throw new Error('Espera a que termine de procesarse la foto.');
    if (!contextRef.current) throw new Error('No se pudo cargar el archivo de cédulas. Cierra y vuelve a abrir el partido.');
    const generation = generationRef.current;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await operation(contextRef.current, generation);
    } catch (operationError) {
      if (generation === generationRef.current) setError(operationError.message);
      throw operationError;
    } finally {
      if (generation === generationRef.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, []);

  const selectFile = useCallback((file) => runOperation(async (_context, generation) => {
    const blob = await compressCedulaPhoto(file);
    if (generation === generationRef.current) updatePhoto(blob, true);
  }), [runOperation, updatePhoto]);

  const save = useCallback(async () => {
    if (!photoRef.current?.pending) return;
    await runOperation(async (context, generation) => {
      const blob = photoRef.current.blob;
      await saveCedulaPhoto(client, context, blob);
      if (generation === generationRef.current) updatePhoto(blob, false);
    });
  }, [runOperation, updatePhoto, client]);

  const remove = useCallback(() => runOperation(async (context, generation) => {
    // También borra la copia previa si se había seleccionado una sustitución.
    await removeCedulaPhoto(client, context);
    if (generation === generationRef.current) updatePhoto(null, false);
  }), [runOperation, updatePhoto, client]);

  return { photo, busy, error, selectFile, save, remove };
}
