import { create } from 'zustand';
import { Dark, Light } from "../styles/themes";

// Detecta el tema del sistema (con protección por si no existe window)
const getSystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// Inicializa: primero localStorage, si no existe usa el sistema
const getInitialTheme = () => {
  if (typeof window === "undefined") return getSystemTheme();

  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;

  return getSystemTheme();
};

export const useThemeStore = create((set, get) => {
  const initialTheme = getInitialTheme();

  // (Opcional) escuchar cambios del sistema SOLO si el usuario no eligió manualmente
  if (typeof window !== "undefined" && window.matchMedia) {
    const stored = localStorage.getItem("theme");

    if (stored !== "light" && stored !== "dark") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");

      const handler = (e) => {
        const newTheme = e.matches ? "dark" : "light";
        set({
          theme: newTheme,
          themeStyle: newTheme === "light" ? Light : Dark,
        });
      };

      if (mq.addEventListener) {
        mq.addEventListener("change", handler);
      } else {
        mq.addListener(handler); // navegadores antiguos
      }
    }
  }

  return {
    theme: initialTheme,
    themeStyle: initialTheme === "light" ? Light : Dark,

    setTheme: () => {
      const { theme } = get();
      const newTheme = theme === "light" ? "dark" : "light";
      const newStyle = newTheme === "light" ? Light : Dark;

      try {
        localStorage.setItem("theme", newTheme);
      } catch (e) {}

      set({
        theme: newTheme,
        themeStyle: newStyle,
      });
    },
  };
});
