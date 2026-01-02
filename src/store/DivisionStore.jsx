import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../supabase/supabase.config';

export const useDivisionStore = create(
  persist(
    (set, get) => ({
      // ESTADO
      divisiones: [],
      selectedDivision: null,
      isLoading: false,

      // ACCIONES
      fetchDivisiones: async () => {
        set({ isLoading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
             console.warn("No hay usuario autenticado");
             set({ divisiones: [], selectedDivision: null, isLoading: false });
             return;
          }

          const { data, error } = await supabase
            .from('divisions')
            .select('*, leagues!inner(owner_id)')
            .eq('leagues.owner_id', user.id)
            .order('id', { ascending: true });

          if (error) throw error;

          set({ divisiones: data });

          // Lógica para mantener o resetear la selección
          const state = get();
          if (data && data.length > 0) {
            const currentSelected = state.selectedDivision;
            const stillExists = currentSelected && data.find(d => d.id === currentSelected.id);
            
            if (!currentSelected || !stillExists) {
              set({ selectedDivision: data[0] });
            }
          } else {
            set({ selectedDivision: null });
          }

        } catch (error) {
          console.error("Error cargando divisiones:", error.message);
          set({ divisiones: [], selectedDivision: null });
        } finally {
          set({ isLoading: false });
        }
      },

      setDivision: (divisionObject) => {
        set({ selectedDivision: divisionObject });
      },

      // Esta es la función que llama App.jsx
      resetStore: () => {
        set({ divisiones: [], selectedDivision: null, isLoading: false });
      }
    }),
    {
      name: 'division-storage',
    }
  )
);