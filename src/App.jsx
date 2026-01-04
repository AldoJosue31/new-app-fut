import React, { useEffect, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { useLocation } from "react-router-dom";

// Imports de Componentes y Contextos
import {
  AuthContextProvider,
  GlobalStyles,
  MyRoutes,
  Sidebar,
  UserAuth,
  PantallaCarga 
} from "./index";

// Imports de Estilos
import { Device } from "./styles/breakpoints";
import { v } from "./styles/variables";

// Imports de Stores (Zustand)
import { useThemeStore } from "./store/ThemeStore";
import { useDivisionStore } from "./store/DivisionStore";

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { themeStyle } = useThemeStore();
  const { pathname } = useLocation();
  
  // Obtenemos el usuario del Contexto (Fuente de verdad actual para la sesión)
  const { user, isLoading } = UserAuth();
  
  // Obtenemos la función de limpieza del Store de Divisiones
  const { resetStore: resetDivision } = useDivisionStore();

  const [loaderDone, setLoaderDone] = useState(!isLoading);

  // --- 1. EFECTO REACTIVO (ORQUESTADOR DE LIMPIEZA) ---
  // Este useEffect vigila el estado del usuario. Si se desconecta, limpia los datos.
  useEffect(() => {
    if (!isLoading && !user) {
      // Usuario no logueado o sesión cerrada -> Limpiar Stores
      resetDivision();
      // Aseguramos limpieza del persist en localStorage
      localStorage.removeItem('division-storage');
    }
  }, [user, isLoading, resetDivision]);

  // --- 2. CONTROL DEL LOADER ---
  useEffect(() => {
    if (isLoading) {
      setLoaderDone(false);
      return;
    }
    const delay = 2000; 
    const timer = setTimeout(() => setLoaderDone(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // --- 3. RENDERIZADO DE PANTALLA DE CARGA ---
  if (!loaderDone) {
    return (
      <ThemeProvider theme={themeStyle}>
        <GlobalStyles />
        <PantallaCarga />
      </ThemeProvider>
    );
  }

  // --- 4. LÓGICA DE INTERFAZ (SIDEBAR vs FULLSCREEN) ---
  const isStandAlonePage = pathname === "/login" || pathname.startsWith("/invitation");

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      
      {!isStandAlonePage ? (
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

// --- STYLED COMPONENTS ---
const Container = styled.main`
  display: grid;
  grid-template-columns: 1fr;
  transition: 0.1s ease-in-out;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  min-height: 100vh; /* Asegura que ocupe al menos toda la pantalla */
  
  .contentSidebar {
    display: block;
    background-color: ${({ theme }) => theme.bgtgderecha};
    position: absolute; 
    z-index: 50;
    height: 100%; /* Asegura que el sidebar cubra la altura */
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