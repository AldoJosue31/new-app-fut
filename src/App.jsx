import React, { useEffect, useState, useRef } from "react";
import styled, { ThemeProvider } from "styled-components";
import { useLocation } from "react-router-dom";
import { supabase } from "./supabase/supabase.config";

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

  // Ref para mantener el canal de presencia y evitar recrearlo
  const presenceRef = useRef(null);

  // --- 1. EFECTO REACTIVO (ORQUESTADOR DE LIMPIEZA) ---
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

  // --- NUEVO: EFECTO DE SEGUIMIENTO DE PRESENCIA (TRACKER ROBUSTO) ---
  useEffect(() => {
    // Solo rastreamos si hay un usuario logueado
    if (!user?.id) {
      // Si no hay usuario y existe un canal, limpiamos
      if (presenceRef.current) {
        try {
          presenceRef.current.untrack?.().catch(()=>{});
        } catch(e) {}
        try { presenceRef.current.unsubscribe(); } catch(e) {}
        presenceRef.current = null;
      }
      return;
    }

    // Si ya hay canal para este cliente, no lo recreamos
    if (presenceRef.current) {
      console.log('[TRACKER] already tracking ->', user.id);
      return;
    }

    // Creamos el canal (sin config.presence.key para evitar problemas)
    const channel = supabase.channel('online-managers');
    presenceRef.current = channel;

    const handleSubscribeStatus = async (status) => {
      console.log('[TRACKER] subscribe status', status);
      // debug: mostrar session para verificar token/expiración
      try {
        const { data: sess } = await supabase.auth.getSession();
        console.log('[TRACKER] session', sess);
      } catch (e) {
        console.warn('[TRACKER] getSession err', e);
      }

      if (status === 'SUBSCRIBED') {
        try {
await channel.track({
  user_id: user.id, // Se registra con su ID de Supabase Auth
  online_at: new Date().toISOString(),
});
          console.log('[TRACKER] tracked presence for', user.id);
        } catch (err) {
          console.error('[TRACKER] track error', err);
        }
      } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
        console.warn('[TRACKER] channel status', status);
        // no forzamos reconexión automática aquí; Supabase client hará reintentos.
      }
    };

    // subscribe acepta callback con status
    channel.subscribe(handleSubscribeStatus);

    // Reconectar / re-track cuando vuelva visibilidad
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        try {
          channel.track({ user_id: user.id, online_at: new Date().toISOString() })
            .then(() => console.log('[TRACKER] re-tracked on visible', user.id))
            .catch(e => console.error('[TRACKER] re-track err', e));
        } catch (e) {
          console.error('[TRACKER] re-track thrown', e);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Limpieza al desmontar o cambiar usuario
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        channel.untrack?.().catch(()=>{});
      } catch (e) {}
      try {
        channel.unsubscribe();
      } catch (e) {
        try { supabase.removeChannel(channel); } catch (err) {}
      } finally {
        presenceRef.current = null;
      }
    };
  }, [user?.id]);

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
