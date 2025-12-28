import { create } from 'zustand';
import { supabase } from '../supabase/supabase.config';

export const useJugadoresStore = create((set, get) => ({
  jugadores: [],
  isLoading: false,

  // Obtener jugadores
  fetchJugadores: async (teamId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('dorsal', { ascending: true });

      if (error) throw error;
      set({ jugadores: data });
    } catch (error) {
      console.error("Error al obtener jugadores:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Agregar jugador
  addJugador: async (playerData) => {
    const { error, data } = await supabase.from('players').insert(playerData).select();
    if (error) throw error;
    set((state) => ({ jugadores: [...state.jugadores, data[0]] }));
  },

  // Editar jugador (CORREGIDO: Limpieza inteligente)
  updateJugador: async (id, updates) => {
    const currentState = get().jugadores;
    const playerToUpdate = currentState.find((p) => p.id === id);

    // 1. Manejo de borrado de foto antigua
    if (playerToUpdate && updates.photo_url && playerToUpdate.photo_url) {
        
      // Extraemos solo la RUTA del archivo (ignorando ?t=timestamp)
      const oldPath = getPathFromUrl(playerToUpdate.photo_url);
      const newPath = getPathFromUrl(updates.photo_url);

      // --- CORRECCIÓN CLAVE ---
      // SOLO borramos si las rutas son DIFERENTES (ej. cambio de 'image_123.png' a 'player_10_crop.png')
      // Si son iguales (mismo archivo sobrescrito), NO borramos nada.
      if (oldPath && newPath && oldPath !== newPath) {
        console.log("Borrando foto antigua (ruta diferente):", oldPath);
        await deleteFileFromStorage(playerToUpdate.photo_url);
        
        // Si usas original_photo_url y cambia la ruta base, también deberías borrar el original viejo
        if (playerToUpdate.original_photo_url) {
             const oldOrigPath = getPathFromUrl(playerToUpdate.original_photo_url);
             const newOrigPath = getPathFromUrl(updates.original_photo_url);
             if (oldOrigPath !== newOrigPath) {
                 await deleteFileFromStorage(playerToUpdate.original_photo_url);
             }
        }
      }
    }

    const { error, data } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    set((state) => ({
      jugadores: state.jugadores.map((p) => (p.id === id ? data[0] : p))
    }));
  },

  // Eliminar jugador (Con limpieza de Storage)
  deleteJugador: async (id) => {
    const currentState = get().jugadores;
    const playerToDelete = currentState.find((p) => p.id === id);

    // 1. Si el jugador tiene foto, la borramos del bucket
    if (playerToDelete?.photo_url) {
      await deleteFileFromStorage(playerToDelete.photo_url);
    }
    // Borrar también la original si existe
    if (playerToDelete?.original_photo_url) {
      await deleteFileFromStorage(playerToDelete.original_photo_url);
    }

    // 2. Borramos el registro de la base de datos
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      jugadores: state.jugadores.filter((p) => p.id !== id)
    }));
  }
}));

// --- UTILS ---

// Extrae la ruta limpia del archivo (sin dominio ni query params)
const getPathFromUrl = (fullUrl) => {
    if (!fullUrl || !fullUrl.includes('supabase.co')) return null;
    try {
        const bucketName = 'logos'; 
        // Dividimos por el nombre del bucket para obtener la ruta relativa
        const parts = fullUrl.split(`/${bucketName}/`);
        if (parts.length < 2) return null;
        
        // Quitamos query params (ej: ?t=12345) para comparar solo el archivo
        return parts[1].split('?')[0];
    } catch (e) {
        return null;
    }
};

const deleteFileFromStorage = async (fullUrl) => {
  try {
    const path = getPathFromUrl(fullUrl);
    if (path) {
      const { error } = await supabase.storage.from('logos').remove([path]);
      if (error) console.error("Error borrando imagen antigua:", error);
      else console.log("Imagen eliminada correctamente:", path);
    }
  } catch (err) {
    console.error("Error en deleteFileFromStorage:", err);
  }
};