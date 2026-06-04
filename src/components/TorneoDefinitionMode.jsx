import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";

export function TorneoDefinitionMode({ activeTournament, isResolving = false, renderActive, renderSetup }) {
  const [showLoader, setShowLoader] = useState(isResolving);
  const [isLoaderLeaving, setIsLoaderLeaving] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isResolving) {
      const showTimer = setTimeout(() => {
        setShowLoader(true);
        setIsLoaderLeaving(false);
      }, 0);
      return () => clearTimeout(showTimer);
    }

    if (showLoader) {
      const leaveTimer = setTimeout(() => {
        setIsLoaderLeaving(true);
      }, 0);
      hideTimerRef.current = setTimeout(() => {
        setShowLoader(false);
        setIsLoaderLeaving(false);
        hideTimerRef.current = null;
      }, 360);
      return () => clearTimeout(leaveTimer);
    }

    return undefined;
  }, [isResolving, showLoader]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const content = useMemo(
    () => (activeTournament ? renderActive() : renderSetup()),
    [activeTournament, renderActive, renderSetup]
  );

  return (
    <ModeTransitionFrame>
      {!isResolving && content}
      {showLoader && (
        <TorneoDefinitionModeLoading
          overlay={!isResolving}
          leaving={isLoaderLeaving}
        />
      )}
    </ModeTransitionFrame>
  );
}

export function TorneoDefinitionModeLoading({ overlay = false, leaving = false }) {
  return (
    <LoadingShell aria-live="polite" aria-busy="true" $overlay={overlay} $leaving={leaving}>
      <span className="spinner" />
      <span className="sr-only">Cargando torneo</span>
    </LoadingShell>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const loaderEnter = keyframes`
  from {
    opacity: 0;
    transform: scale(0.992);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const loaderExit = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.006);
  }
`;

const ModeTransitionFrame = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: inherit;
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
`;

const LoadingShell = styled.div`
  width: 100%;
  max-width: none;
  height: ${({ $overlay }) => ($overlay ? "100%" : "auto")};
  min-height: ${({ $overlay }) => ($overlay ? "100%" : "clamp(360px, calc(100dvh - 150px), 760px)")};
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || "#263740"};
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 44%, ${({ theme }) => theme.tournamentDashboard?.hero?.glow || "rgba(28, 176, 246, 0.18)"}, transparent 36%),
    ${({ theme }) => theme.tournamentDashboard?.surface || theme.bgcards || "#10191d"};
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.02),
    ${({ theme }) =>
      String(theme.body || "").toLowerCase() === "#fff"
        ? "0 18px 45px rgba(24, 39, 57, 0.08)"
        : "0 18px 45px rgba(0, 0, 0, 0.18)"};
  opacity: ${({ $leaving }) => ($leaving ? 0 : 1)};
  pointer-events: ${({ $leaving }) => ($leaving ? "none" : "auto")};
  animation: ${({ $leaving }) => ($leaving ? loaderExit : loaderEnter)} 0.36s ease both;

  ${({ $overlay }) =>
    $overlay &&
    `
      position: absolute;
      inset: 0;
      z-index: 9;
    `}

  .spinner {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 4px solid ${({ theme }) => theme.tournamentDashboard?.hero?.accentSoft || "rgba(28, 176, 246, 0.16)"};
    border-top-color: ${({ theme }) => theme.tournamentDashboard?.primary || "#1cb0f6"};
    animation: ${spin} 0.9s linear infinite;
  }

  @media (min-width: 769px) {
    min-height: ${({ $overlay }) => ($overlay ? "100%" : "clamp(360px, calc(100dvh - 150px), 760px)")};
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
