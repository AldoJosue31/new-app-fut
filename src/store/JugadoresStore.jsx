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

  // Editar jugador (Con limpieza de Storage)
  updateJugador: async (id, updates) => {
    const currentState = get().jugadores;
    const playerToUpdate = currentState.find((p) => p.id === id);

    // Lógica para borrar foto antigua si se subió una nueva
    if (playerToUpdate && updates.photo_url && playerToUpdate.photo_url) {
      // Si la URL nueva es diferente a la vieja, borramos la vieja
      if (updates.photo_url !== playerToUpdate.photo_url) {
        await deleteFileFromStorage(playerToUpdate.photo_url);
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

    // 1. Si el jugador tiene foto, la borramos del bucket primero
    if (playerToDelete?.photo_url) {
      await deleteFileFromStorage(playerToDelete.photo_url);
    }

    // 2. Borramos el registro de la base de datos
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      jugadores: state.jugadores.filter((p) => p.id !== id)
    }));
  }
}));

// --- FUNCIÓN AUXILIAR PARA BORRAR DEL BUCKET ---
// Extrae la ruta relativa del archivo desde la URL completa de Supabase
const deleteFileFromStorage = async (fullUrl) => {
  try {
    // Verificamos que sea una URL de Supabase para no intentar borrar imágenes externas (ej. placehold.co)
    if (!fullUrl.includes('supabase.co')) return;

    // Supongamos que tu URL es: 
    // https://xyz.supabase.co/storage/v1/object/public/logos/players/123.jpg
    // Necesitamos extraer: "players/123.jpg"
    
    // Ajusta 'logos' al nombre real de tu bucket si es diferente
    const bucketName = 'logos'; 
    const path = fullUrl.split(`/${bucketName}/`)[1];

    if (path) {
      const { error } = await supabase.storage.from(bucketName).remove([path]);
      if (error) console.error("Error borrando imagen antigua del storage:", error);
      else console.log("Imagen antigua eliminada correctamente:", path);
    }
  } catch (err) {
    console.error("Error procesando eliminación de archivo:", err);
  }
};