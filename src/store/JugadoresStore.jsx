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

  // Editar jugador
  updateJugador: async (id, updates) => {
    const currentState = get().jugadores;
    const playerToUpdate = currentState.find((p) => p.id === id);

    // 1. Manejo de borrado de foto antigua
    if (playerToUpdate && updates.photo_url && playerToUpdate.photo_url) {
        
      const oldPath = getPathFromUrl(playerToUpdate.photo_url);
      const newPath = getPathFromUrl(updates.photo_url);

      if (oldPath && newPath && oldPath !== newPath) {
        console.log("Borrando foto antigua (ruta diferente):", oldPath);
        await deleteFileFromStorage(playerToUpdate.photo_url);
        
        // Si cambia la foto, intentamos borrar también la original antigua
        if (playerToUpdate.original_photo_url) {
             const oldOrigPath = getPathFromUrl(playerToUpdate.original_photo_url);
             const newOrigPath = getPathFromUrl(updates.original_photo_url);
             if (oldOrigPath !== newOrigPath) {
                 await deleteFileFromStorage(playerToUpdate.original_photo_url);
             }
        } else if (playerToUpdate.photo_url.includes('_crop')) {
             // Intento de borrado por inferencia si no existe el campo original_photo_url
             const deducedOriginal = playerToUpdate.photo_url.replace('_crop', '_original');
             await deleteFileFromStorage(deducedOriginal);
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

  // Eliminar jugador (MEJORADO)
  deleteJugador: async (id) => {
    const currentState = get().jugadores;
    const playerToDelete = currentState.find((p) => p.id === id);

    if (playerToDelete) {
        // 1. Borrar foto principal (crop)
        if (playerToDelete.photo_url) {
          await deleteFileFromStorage(playerToDelete.photo_url);
          
          // 2. Borrar original:
          // Opción A: Si tenemos el campo explícito
          if (playerToDelete.original_photo_url) {
            await deleteFileFromStorage(playerToDelete.original_photo_url);
          } 
          // Opción B: Si no, inferimos la ruta reemplazando _crop por _original
          else if (playerToDelete.photo_url.includes('_crop')) {
            const deducedOriginal = playerToDelete.photo_url.replace('_crop', '_original');
            await deleteFileFromStorage(deducedOriginal);
          }
        }

        // 3. Borramos el registro de la base de datos
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;

        set((state) => ({
          jugadores: state.jugadores.filter((p) => p.id !== id)
        }));
    }
  }
}));

// --- UTILS ---
const getPathFromUrl = (fullUrl) => {
    if (!fullUrl || !fullUrl.includes('supabase.co')) return null;
    try {
        const bucketName = 'logos'; 
        const parts = fullUrl.split(`/${bucketName}/`);
        if (parts.length < 2) return null;
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
      if (error) console.error("Error borrando imagen:", error);
      else console.log("Imagen eliminada correctamente:", path);
    }
  } catch (err) {
    console.error("Error en deleteFileFromStorage:", err);
  }
};