import React, { useEffect, useRef, useState } from "react";
import styled, { ThemeProvider, css, keyframes } from "styled-components";
import {
  AuthContextProvider,
  GlobalStyles,
  MyRoutes,
  Sidebar,
  UserAuth,
  Login,
} from "./index";
import { Device } from "./styles/breakpoints";
import { useThemeStore } from "./store/ThemeStore";
import { useLocation } from "react-router-dom";

/**
 * AppContent mejorado: controla la pantalla de carga para que
 * termine su animación aun cuando isLoading pase a false.
 */
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { themeStyle } = useThemeStore();
  const { isLoading } = UserAuth();
  const { pathname } = useLocation();

  // loaderDone indica que ya pasamos la pantalla de carga (permite animación final)
  const [loaderDone, setLoaderDone] = useState(!isLoading);

  // Si arrancamos con isLoading=true, loaderDone será false y se mostrará el loader.
  useEffect(() => {
    if (!isLoading && loaderDone === true) {
      // nada: ya terminó anteriormente
      return;
    }
    // Si isLoading quedó en false desde el inicio, marcar loaderDone true
    if (!isLoading && loaderDone === false) {
      // se dejará que LoadingScreen pida finalizar (onFinish) para que haga el pequeño remate
      return;
    }
    if (isLoading) {
      setLoaderDone(false);
    }
  }, [isLoading, loaderDone]);

  // Mientras loaderDone sea false, mostramos el LoadingScreen que controlará su finalización
  if (!loaderDone) {
    return (
      <ThemeProvider theme={themeStyle}>
        <Container>
          <GlobalStyles />
          <LoadingScreen
            isLoading={isLoading}
            onFinish={() => {
              // cuando el LoadingScreen termine su animación, permitimos que la app continúe
              setLoaderDone(true);
            }}
          />
        </Container>
      </ThemeProvider>
    );
  }

  // App normal
  return (
    <ThemeProvider theme={themeStyle}>
      <GlobalStyles />
      {pathname !== "/login" ? (
        <Container className={sidebarOpen ? "active" : ""}>
          <section className="contentSidebar">
            <Sidebar state={sidebarOpen} setState={setSidebarOpen} />
          </section>
          <section className="contentMenuambur">menu ambur</section>
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

/* ---------------------- LoadingScreen (nuevo) ---------------------- */

function LoadingScreen({ isLoading, onFinish }) {
  const [progress, setProgress] = useState(0);
  const mountedRef = useRef(true);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    mountedRef.current = true;
    let timer = null;

    if (isLoading) {
      timer = setInterval(() => {
        setProgress((p) => {
          if (!mountedRef.current) return p;
          const cap = 95;
          if (p >= cap) return p;
          const inc = 0.5 + Math.random() * 3.5;
          return Math.min(cap, +(p + inc).toFixed(2));
        });
      }, 220);
    } else {
      setProgress(100);
    }

    return () => {
      mountedRef.current = false;
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => {
        onFinish && onFinish();
      }, prefersReduced ? 150 : 420);
      return () => clearTimeout(t);
    }
  }, [progress, onFinish, prefersReduced]);

  const pct = Math.min(100, Math.round(progress));

  return (
    <LoaderWrap role="status" aria-live="polite" aria-atomic="true">
      <Backdrop aria-hidden="true" />
      <LoaderCard>
        <LogoAndTitle>
          <LogoSVG width="68" height="68" viewBox="0 0 48 48" aria-hidden="true">
            <circle className="ring-bg" cx="24" cy="24" r="18" strokeWidth="3" fill="none" />
            <circle className="ring" cx="24" cy="24" r="18" strokeWidth="3" strokeLinecap="round" fill="none"
              style={{ strokeDasharray: Math.PI * 2 * 18, strokeDashoffset: Math.PI * 2 * 18 * (1 - pct / 100) }}
            />
            <g className="icon" transform="translate(11,12)">
              <path d="M2 1h2l3 9h11l3-7H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="9" cy="14" r="1.8" fill="currentColor"/>
              <circle cx="18" cy="14" r="1.8" fill="currentColor"/>
            </g>
          </LogoSVG>

          <div className="titleBlock">
            <h3>Cargando aplicación</h3>
            <small>Preparando tus datos y componentes…</small>
          </div>
        </LogoAndTitle>

        <ProgressBar aria-hidden="true">
          <ProgressFill style={{ width: `${pct}%` }} role="presentation" />
        </ProgressBar>

        <BottomRow>
          <PctText>{pct}%</PctText>
          <StatusText>{isLoading ? "Cargando..." : "Finalizando..."}</StatusText>
        </BottomRow>
      </LoaderCard>
    </LoaderWrap>
  );
}


