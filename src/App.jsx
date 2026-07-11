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

// Imports de Stores (Zustand)
import { useThemeStore } from "./store/ThemeStore";
import { useDivisionStore } from "./store/DivisionStore";

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { themeStyle } = useThemeStore();
  const { pathname } = useLocation();

  const { user, profile, isLoading } = UserAuth();
  const { resetStore: resetDivision } = useDivisionStore();

  useEffect(() => {
    if (!isLoading && !user) {
      resetDivision();
      localStorage.removeItem('division-storage');
    }
  }, [user, isLoading, resetDivision]);

  if (isLoading || (user && !profile)) {
    return (
      <ThemeProvider theme={themeStyle}>
        <GlobalStyles />
        <PantallaCarga />
      </ThemeProvider>
    );
  }

  const isStandAlonePage =
    pathname === "/login" ||
    pathname.startsWith("/invitation") ||
    pathname.startsWith("/delegate/invitation") ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/landing") ||
    (pathname === "/" && !user);

  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      
      {!isStandAlonePage ? (
        <Container className={sidebarOpen ? "active" : ""}>
          <section className="contentSidebar">
            <Sidebar state={sidebarOpen} setState={setSidebarOpen} />
          </section>
          
          <section className="contentRouters">
            <MyRoutes sidebarState={sidebarOpen} setSidebarState={setSidebarOpen} />
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

const Container = styled.main`
  display: grid;
  grid-template-columns: 1fr;
  transition: 0.1s ease-in-out;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  min-height: 100vh;
  
  .contentSidebar {
    display: block;
    background-color: ${({ theme }) => theme.bgtgderecha};
    position: absolute; 
    /* CORRECCIÓN: Aumentamos z-index a 2000 para superar al header (que tiene 100) */
    z-index: 2000;
    height: 100%;
    
    @media ${Device.tablet} {
       display: initial;
       position: relative;
       z-index: auto; /* En tablet/desktop vuelve al flujo normal */
    }
  }

  .contentRouters { grid-column: 1; width: 100%; }
  
  @media ${Device.tablet} {
    grid-template-columns: 88px 1fr;
    &.active { grid-template-columns: 260px 1fr; }
    .contentRouters { grid-column: 2; }
  }
`;

export default App;
