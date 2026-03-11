import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../supabase/supabase.config';

export const useDivisionStore = create(
  persist(
    (set, get) => ({
      // ESTADO
      categorias: [],
      divisiones: [],
      selectedDivision: null,
      isLoading: false,

      // ACCIONES
      fetchDivisiones: async () => {
        set({ isLoading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
             set({ categorias: [], divisiones: [], selectedDivision: null, isLoading: false });
             return;
          }

          // 1. Traer Categorías
          const { data: catData, error: catError } = await supabase
            .from('categories')
            .select('*, leagues!inner(owner_id)')
            .eq('leagues.owner_id', user.id)
            .order('tier', { ascending: true });

          if (catError) throw catError;

          // 2. Traer Divisiones con el nombre de su Categoría anidado
          const { data: divData, error: divError } = await supabase
            .from('divisions')
            .select('*, categories(name), leagues!inner(owner_id)')
            .eq('leagues.owner_id', user.id)
            .order('tier', { ascending: true });

          if (divError) throw divError;

          set({ categorias: catData, divisiones: divData });

          // Autoseleccionar si no hay nada seleccionado
          const state = get();
          if (divData && divData.length > 0) {
            const currentSelected = state.selectedDivision;
            const stillExists = currentSelected && divData.find(d => d.id === currentSelected.id);
            if (!currentSelected || !stillExists) {
              set({ selectedDivision: divData[0] });
            }
          } else {
            set({ selectedDivision: null });
          }
        } catch (error) {
          console.error("Error cargando estructura:", error.message);
          set({ categorias: [], divisiones: [], selectedDivision: null });
        } finally {
          set({ isLoading: false });
        }
      },

      setDivision: (divisionObject) => {
        set({ selectedDivision: divisionObject });
      },

      // --- ESTA ES LA FUNCIÓN QUE FALTABA ---
      // Reordenar jerarquías (Drag & Drop)
      updateDivisionTiers: async (reorderedDivisions) => {
        const previousDivisions = get().divisiones;
        // Optimistic update para la vista
        set({ divisiones: reorderedDivisions });

        try {
          const updates = reorderedDivisions.map((div) => ({
            id: div.id,
            league_id: div.league_id,
            name: div.name,
            category_id: div.category_id, // Apuntando a la nueva llave foránea
            tier: div.tier 
          }));

          const { error } = await supabase
            .from('divisions')
            .upsert(updates, { onConflict: 'id' });

          if (error) throw error;
        } catch (error) {
          console.error("Error actualizando jerarquías:", error);
          // Revertir si hay error en base de datos
          set({ divisiones: previousDivisions });
        }
      },

      resetStore: () => {
        set({ categorias: [], divisiones: [], selectedDivision: null, isLoading: false });
      }
    }),
    {
      name: 'division-storage',
    }
  )
);