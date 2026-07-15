// src/components/organismos/tabs/torneos/planificacion/PlanningSidebar.jsx
import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { ContainerScroll } from "../../../../atomos/ContainerScroll";
import { PendingMatchCard } from "./PendingMatchCard";
import { v } from "../../../../../styles/variables";
import { RiArrowDownSLine, RiArrowUpSLine, RiStackLine } from "react-icons/ri";
import { parseJornadaNumber } from "../../../../../utils/jornadaUtils";

export function PlanningSidebar({
  matches = [],
  isConfirmed,
  setDraggedMatch,
  onDragEnd,
  jornadaIndex,
  currentJornadaNumber = jornadaIndex + 1,
  onOpenResolution,
  onClearResolution,
  isRepositionMode = false,
  onSelectMatch,
  selectedMatchId = null,
  isTapSelectionEnabled = false,
  isCollapsed = false,
  onToggleCollapse,
  canCollapse = false,
  isPlayoffMode = false,
}) {
  const [isDelayedExpanded, setIsDelayedExpanded] = useState(false);

  const { delayed, current } = useMemo(() => {
    const visibleMatches = isPlayoffMode
      ? matches.filter((match) => !match.isByeMatch)
      : matches;

    if (isPlayoffMode) {
      return { delayed: [], current: visibleMatches };
    }

    const currentNum = currentJornadaNumber;
    
    const result = visibleMatches.reduce((acc, m) => {
        if (!m.originJornada) {
             acc.current.push(m);
             return acc;
        }

        const mNum = parseJornadaNumber(m.originJornada, 999);
        
        if (mNum < currentNum) {
            acc.delayed.push(m);
        } else {
            acc.current.push(m);
        }
        return acc;
    }, { delayed: [], current: [] });

    result.current.sort((a, b) => {
        if (a.isByeMatch && !b.isByeMatch) return -1;
        if (!a.isByeMatch && b.isByeMatch) return 1;
        return 0;
    });

    return result;
  }, [isPlayoffMode, matches, currentJornadaNumber]);

  const visibleMatchesCount = delayed.length + current.length;

  return (
    <SidebarContainer $isCollapsed={isCollapsed}>
      <div className="sb-header">
        <span>Por Asignar ({visibleMatchesCount})</span>
        {canCollapse && (
          <button
            type="button"
            className="collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expandir pendientes" : "Contraer pendientes"}
            aria-label={isCollapsed ? "Expandir pendientes" : "Contraer pendientes"}
          >
            {isCollapsed ? <RiArrowDownSLine /> : <RiArrowUpSLine />}
          </button>
        )}
      </div>
      <div className="scroll-wrapper">
        <ContainerScroll>
          <div className="list-content">
            {isRepositionMode && (
              <ModeHint>
                Solo hay pendientes arrastrados de jornadas anteriores. Esta
                confirmacion se tratara como jornada de reposicion.
              </ModeHint>
            )}
            
            {delayed.length > 0 && (
                <div className="section-group delayed-group">
                    <StackedHeader 
                        $isOpen={isDelayedExpanded} 
                        onClick={() => setIsDelayedExpanded(!isDelayedExpanded)}
                    >
                        {delayed.length >= 3 && <div className="stacked-bg-2"></div>}
                        {delayed.length >= 2 && <div className="stacked-bg-1"></div>}
                        
                        <div className="stacked-card">
                            <div className="warning-text">
                                <RiStackLine size={18} />
                                <span>Partidos Pendientes ({delayed.length})</span>
                            </div>
                            <div className="icon-wrapper">
                                {isDelayedExpanded ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
                            </div>
                        </div>
                    </StackedHeader>

                    <ExpandedContent $isOpen={isDelayedExpanded}>
                        <div className="content-inner">
                            {delayed.map((match) => (
                                <PendingMatchCard
                                    key={match.id}
                                    match={match}
                                    isConfirmed={isConfirmed}
                                    onDragStart={(e) => {
                                        if (!isConfirmed && !match.resolution) {
                                            setDraggedMatch(match);
                                            e.dataTransfer.setData("text", match.id);
                                        }
                                    }}
                                    onDragEnd={onDragEnd}
                                    currentJornadaNumber={currentJornadaNumber}
                                    onOpenResolution={onOpenResolution}
                                    onClearResolution={onClearResolution}
                                    onSelect={onSelectMatch}
                                    isSelected={selectedMatchId === match.id}
                                    isTapSelectionEnabled={isTapSelectionEnabled}
                                />
                            ))}
                        </div>
                    </ExpandedContent>
                </div>
            )}

            <div className="section-group">
                {(delayed.length > 0 && current.length > 0) && (
                    <span className="section-title">
                        {isPlayoffMode ? "De esta Fase" : "De esta Jornada"}
                    </span>
                )}
                
                {current.map((match) => {
                    if (match.isByeMatch) {
                        return (
                            <RestingCard key={match.id}>
                                <div className="resting-indicator">
                                    <span>DESCANSA:</span>
                                </div>
                                <div className="match-content">
                                    <span className="team-name">{match.local.name}</span>
                                </div>
                            </RestingCard>
                        );
                    }

                    return (
                        <PendingMatchCard
                            key={match.id}
                            match={match}
                            isConfirmed={isConfirmed}
                            onDragStart={(e) => {
                                if (!isConfirmed && !match.resolution) {
                                    setDraggedMatch(match);
                                    e.dataTransfer.setData("text", match.id);
                                }
                            }}
                            onDragEnd={onDragEnd}
                            currentJornadaNumber={currentJornadaNumber}
                            onOpenResolution={onOpenResolution}
                            onClearResolution={onClearResolution}
                            onSelect={onSelectMatch}
                            isSelected={selectedMatchId === match.id}
                            isTapSelectionEnabled={isTapSelectionEnabled}
                        />
                    );
                })}
            </div>

            {visibleMatchesCount === 0 && <div className="empty">Todo asignado</div>}
          </div>
        </ContainerScroll>
      </div>
    </SidebarContainer>
  );
}

