import React from "react";
import styled, { keyframes } from "styled-components";

export function TorneoDefinitionMode({ activeTournament, isResolving = false, renderActive, renderSetup }) {
  if (isResolving) {
    return <TorneoDefinitionModeLoading />;
  }

  return activeTournament ? renderActive() : renderSetup();
}

export function TorneoDefinitionModeLoading() {
  return (
    <LoadingShell aria-live="polite" aria-busy="true">
      <span className="spinner" />
      <span className="sr-only">Cargando torneo</span>
    </LoadingShell>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingShell = styled.div`
  width: 100%;
  max-width: 1000px;
  min-height: min(520px, calc(100dvh - 180px));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard?.border || "#263740"};
  border-radius: 12px;
  background: ${({ theme }) => theme.tournamentDashboard?.surface || "#10191d"};
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);

  .spinner {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 4px solid ${({ theme }) => theme.tournamentDashboard?.hero?.accentSoft || "rgba(28, 176, 246, 0.16)"};
    border-top-color: ${({ theme }) => theme.tournamentDashboard?.primary || "#1cb0f6"};
    animation: ${spin} 0.9s linear infinite;
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
