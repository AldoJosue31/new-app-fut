// src/App.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase/supabase.config";
import styled, { ThemeProvider, keyframes, css } from "styled-components";
import {
  AuthContextProvider,
  GlobalStyles,
  MyRoutes,
  Sidebar,
  UserAuth,
  Login,
} from "./index";
import { Device } from "./styles/breakpoints";
import { v } from "./styles/variables";
import { useThemeStore } from "./store/ThemeStore";
import { useLocation } from "react-router-dom";

/* ---------------------- AppContent (simplificado) ---------------------- */
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { themeStyle } = useThemeStore();
  const { isLoading } = UserAuth();
  const { pathname } = useLocation();

  // loaderDone = hemos pasado la pantalla de carga
  const [loaderDone, setLoaderDone] = useState(!isLoading);

  useEffect(() => {
    // Si empieza a cargarse => mostrar loader
    if (isLoading) {
      setLoaderDone(false);
      return;
    }
    // Si ya no está cargando => terminar loader inmediatamente (pequeña pausa para animación)
    // Si prefieres sin pausa, pon delay = 0
    const delay = 180; // ms para permitir pequeña transición
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

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      {pathname !== "/login" ? (
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
        <Login />
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

/* ---------------------- LoadingScreen (muy simple y robusto) ---------------------- */
function LoadingScreen() {
  // preferencia de reducir movimiento para accesibilidad
  const prefersReduced = usePrefersReducedMotion();

  return (
    <LoaderWrap role="status" aria-live="polite" aria-atomic="true">
      <Backdrop aria-hidden="true" />
      <LoaderCard>
        <SpinnerWrap>
          <Spinner aria-hidden="true" />
        </SpinnerWrap>
        <div className="titleBlock">
          <h3>Cargando aplicación</h3>
          <small>Preparando tus datos y componentes…</small>
        </div>
      </LoaderCard>
    </LoaderWrap>
  );
}

/* ---------------------- usePrefersReducedMotion (simple) ---------------------- */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return reduced;
}

/* ---------------------- Styled components para loader ---------------------- */

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const LoaderWrap = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: none;
`;

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(8, 10, 20, 0.18);
  pointer-events: none;
  backdrop-filter: blur(4px);
`;

const LoaderCard = styled.div`
  position: relative;
  z-index: 10000;
  pointer-events: auto;
  width: 92%;
  max-width: 420px;
  padding: 18px 20px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.92));
  box-shadow: 0 10px 30px rgba(8,10,25,0.12);
  display: flex;
  gap: 14px;
  align-items: center;
  animation: ${fadeIn} 220ms ease-out;
  @media ${Device.tablet} {
    padding: 22px;
  }
  .titleBlock h3 { margin: 0; font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.text}; }
  .titleBlock small { display: block; margin-top: 4px; color: rgba(0,0,0,0.55); font-size: 13px; }
`;

const SpinnerWrap = styled.div`
  flex: 0 0 56px;
  display:flex; align-items:center; justify-content:center;
`;

const Spinner = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: 4px solid rgba(0,0,0,0.06);
  border-top-color: ${({ theme }) => theme.primary ?? "#1CB0F6"};
  animation: ${spin} 900ms linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ---------------------- Container (grid original) ---------------------- */

const Container = styled.main`
  display: grid;
  grid-template-columns: 1fr;
  transition: 0.1s ease-in-out;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  
.contentSidebar{
    /* display: none;  <-- ELIMINA O COMENTA ESTA LÍNEA */
    display: block;    /* <-- AÑADE ESTO (o initial) */
    background-color: ${({ theme }) => theme.bgtgderecha};
    
    /* Opcional: Asegúrate de que no ocupe espacio físico en el grid móvil */
    position: absolute; 
    z-index: 50;
}

@media ${Device.tablet} {
    /* ... */
    .contentSidebar{
      display: initial; 
      position: relative; /* Restaurar flujo normal en tablet/pc */
    }
}
  
.contentMenuambur {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1; /* Para que quede sobre el contenido */
    
    /* Estilos del botón */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px; /* Tamaño del ícono */
    cursor: pointer;
    background-color: ${({ theme }) => theme.bgtotal}; /* Fondo para que no se mezcle */
    border-radius: 8px;
    padding: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }
  
  .contentRouters{
    grid-column: 1;
    width: 100%;
  }
  
  @media ${Device.tablet} {
    grid-template-columns: 88px 1fr;
    
    &.active{
      grid-template-columns: 260px 1fr;
    }
    
    .contentSidebar{
      display: initial; 
    }
    
    .contentMenuambur{
      display: none;
    }
    
    .contentRouters{
      grid-column: 2;
    }
  }
`;

export default App;
