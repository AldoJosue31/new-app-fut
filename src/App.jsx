import React, { useEffect, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import {
  AuthContextProvider,
  GlobalStyles,
  MyRoutes,
  Sidebar,
  UserAuth,
  PantallaCarga // <--- 1. Nos aseguramos que esté importado
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
    // Puedes ajustar este delay si quieres que la animación del logo dure más tiempo
    const delay = 2000; 
    const timer = setTimeout(() => setLoaderDone(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // --- 2. RENDERIZADO DE LA NUEVA PANTALLA DE CARGA ---
  if (!loaderDone) {
    return (
      <ThemeProvider theme={themeStyle}>
        <GlobalStyles />
        {/* Ya no usamos <Container> aquí porque PantallaCarga es fixed full-screen */}
        <PantallaCarga />
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

// --- STYLED COMPONENTS DEL LAYOUT PRINCIPAL ---
// (He eliminado los estilos de LoaderWrap, Spinner, etc. porque ya no se usan)

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