/* ---------------------- Hooks & util ---------------------- */

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

/* ---------------------- Styled components ---------------------- */

const appear = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(.995); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const LoaderWrap = styled.div`
  position: fixed;     /* -> CENTRADO absoluto en viewport */
  inset: 0;            /* top:0; right:0; bottom:0; left:0 */
  z-index: 9999;       /* encima de todo */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  pointer-events: none; /* fondo no interactuable */
  background: transparent; /* si quieres un overlay semitransparente usa rgba */
`;

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(8,10,20,0.28); /* sutil overlay opcional */
  backdrop-filter: blur(2px);
  pointer-events: none;
`;

const LoaderCard = styled.div`
  position: relative;
  z-index: 10000;        /* encima del backdrop */
  pointer-events: auto;  /* sólo el card recibe interacción */
  width: 100%;
  max-width: 520px;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9));
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 12px 40px rgba(8,10,30,0.18);
  display:flex;
  flex-direction: column;
  gap: 12px;
  transform-origin: center;
  animation: ${keyframes`
    from { opacity: 0; transform: translateY(8px) scale(.995); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  `} 320ms cubic-bezier(.2,.9,.3,1);
`;

/* logo + title */
const LogoAndTitle = styled.div` /* ...igual que antes... */ 
  display:flex; gap:12px; align-items:center;
  .titleBlock h3{ margin:0; font-size:18px; font-weight:700; color:${({theme})=>theme.text};}
  .titleBlock small{ display:block; margin-top:2px; color:rgba(0,0,0,0.55); font-size:12px;}
`;

/* SVG logo with animated ring */
const LogoSVG = styled.svg`
  flex: 0 0 68px;
  width: 68px;
  height: 68px;
  --primary: ${({ theme }) => theme.primary ?? "#1CB0F6"};
  .ring-bg { stroke: rgba(16,16,24,0.06); }
  .ring { stroke: var(--primary); transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 360ms cubic-bezier(.22,.9,.3,1); }
  .icon { fill: var(--primary); color: var(--primary); opacity:0.95; }
  @media (prefers-reduced-motion: reduce) { .ring{ transition: none; } }
`;

/* progress bar */
const ProgressBar = styled.div` height:10px; background:linear-gradient(90deg, rgba(16,16,24,0.04), rgba(16,16,24,0.02)); border-radius:999px; overflow:hidden; `;
const ProgressFill = styled.div` height:100%; width:0%; background:linear-gradient(90deg, ${({theme})=>theme.primary??"#1CB0F6"}, ${({theme})=>theme.accent??"#5856d6"}); transition: width 260ms linear; `;
const BottomRow = styled.div` display:flex; align-items:center; justify-content:space-between; gap:12px; `;
const PctText = styled.div` font-weight:700; font-size:18px; color:${({theme})=>theme.text}; min-width:64px; text-align:left; `;
const StatusText = styled.div` font-size:13px; color:rgba(0,0,0,0.55); `;

/* Container / grid original (sin cambios importantes) */
const Container = styled.main`
  display: grid;
  grid-template-columns: 1fr;
  transition: 0.1s ease-in-out;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  
  .contentSidebar{
    display: none;
    background-color: ${({ theme }) => theme.bgtgderecha};
  }
  
  .contentMenuambur{
    position: absolute;
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
