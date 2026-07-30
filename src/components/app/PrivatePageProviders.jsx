"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ThemeProvider } from "styled-components";

import { PantallaCarga } from "../organismos/PantallaCarga.jsx";
import { AuthContextProvider } from "../../context/AuthContent.jsx";
import { useDivisionStore } from "../../store/DivisionStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import {
  initializeThemeStore,
  useThemeStore,
} from "../../store/ThemeStore.jsx";
import { GlobalStyles } from "../../styles/GlobalStyles.jsx";

const subscribeToDivisionHydration = (onStoreChange) => {
  const unsubscribeStart =
    useDivisionStore.persist.onHydrate(onStoreChange);
  const unsubscribeFinish =
    useDivisionStore.persist.onFinishHydration(onStoreChange);

  return () => {
    unsubscribeStart();
    unsubscribeFinish();
  };
};

const getDivisionHydrationSnapshot = () =>
  useDivisionStore.persist.hasHydrated();

const getServerHydrationSnapshot = () => false;

export default function PrivatePageProviders({ children, initialAuth }) {
  const { hasHydrated: themeHydrated, themeStyle } = useThemeStore();
  const divisionHydrated = useSyncExternalStore(
    subscribeToDivisionHydration,
    getDivisionHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  useEffect(() => {
    const cleanupThemeListener = initializeThemeStore();
    void useDivisionStore.persist.rehydrate();
    useAuthStore.getState().hydrateServerAuth(initialAuth);
    return cleanupThemeListener;
  }, [initialAuth]);

  if (!themeHydrated || !divisionHydrated) {
    return (
      <ThemeProvider theme={themeStyle}>
        <GlobalStyles />
        <PantallaCarga />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      <AuthContextProvider initialAuth={initialAuth}>
        {children}
      </AuthContextProvider>
    </ThemeProvider>
  );
}
