"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ThemeProvider } from "styled-components";

import { PantallaCarga } from "../organismos/PantallaCarga.jsx";
import { AuthContextProvider } from "../../context/AuthContent.jsx";
import { useDivisionStore } from "../../store/DivisionStore.jsx";
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

export default function PrivatePageProviders({ children }) {
  const { hasHydrated: themeHydrated, themeStyle } = useThemeStore();
  const divisionHydrated = useSyncExternalStore(
    subscribeToDivisionHydration,
    getDivisionHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  useEffect(() => {
    const cleanupThemeListener = initializeThemeStore();
    if (!useDivisionStore.persist.hasHydrated()) {
      void useDivisionStore.persist.rehydrate();
    }
    return cleanupThemeListener;
  }, []);

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      {themeHydrated && divisionHydrated ? (
        <AuthContextProvider>{children}</AuthContextProvider>
      ) : (
        <PantallaCarga />
      )}
    </ThemeProvider>
  );
}
