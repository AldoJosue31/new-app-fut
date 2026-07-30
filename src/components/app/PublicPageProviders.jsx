"use client";

import { useEffect } from "react";
import { ThemeProvider } from "styled-components";

import {
  initializeThemeStore,
  useThemeStore,
} from "../../store/ThemeStore.jsx";
import { GlobalStyles } from "../../styles/GlobalStyles.jsx";

export default function PublicPageProviders({
  children,
  initialAuth = null,
}) {
  const { themeStyle } = useThemeStore();

  useEffect(() => {
    let active = true;
    const cleanupThemeListener = initializeThemeStore();
    if (initialAuth) {
      void import("../../store/AuthStore.jsx").then(({ useAuthStore }) => {
        if (active) {
          useAuthStore.getState().hydrateServerAuth(initialAuth);
        }
      });
    }
    return () => {
      active = false;
      cleanupThemeListener?.();
    };
  }, [initialAuth]);

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}
