import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDivisionStore = create(
  persist(
    (set) => ({
      // Valor inicial por defecto
      selectedDivision: 'Primera', 
      
      // Acción para cambiar división
      setDivision: (division) => set({ selectedDivision: division }),
    }),
    {
      name: 'division-storage', // Esto guarda la selección en localStorage
    }
  )
);