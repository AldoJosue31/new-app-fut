// src/components/organismos/tabs/torneos/TorneosStandingsTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables';
import { BiShareAlt, BiCheck } from "react-icons/bi"; 
import { RiBarChartGroupedLine, RiGitBranchLine, RiImageLine } from "react-icons/ri";

import StandingsExportModal from './exports/standings/StandingsExportModal';
import StandingsTable from './subcomponents/StandingsTable';
import { PlayoffBracketView } from './subcomponents/PlayoffBracketView';
import { StandingsJornadaSelector } from './StandingsJornadaSelector';
import { Skeleton } from '../../../atomos/Skeleton';

import { useTorneoStandingsLogic } from '../../../../hooks/useTorneoStandingsLogic';
import { getStandingsViewStorageKey } from '../../../../hooks/useTorneoStandingsLogic';
import { updateTournamentFieldsService } from '../../../../services/torneos';

export const TorneosStandingsTab = ({
  torneo = {},
  equipos = [],
  partidos = [],
  jornadas: jornadasProp = [],
  reglas = {},
  onRefresh,
  isPublic = false,
  isLoading = false 
}) => {

  const [copied, setCopied] = useState(false);
  const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_public || false);
  const [updating, setUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeView, setActiveView] = useState('table');
  const [selectedJornadaView, setSelectedJornadaView] = useState(() => {
    if (!torneo?.id || typeof window === 'undefined') return 'recent';
    return localStorage.getItem(getStandingsViewStorageKey(torneo.id)) || 'recent';
  });

  useEffect(() => {
    if (onRefresh && !isPublic) {
      onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    setIsPublicEnabled(torneo?.is_public || false);
  }, [torneo?.is_public]);

  useEffect(() => {
    if (!torneo?.id || typeof window === 'undefined') {
      setSelectedJornadaView('recent');
      return;
    }
    setSelectedJornadaView(localStorage.getItem(getStandingsViewStorageKey(torneo.id)) || 'recent');
  }, [torneo?.id]);

  const handleSelectedJornadaViewChange = (nextValue) => {
    setSelectedJornadaView(nextValue);
    if (torneo?.id && typeof window !== 'undefined') {
      localStorage.setItem(getStandingsViewStorageKey(torneo.id), nextValue);
    }
  };

  const {
    config,
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    tablaGeneral,
    activeJornadaName,
    mergedJornadas,
    isCalculating
  } = useTorneoStandingsLogic({
    torneo,
    equipos,
    partidos,
    jornadasProp,
    reglas,
    selectedJornadaView
  });

  const isDataLoading = isLoading || isCalculating;
  const [showSkeleton, setShowSkeleton] = useState(true);
  const tournamentConfig = useMemo(() => {
    if (typeof torneo?.config === 'string') {
      try {
        return JSON.parse(torneo.config) || {};
      } catch {
        return {};
      }
    }

    return torneo?.config || {};
  }, [torneo?.config]);
  const playoffStages = Array.isArray(tournamentConfig.playoffState?.stages)
    ? tournamentConfig.playoffState.stages
    : [];
  const hasPlayoffView = Boolean(tournamentConfig.zonaLiguilla || playoffStages.length > 0);
  const activePlayoffPhaseKey = tournamentConfig.playoffState?.currentPhaseKey || "";
  const hasStartedPlayoffPhase = Boolean(activePlayoffPhaseKey || playoffStages.length > 0);

  useEffect(() => {
    if (!hasPlayoffView && activeView !== 'table') {
      setActiveView('table');
    }
  }, [activeView, hasPlayoffView]);

  useEffect(() => {
    if (!isPublic && hasStartedPlayoffPhase) {
      setActiveView('bracket');
    }
  }, [hasStartedPlayoffPhase, isPublic, torneo?.id]);

  useEffect(() => {
    if (isDataLoading) {
      setShowSkeleton(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [isDataLoading, selectedJornadaView]);

  const handleTogglePublic = async () => {
    if (updating) return;
    setUpdating(true);
    const newState = !isPublicEnabled;

    try {
        await updateTournamentFieldsService(torneo.id, { is_public: newState });
        setIsPublicEnabled(newState);
        if (onRefresh) onRefresh(); 
        
    } catch (error) {
        console.error("Error updating public status:", error);
        alert("No se pudo actualizar el estado del enlace.");
    } finally {
        setUpdating(false);
    }
  };

  const handleShare = () => {
    const link = `${window.location.origin}/share/standings/${torneo.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <StandingsTabContainer>
      {!isPublic && (
        <ControlPanel>
            <SelectorWrapper>
              {showSkeleton ? (
                <Skeleton width="100%" height="36px" radius="8px" />
              ) : (
                <StandingsJornadaSelector
                  selected={selectedJornadaView}
                  onChange={handleSelectedJornadaViewChange}
                  effectiveJornada={effectiveJornada}
                  jornadasOptions={jornadasConfirmadasForDropdown}
                />
              )}
            </SelectorWrapper>

            <ViewSwitcherShell>
              {hasPlayoffView && (
                <ViewSwitcher role="tablist" aria-label="Vista de clasificacion">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === 'table'}
                    className={activeView === 'table' ? 'active' : ''}
                    onClick={() => setActiveView('table')}
                  >
                    <RiBarChartGroupedLine />
                    <span>Liga</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === 'bracket'}
                    className={activeView === 'bracket' ? 'active' : ''}
                    onClick={() => setActiveView('bracket')}
                  >
                    <RiGitBranchLine />
                    <span>Cuadro</span>
                  </button>
                </ViewSwitcher>
              )}
            </ViewSwitcherShell>

            <ActionsGroup>
                <ShareButton onClick={() => setShowExportModal(true)} title="Exportar Tabla">
                    <RiImageLine size={20}/>
                    <span>Exportar</span>
                </ShareButton>

                <ToggleContainer onClick={handleTogglePublic} $active={isPublicEnabled}>
                    <div className="track"><div className="thumb" /></div>
                    <span className="label">Publico</span>
                </ToggleContainer>

                {isPublicEnabled && (
                    <ShareButton onClick={handleShare} $copied={copied} title="Copiar Enlace">
                        {copied ? <BiCheck size={20}/> : <BiShareAlt size={20}/>}
                        <span>{copied ? "Copiado" : "Link"}</span>
                    </ShareButton>
                )}
            </ActionsGroup>
        </ControlPanel>
      )}

      <ViewContent key={activeView}>
        {activeView === 'bracket' && hasPlayoffView ? (
          <PlayoffBracketView
            torneo={torneo}
            partidos={partidos}
            jornadas={mergedJornadas}
            projectedStandings={tablaGeneral}
            isLoading={showSkeleton}
          />
        ) : (
          <StandingsTable
            tablaGeneral={tablaGeneral}
            config={config}
            isPublic={isPublic}
            isLoading={showSkeleton}
          />
        )}
      </ViewContent>

      <StandingsExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tablaGeneral={tablaGeneral}
        torneo={torneo}
        config={config}
        activeJornadaName={activeJornadaName} 
      />
    </StandingsTabContainer>
  );
};

/* ---------- Estilos ---------- */
const StandingsTabContainer = styled.div`
  --standings-primary: ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
  --standings-primary-soft: ${({ theme }) => theme.tournamentDashboard?.primarySoft || theme.bg6};
  --standings-primary-strong: ${({ theme }) => theme.tournamentDashboard?.hero?.accentStrong || theme.primary};
  --standings-surface: ${({ theme }) => theme.tournamentDashboard?.surface || theme.bg};
  --standings-item-surface: ${({ theme }) => theme.tournamentDashboard?.itemSurface || theme.bg2};
  --standings-border: ${({ theme }) => theme.tournamentDashboard?.border || theme.color2};
  --standings-muted: ${({ theme }) => theme.tournamentDashboard?.muted || theme.colorSubtitle};
  --standings-success: ${({ theme }) => theme.tournamentDashboard?.metrics?.accent || v.verde};
  --standings-success-soft: ${({ theme }) => theme.tournamentDashboard?.metrics?.accentSoft || 'rgba(83, 178, 87, 0.14)'};
  --standings-warning: ${({ theme }) => theme.tournamentDashboard?.metrics?.warning || '#f59e0b'};

  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;

  @media (max-width: 768px) {
    width: 100vw;
    max-width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    padding: 0 16px;
  }
`;

const ControlPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(190px, 300px) minmax(180px, 1fr) auto;
  align-items: center;
  width: 98%;
  max-width: 1180px;
  margin: 0 auto 10px auto;
  background: var(--standings-surface);
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--standings-border);
  gap: 8px;
  min-width: 0;
  box-sizing: border-box;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    grid-template-columns: minmax(0, 1fr) max-content;
    padding: 7px 10px;
    border-radius: 10px;
  }

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    column-gap: 6px;
    row-gap: 8px;
  }
`;

const ViewSwitcherShell = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (max-width: 768px) {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: center;

    &:empty {
      display: none;
    }
  }

  @media (max-width: 520px) {
    justify-content: center;
  }
`;

const SelectorWrapper = styled.div`
  width: 100%;
  min-width: 0;

  select {
    border-color: var(--standings-border);
    background-color: var(--standings-item-surface);
    color: ${({ theme }) => theme.text};
  }

  select:focus {
    border-color: var(--standings-primary);
    box-shadow: 0 0 0 3px var(--standings-primary-soft);
  }

  @media (max-width: 768px) {
    grid-column: 1;
    grid-row: 1;
    max-width: none;
  }
`;

const ViewSwitcher = styled.div`
  min-height: 36px;
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(82px, 1fr));
  padding: 3px;
  border-radius: 10px;
  border: 1px solid var(--standings-border);
  background: var(--standings-item-surface);
  flex: 0 0 auto;

  button {
    min-width: 0;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--standings-muted);
    cursor: pointer;
    font-size: 0.76rem;
    font-weight: 900;
    transition: background-color ${v.tabTransition}, color ${v.tabTransition}, border-color ${v.tabTransition};
  }

  button.active {
    background: var(--standings-primary-soft);
    color: var(--standings-primary-strong);
  }

  button:hover,
  button:focus-visible {
    color: var(--standings-primary-strong);
    background: var(--standings-primary-soft);
    outline: none;
  }

  svg {
    flex: 0 0 auto;
    font-size: 1rem;
  }

  @media (max-width: 520px) {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    button {
      font-size: 0.7rem;
      gap: 4px;
    }
  }
`;

const ViewContent = styled.div`
  width: 100%;
  animation: standingsViewFadeIn ${v.tabTransitionDuration} ${v.tabTransitionTiming} forwards;

  @keyframes standingsViewFadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    grid-column: 2;
    grid-row: 1;
    flex-wrap: nowrap;
    justify-content: flex-end;
  }

  @media (max-width: 380px) {
    gap: 6px;
  }
`;

const ToggleContainer = styled.div`
    display: flex; flex-direction: column; align-items: center; gap: 1px; cursor: pointer; user-select: none; min-width: 0;
    .track {
        width: 44px; height: 24px; background-color: ${({ $active }) => $active ? 'var(--standings-success-soft)' : 'var(--standings-item-surface)'};
        border-radius: 20px; position: relative; transition: background-color 0.3s ease, border-color 0.3s ease; border: 1px solid ${({ $active }) => $active ? 'var(--standings-success)' : 'var(--standings-border)'};
    }
    .thumb {
        width: 20px; height: 20px; background-color: ${({ $active }) => $active ? 'var(--standings-success)' : 'var(--standings-muted)'}; border-radius: 50%; position: absolute; top: 1px; left: 1px;
        transform: ${({ $active }) => $active ? 'translateX(20px)' : 'translateX(0)'};
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), background-color 0.3s ease;
    }
    .label {
        font-size: 0.68rem;
        font-weight: 600;
        color: ${({ $active }) => $active ? 'var(--standings-success)' : 'var(--standings-muted)'};
        line-height: 1;
        max-width: 48px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    @media (max-width: 380px) { .label { font-size: 0.62rem; max-width: 46px; } }
`;

const ShareButton = styled.button`
  display: flex; align-items: center; gap: 8px;
  background-color: ${({ $copied }) => $copied ? 'var(--standings-success-soft)' : 'var(--standings-item-surface)'};
  color: ${({ $copied, theme }) => $copied ? 'var(--standings-success)' : theme.text};
  border: 1px solid ${({ $copied }) => $copied ? 'var(--standings-success)' : 'var(--standings-border)'};
  padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, transform 0.3s ease; white-space: nowrap;
  
  &:hover,
  &:focus-visible {
    transform: translateY(-1px);
    background-color: ${({ $copied }) => $copied ? 'var(--standings-success-soft)' : 'var(--standings-primary-soft)'};
    border-color: ${({ $copied }) => $copied ? 'var(--standings-success)' : 'var(--standings-primary)'};
    color: ${({ $copied }) => $copied ? 'var(--standings-success)' : 'var(--standings-primary-strong)'};
    outline: none;
  }

  @media (max-width: 768px) {
    padding: 0; width: 34px; height: 34px; justify-content: center; border-radius: 8px;
    span { display: none; }
  }
`;
