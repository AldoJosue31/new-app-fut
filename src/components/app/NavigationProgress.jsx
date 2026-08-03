"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import styled, { css, keyframes } from "styled-components";

import { v } from "../../styles/variables";

const NavigationProgressContext = createContext(null);

const EMPTY_TRANSITION = Object.freeze({
  doneLabel: "",
  isDone: false,
  isVisible: false,
  kind: "view",
  label: "",
  startedPath: "",
  targetDivisionId: "",
  targetPath: "",
});

const normalizePath = (path = "") => {
  const pathname = String(path).split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
};

export function NavigationProgressProvider({ children }) {
  const pathname = usePathname() || "/";
  const [transition, setTransition] = useState(EMPTY_TRANSITION);
  const hideTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
    }
    hideTimerRef.current = null;
    fallbackTimerRef.current = null;
  }, []);

  const completeNavigation = useCallback(
    ({ label } = {}) => {
      clearTimers();
      setTransition((current) => {
        if (!current.isVisible) return current;
        return {
          ...current,
          isDone: true,
          label: label || current.doneLabel || "Vista abierta",
        };
      });

      hideTimerRef.current = window.setTimeout(() => {
        setTransition(EMPTY_TRANSITION);
        hideTimerRef.current = null;
      }, 560);
    },
    [clearTimers],
  );

  const startNavigation = useCallback(
    ({
      doneLabel = "Vista abierta",
      kind = "view",
      label = "Abriendo vista",
      targetDivisionId = "",
      targetPath = "",
    } = {}) => {
      clearTimers();
      setTransition({
        doneLabel,
        isDone: false,
        isVisible: true,
        kind,
        label,
        startedPath: normalizePath(pathname),
        targetDivisionId: String(targetDivisionId || ""),
        targetPath: targetPath ? normalizePath(targetPath) : "",
      });

      if (kind !== "division") {
        fallbackTimerRef.current = window.setTimeout(() => {
          setTransition(EMPTY_TRANSITION);
          fallbackTimerRef.current = null;
        }, 10000);
      }
    },
    [clearTimers, pathname],
  );

  const cancelNavigation = useCallback(() => {
    clearTimers();
    setTransition(EMPTY_TRANSITION);
  }, [clearTimers]);

  useEffect(() => {
    if (
      !transition.isVisible ||
      transition.isDone ||
      transition.kind === "division" ||
      normalizePath(pathname) === transition.startedPath
    ) {
      return undefined;
    }

    const completionTimer = window.setTimeout(completeNavigation, 0);
    return () => window.clearTimeout(completionTimer);
  }, [
    completeNavigation,
    pathname,
    transition.isDone,
    transition.isVisible,
    transition.kind,
    transition.startedPath,
  ]);

  useEffect(() => clearTimers, [clearTimers]);

  const value = useMemo(
    () => ({
      cancelNavigation,
      completeNavigation,
      isNavigating: transition.isVisible && !transition.isDone,
      startNavigation,
      transition,
    }),
    [
      cancelNavigation,
      completeNavigation,
      startNavigation,
      transition,
    ],
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);

  if (!context) {
    throw new Error(
      "useNavigationProgress debe usarse dentro de NavigationProgressProvider",
    );
  }

  return context;
}

export function NavigationProgressBar() {
  const { transition } = useNavigationProgress();

  return (
    <ProgressRoot
      $isDone={transition.isDone}
      $isVisible={transition.isVisible}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <div className="navigation-progress-copy">{transition.label}</div>
      <div className="navigation-progress-track" aria-hidden="true">
        <div className="navigation-progress-fill" />
      </div>
    </ProgressRoot>
  );
}

const navigationSweep = keyframes`
  0% {
    transform: translate3d(-90%, 0, 0) scaleX(0.42);
  }

  55% {
    transform: translate3d(35%, 0, 0) scaleX(0.58);
  }

  100% {
    transform: translate3d(118%, 0, 0) scaleX(0.36);
  }
`;

const ProgressRoot = styled.div`
  position: fixed;
  inset: auto 0 0;
  z-index: 2100;
  pointer-events: none;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transform: translate3d(
    0,
    ${({ $isVisible }) => ($isVisible ? "0" : "10px")},
    0
  );
  transition:
    opacity 180ms ease-out,
    transform 180ms ease-out;

  .navigation-progress-copy {
    position: absolute;
    right: 16px;
    bottom: 10px;
    max-width: min(320px, calc(100vw - 32px));
    padding: 7px 10px;
    overflow: hidden;
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.bgcards};
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.16);
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .navigation-progress-track {
    width: 100%;
    height: 4px;
    overflow: hidden;
    background: ${({ theme }) => theme.bg4};
  }

  .navigation-progress-fill {
    width: 100%;
    height: 100%;
    background: ${({ theme, $isDone }) =>
      $isDone ? v.verde : theme.primary || v.colorPrincipal};
    transform-origin: left center;
    will-change: transform;

    ${({ $isDone }) =>
      $isDone
        ? css`
            transform: translate3d(0, 0, 0) scaleX(1);
            transition: transform 220ms ease-out;
          `
        : css`
            animation: ${navigationSweep} 920ms
              cubic-bezier(0.22, 1, 0.36, 1) infinite;
          `}
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 100ms linear;
    transform: none;

    .navigation-progress-fill {
      animation: none;
      transform: scaleX(${({ $isDone }) => ($isDone ? 1 : 0.72)});
    }
  }
`;
