import { create } from "zustand";

import { Dark, Light } from "../styles/themes";

const getSystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getStoredTheme = () => {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
};

const toThemeState = (theme) => ({
  theme,
  themeStyle: theme === "light" ? Light : Dark,
});

export const useThemeStore = create((set, get) => ({
  hasHydrated: false,
  theme: "light",
  themeStyle: Light,

  setTheme: () => {
    const newTheme = get().theme === "light" ? "dark" : "light";

    try {
      window.localStorage.setItem("theme", newTheme);
    } catch {
      // localStorage can be unavailable in private browser contexts.
    }

    set({
      ...toThemeState(newTheme),
      hasHydrated: true,
    });
  },
}));

export const initializeThemeStore = () => {
  if (typeof window === "undefined") return undefined;

  const storedTheme = getStoredTheme();
  useThemeStore.setState({
    ...toThemeState(storedTheme || getSystemTheme()),
    hasHydrated: true,
  });

  if (storedTheme || !window.matchMedia) return undefined;

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = (event) => {
    if (getStoredTheme()) return;
    useThemeStore.setState(toThemeState(event.matches ? "dark" : "light"));
  };

  mediaQuery.addEventListener("change", handleSystemThemeChange);
  return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
};
