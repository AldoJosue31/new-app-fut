import { create } from 'zustand';
import { supabase } from '../supabase/supabase.config';

export const useJugadoresStore = create((set, get) => ({
  jugadores: [],
  isLoading: false,

  // MODIFICADO: Ahora recibe 'isActive' para alternar vistas (Activos/Inactivos)
  fetchJugadores: async (teamId, isActive = true) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', isActive) // Filtro estricto
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
    const payload = { ...playerData, is_active: true }; // Siempre nace activo
    const { error, data } = await supabase.from('players').insert(payload).select();
    
    if (error) throw error;
    
    // Solo actualizamos el estado si estamos viendo la lista de activos
    // (Esto evita inconsistencias visuales)
    set((state) => ({ jugadores: [...state.jugadores, data[0]] }));
    return data[0];
  },

  // Editar jugador
  updateJugador: async (id, updates) => {
    const currentState = get().jugadores;
    const playerToUpdate = currentState.find((p) => p.id === id);

    // Lógica de imágenes (Mantenida)
    if (playerToUpdate && updates.photo_url && playerToUpdate.photo_url) {
      const oldPath = getPathFromUrl(playerToUpdate.photo_url);
      const newPath = getPathFromUrl(updates.photo_url);

      if (oldPath && newPath && oldPath !== newPath) {
        await deleteFileFromStorage(playerToUpdate.photo_url);
        if (playerToUpdate.original_photo_url) {
             const oldOrigPath = getPathFromUrl(playerToUpdate.original_photo_url);
             const newOrigPath = getPathFromUrl(updates.original_photo_url);
             if (oldOrigPath !== newOrigPath) await deleteFileFromStorage(playerToUpdate.original_photo_url);
        } else if (playerToUpdate.photo_url.includes('_crop')) {
             await deleteFileFromStorage(playerToUpdate.photo_url.replace('_crop', '_original'));
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
    return data[0];
  },

  // Eliminar jugador
  deleteJugador: async (id) => {
    const currentState = get().jugadores;
    const playerToDelete = currentState.find((p) => p.id === id);

    try {
        const { error } = await supabase.from('players').delete().eq('id', id);
        
        if (error) {
            // Error de llave foránea (409 Conflict)
            if (error.code === '23503' || error.status === 409) {
                return { success: false, error: 'CONFLICT', message: 'El jugador tiene estadísticas asociadas.' };
            }
            throw error;
        }

        // Borrar fotos
        if (playerToDelete) {
             if (playerToDelete.photo_url) await deleteFileFromStorage(playerToDelete.photo_url);
             if (playerToDelete.photo_url?.includes('_crop')) {
                 await deleteFileFromStorage(playerToDelete.photo_url.replace('_crop', '_original'));
             }
        }

        set((state) => ({
          jugadores: state.jugadores.filter((p) => p.id !== id)
        }));
        
        return { success: true };

    } catch (err) {
        console.error("Error crítico eliminando:", err);
        return { success: false, error: 'UNKNOWN', message: err.message };
    }
  },

  // Inhabilitar (Archivar)
  archivarJugador: async (id) => {
      try {
          const { error } = await supabase
            .from('players')
            .update({ is_active: false })
            .eq('id', id);

          if (error) throw error;

          // Lo quitamos de la lista actual
          set((state) => ({
              jugadores: state.jugadores.filter((p) => p.id !== id)
          }));
          return { success: true };
      } catch (err) {
          return { success: false, message: err.message };
      }
  },

  // NUEVO: Restaurar Jugador
  restaurarJugador: async (id) => {
      try {
          const { error } = await supabase
            .from('players')
            .update({ is_active: true })
            .eq('id', id);

          if (error) throw error;

          // Lo quitamos de la lista de "Archivados"
          set((state) => ({
              jugadores: state.jugadores.filter((p) => p.id !== id)
          }));
          return { success: true };
      } catch (err) {
          return { success: false, message: err.message };
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
    } catch (e) { return null; }
};

const deleteFileFromStorage = async (fullUrl) => {
  try {
    const path = getPathFromUrl(fullUrl);
    if (path) {
      await supabase.storage.from('logos').remove([path]);
    }
  } catch (err) { console.error("Error file delete:", err); }
};