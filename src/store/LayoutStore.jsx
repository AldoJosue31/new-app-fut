import { create } from "zustand";

export const useLayoutStore = create((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (nextValue) =>
    set((state) => ({
      sidebarOpen:
        typeof nextValue === "function"
          ? Boolean(nextValue(state.sidebarOpen))
          : Boolean(nextValue),
    })),
}));
