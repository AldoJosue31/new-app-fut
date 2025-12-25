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
          // 1. Obtenemos el usuario actual autenticado
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
             console.warn("No hay usuario autenticado");
             set({ divisiones: [], selectedDivision: null, isLoading: false });
             return;
          }

          // 2. CORRECCIÓN: Filtramos usando la relación con 'leagues'
          // Seleccionamos divisiones DONDE la liga asociada tenga como owner_id al usuario actual
          const { data, error } = await supabase
            .from('divisions')
            .select('*, leagues!inner(owner_id)') // !inner fuerza que cumpla la condición
            .eq('leagues.owner_id', user.id)       // Filtro por usuario logueado
            .order('id', { ascending: true });

          if (error) throw error;

          set({ divisiones: data });

          // LÓGICA DE PERSISTENCIA (Mantenida igual, ahora es segura)
          const state = get();
          if (data && data.length > 0) {
            const currentSelected = state.selectedDivision;
            // Verificamos que la división seleccionada anteriormente siga existiendo en la nueva lista filtrada
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

      resetStore: () => {
        set({ divisiones: [], selectedDivision: null, isLoading: false });
      }
    }),
    {
      name: 'division-storage',
    }
  )
);