import { create } from 'zustand';
import { supabase } from '../supabase/supabase.config';

export const useEquiposStore = create((set, get) => ({
  equipos: [],
  loading: false,
  cachedDivisionId: null, // Guardamos el ID de la última división cargada

  fetchEquipos: async (divisionId) => {
    const { cachedDivisionId, equipos } = get();

    // LÓGICA INTELEGENTE:
    // Si la división solicitada es la misma que ya tenemos en memoria
    // Y hay equipos cargados, NO hacemos nada (mostramos lo que hay al instante).
    if (divisionId === cachedDivisionId && equipos.length > 0) {
      return; 
    }

    // Si es una división diferente, activamos skeletons y pedimos datos
    set({ loading: true, cachedDivisionId: divisionId, equipos: [] });

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
    } finally {
      set({ loading: false });
    }
  },

  // ACCIONES CRUD PARA ACTUALIZAR LA LISTA SIN RECARGAR (SIN SKELETONS)
  
  // Agregar un equipo manualmente a la lista local
  addEquipoLocal: (team) => set((state) => ({ 
    equipos: [...state.equipos, team].sort((a, b) => a.name.localeCompare(b.name)) 
  })),

  // Actualizar un equipo manualmente en la lista local
  updateEquipoLocal: (updatedTeam) => set((state) => ({
    equipos: state.equipos.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
  })),

  // Eliminar un equipo manualmente de la lista local
  deleteEquipoLocal: (id) => set((state) => ({
    equipos: state.equipos.filter((t) => t.id !== id)
  })),
}));