// --- STYLES ---

const SidebarContainer = styled.div`
  width: 280px; 
  background: ${({ theme }) => theme.bgcards}; 
  border: 1px solid ${({ theme }) => theme.bg4}; 
  border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; height: 100%;
  transition: max-height 0.34s cubic-bezier(0.22, 1, 0.36, 1), transform 0.28s ease, box-shadow 0.28s ease;
  
  .sb-header { padding: 10px; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem; gap: 8px; }
  .collapse-btn {
    display: none;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 999px;
    background: ${({ theme }) => theme.bg4};
    color: ${({ theme }) => theme.text};
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; transition: opacity 0.26s ease, transform 0.3s ease; }
  .list-content { padding: 10px; display: flex; flex-direction: column; gap: 15px; }
  
  .section-group { display: flex; flex-direction: column; gap: 8px; }
  .delayed-group { margin-bottom: 5px; }
  
  .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: ${({theme}) => theme.text2}; margin-bottom: 2px; }
  
  .empty { text-align: center; opacity: 0.5; margin-top: 20px; font-size: 0.8rem; }
  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    max-height: ${({ $isCollapsed }) => ($isCollapsed ? '64px' : '300px')};
    box-shadow: ${({ $isCollapsed }) =>
      $isCollapsed ? '0 10px 18px rgba(0,0,0,0.08)' : 'none'};

    .collapse-btn {
      display: inline-flex;
    }

    .scroll-wrapper {
      opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
      transform: translateY(${({ $isCollapsed }) => ($isCollapsed ? '-10px' : '0')});
      pointer-events: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'auto')};
    }
  }
`;

const StackedHeader = styled.div`
  position: relative;
  cursor: pointer;
  margin-bottom: ${({ $isOpen }) => ($isOpen ? '0px' : '12px')};
  transition: all 0.3s ease-in-out;

  &:hover {
    transform: translateY(-2px);
  }

  .stacked-bg-2 {
    position: absolute;
    bottom: -8px;
    left: 6%;
    width: 88%;
    height: 100%;
    background: ${({ theme }) => theme.bg4};
    border: 1px solid #e74c3c60;
    border-radius: 6px;
    z-index: 1;
    opacity: ${({ $isOpen }) => ($isOpen ? '0' : '0.5')};
    transform: ${({ $isOpen }) => ($isOpen ? 'translateY(-10px)' : 'translateY(0)')};
    transition: all 0.3s ease-in-out;
    pointer-events: none;
  }

  .stacked-bg-1 {
    position: absolute;
    bottom: -4px;
    left: 3%;
    width: 94%;
    height: 100%;
    background: ${({ theme }) => theme.bg4};
    border: 1px solid #e74c3c90;
    border-radius: 6px;
    z-index: 2;
    opacity: ${({ $isOpen }) => ($isOpen ? '0' : '0.8')};
    transform: ${({ $isOpen }) => ($isOpen ? 'translateY(-5px)' : 'translateY(0)')};
    transition: all 0.3s ease-in-out;
    pointer-events: none;
  }

  .stacked-card {
    position: relative;
    z-index: 3;
    background: ${({ theme, $isOpen }) => ($isOpen ? theme.bg4 + '30' : theme.bg2)};
    border: 1px solid ${({ $isOpen }) => ($isOpen ? '#e74c3c50' : '#e74c3c')};
    border-left: 4px solid #e74c3c;
    padding: 12px 15px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: ${({ $isOpen }) => ($isOpen ? 'none' : '0 4px 8px rgba(0,0,0,0.1)')};
    transition: all 0.3s ease-in-out;

    .warning-text {
      color: #e74c3c;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-wrapper {
      color: #e74c3c;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease-in-out;
    }
  }
`;

const ExpandedContent = styled.div`
  display: grid;
  grid-template-rows: ${({ $isOpen }) => ($isOpen ? '1fr' : '0fr')};
  opacity: ${({ $isOpen }) => ($isOpen ? '1' : '0')};
  margin-top: ${({ $isOpen }) => ($isOpen ? '8px' : '0')};
  transition: grid-template-rows 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out;

  .content-inner {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: ${({ $isOpen }) => ($isOpen ? '4px' : '0')};
  }
`;

const RestingCard = styled.div`
    background: ${({ theme }) => theme.bg2}; border: 1px solid ${({ theme }) => theme.bg4}; border-radius: 8px;
    padding: 12px; display: flex; align-items: center; gap: 10px; position: relative; overflow: hidden; user-select: none;
    &::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${v.colorPrincipal}; }
    .resting-indicator { display: flex; align-items: center; span { font-size: 0.7rem; font-weight: 800; color: ${({ theme }) => theme.textFade}; text-transform: uppercase; letter-spacing: 0.5px; } }
    .match-content { flex: 1; display: flex; align-items: center; }
    .team-name { font-size: 0.95rem; font-weight: 600; color: ${({ theme }) => theme.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const ModeHint = styled.div`
  background: #f39c1218;
  color: #f39c12;
  border: 1px solid #f39c1240;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.8rem;
  line-height: 1.45;
  font-weight: 600;
`;
