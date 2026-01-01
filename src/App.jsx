import React, { useEffect, useState } from "react";
import styled, { ThemeProvider, keyframes } from "styled-components";
import {
  AuthContextProvider,
  GlobalStyles,
  MyRoutes,
  Sidebar,
  UserAuth,
} from "./index";
import { Device } from "./styles/breakpoints";
import { v } from "./styles/variables";
import { useThemeStore } from "./store/ThemeStore";
import { useLocation } from "react-router-dom";

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { themeStyle } = useThemeStore();
  const { isLoading } = UserAuth();
  const { pathname } = useLocation();

  const [loaderDone, setLoaderDone] = useState(!isLoading);

  useEffect(() => {
    if (isLoading) {
      setLoaderDone(false);
      return;
    }
    const delay = 180;
    const timer = setTimeout(() => setLoaderDone(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (!loaderDone) {
    return (
      <ThemeProvider theme={themeStyle}>
        <Container>
          <GlobalStyles />
          <LoadingScreen />
        </Container>
      </ThemeProvider>
    );
  }

  // --- LÓGICA DE EXCLUSIÓN ---
  // Si es Login o Invitación, NO mostramos el Sidebar
  const isStandAlonePage = pathname === "/login" || pathname.startsWith("/invitation");

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      
      {!isStandAlonePage ? (
        // MODO DASHBOARD (CON SIDEBAR)
        <Container className={sidebarOpen ? "active" : ""}>
          <section className="contentSidebar">
            <Sidebar state={sidebarOpen} setState={setSidebarOpen} />
          </section>
          <section className="contentMenuambur" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <v.iconomenu />
          </section>
          <section className="contentRouters">
            <MyRoutes />
          </section>
        </Container>
      ) : (
        // MODO PANTALLA COMPLETA (LOGIN / REGISTRO)
        // Usamos MyRoutes directamente para que el enrutador decida qué mostrar (Login o RegisterManager)
        <MyRoutes />
      )}
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthContextProvider>
      <AppContent />
    </AuthContextProvider>
  );
}

// --- LOADING COMPONENTS (Sin cambios) ---
function LoadingScreen() {
  return (
    <LoaderWrap>
      <Backdrop />
      <LoaderCard>
        <SpinnerWrap><Spinner /></SpinnerWrap>
        <div className="titleBlock">
          <h3>Cargando...</h3>
        </div>
      </LoaderCard>
    </LoaderWrap>
  );
}

// --- STYLED COMPONENTS ---
const spin = keyframes` to { transform: rotate(360deg); } `;
const fadeIn = keyframes` from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } `;

const LoaderWrap = styled.div` position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; pointer-events: none; `;
const Backdrop = styled.div` position: absolute; inset: 0; background: rgba(8, 10, 20, 0.18); pointer-events: none; backdrop-filter: blur(4px); `;
const LoaderCard = styled.div` position: relative; z-index: 10000; pointer-events: auto; width: 92%; max-width: 420px; padding: 18px 20px; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.92)); box-shadow: 0 10px 30px rgba(8,10,25,0.12); display: flex; gap: 14px; align-items: center; animation: ${fadeIn} 220ms ease-out; .titleBlock h3 { margin: 0; font-size: 16px; font-weight: 700; color: #333; }`;
const SpinnerWrap = styled.div` flex: 0 0 56px; display:flex; align-items:center; justify-content:center; `;
const Spinner = styled.div` width: 46px; height: 46px; border-radius: 999px; border: 4px solid rgba(0,0,0,0.06); border-top-color: ${({ theme }) => theme.primary ?? "#1CB0F6"}; animation: ${spin} 900ms linear infinite; `;

const Container = styled.main`
  display: grid;
  grid-template-columns: 1fr;
  transition: 0.1s ease-in-out;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  
  .contentSidebar {
    display: block;
    background-color: ${({ theme }) => theme.bgtgderecha};
    position: absolute; 
    z-index: 50;
    @media ${Device.tablet} {
       display: initial;
       position: relative;
    }
  }

  .contentMenuambur {
    position: absolute; top: 20px; left: 20px; z-index: 1;
    display: flex; align-items: center; justify-content: center; font-size: 30px; cursor: pointer;
    background-color: ${({ theme }) => theme.bgtotal}; border-radius: 8px; padding: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    @media ${Device.tablet} { display: none; }
  }
  
  .contentRouters { grid-column: 1; width: 100%; }
  
  @media ${Device.tablet} {
    grid-template-columns: 88px 1fr;
    &.active { grid-template-columns: 260px 1fr; }
    .contentRouters { grid-column: 2; }
  }
`;

export default App;