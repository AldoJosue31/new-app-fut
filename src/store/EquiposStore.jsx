import { create } from 'zustand';
import { supabase } from '../supabase/supabase.config';

export const useEquiposStore = create((set, get) => ({
  equipos: [],
  loading: false,
  cachedDivisionId: null,

  fetchEquipos: async (divisionId) => {
    const { cachedDivisionId, equipos } = get();

    // Si ya tenemos los datos de esta división en memoria, no recargamos
    if (divisionId === cachedDivisionId && equipos.length > 0) {
      return; 
    }

    set({
      loading: true,
      cachedDivisionId: divisionId,
      equipos: [],
    });

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('division_id', divisionId)
        .order('name', { ascending: true });

      if (error) throw error;
      set({ equipos: data });
    } catch (error) {
      console.error("Error fetching equipos:", error);
      // En caso de error, aseguramos que loading sea false
      set({ equipos: [] });
    } finally {
      set({ loading: false });
    }
  },

  // ACCIONES LOCALES
  addEquipoLocal: (team) => set((state) => ({ 
    equipos: [...state.equipos, team].sort((a, b) => a.name.localeCompare(b.name)) 
  })),

  updateEquipoLocal: (updatedTeam) => set((state) => ({
    equipos: state.equipos.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
  })),

  deleteEquipoLocal: (id) => set((state) => ({
    equipos: state.equipos.filter((t) => t.id !== id)
  })),

  // NUEVA FUNCIÓN: Limpieza total del store (para el Logout)
  resetStore: () => set({ equipos: [], loading: false, cachedDivisionId: null }),
}));
