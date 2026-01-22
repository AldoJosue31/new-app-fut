import React, { useMemo } from "react";
import styled from "styled-components";
import { ContainerScroll } from "../../../../../index";
import { PendingMatchCard } from "./PendingMatchCard";
import { v } from "../../../../../styles/variables";

export function PlanningSidebar({ matches, isConfirmed, setDraggedMatch, jornadaIndex }) {
  
  const { delayed, current } = useMemo(() => {
    const currentNum = jornadaIndex + 1;
    
    const result = matches.reduce((acc, m) => {
        const mNum = m.originJornada ? parseInt(m.originJornada.split(' ')[1]) : 999;
        
        if (mNum < currentNum) {
            acc.delayed.push(m);
        } else {
            acc.current.push(m);
        }
        return acc;
    }, { delayed: [], current: [] });

    // Ordenar: Descansos primero para que queden fijos arriba
    result.current.sort((a, b) => {
        if (a.isByeMatch && !b.isByeMatch) return -1;
        if (!a.isByeMatch && b.isByeMatch) return 1;
        return 0;
    });

    return result;
  }, [matches, jornadaIndex]);

  return (
    <SidebarContainer>
      <div className="sb-header">
        <span>Por Asignar ({matches.length})</span>
      </div>
      <div className="scroll-wrapper">
        <ContainerScroll>
          <div className="list-content">
            
            {/* Sección de Atrasados */}
            {delayed.length > 0 && (
                <div className="section-group">
                    <span className="section-title warning">Pendientes Atrasados ({delayed.length})</span>
                    {delayed.map((match) => (
                        <PendingMatchCard
                            key={match.id}
                            match={match}
                            isConfirmed={isConfirmed}
                            onDragStart={(e) => {
                                if (!isConfirmed) {
                                    setDraggedMatch(match);
                                    e.dataTransfer.setData("text", match.id);
                                }
                            }}
                            currentJornadaIndex={jornadaIndex}
                        />
                    ))}
                </div>
            )}

            {/* Sección de Jornada Actual */}
            <div className="section-group">
                {(delayed.length > 0 || current.length > 0) && <span className="section-title">De esta Jornada</span>}
                
                {current.map((match) => {
                    // CASO: EQUIPO QUE DESCANSA
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

                    // CASO: PARTIDO NORMAL (Arrastrable)
                    return (
                        <PendingMatchCard
                            key={match.id}
                            match={match}
                            isConfirmed={isConfirmed}
                            onDragStart={(e) => {
                                if (!isConfirmed) {
                                    setDraggedMatch(match);
                                    e.dataTransfer.setData("text", match.id);
                                }
                            }}
                            currentJornadaIndex={jornadaIndex}
                        />
                    );
                })}
            </div>

            {matches.length === 0 && <div className="empty">Todo asignado ✅</div>}
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
  border-radius: 10px; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
  height: 100%;

  .sb-header { 
    padding: 10px; 
    border-bottom: 1px solid ${({ theme }) => theme.bg4}; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    font-weight: 700; 
    font-size: 0.9rem; 
  }
  
  .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; }
  .list-content { padding: 10px; display: flex; flex-direction: column; gap: 15px; }
  .section-group { display: flex; flex-direction: column; gap: 8px; }

  .section-title {
    font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    color: ${({theme}) => theme.text2}; margin-bottom: 2px;
    &.warning { color: #e74c3c; }
  }

  .empty { text-align: center; opacity: 0.5; margin-top: 20px; font-size: 0.8rem; }
  
  @media (max-width: 768px) { width: 100%; height: 300px; }
`;

// Tarjeta Estilizada para el Descanso (Minimalista)
const RestingCard = styled.div`
    background: ${({ theme }) => theme.bg2}; 
    border: 1px solid ${({ theme }) => theme.bg4};
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
    user-select: none;
    
    /* Barra lateral indicadora */
    &::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 4px;
        background: ${v.colorPrincipal};
    }

    .resting-indicator {
        display: flex;
        align-items: center;
        
        span {
            font-size: 0.7rem;
            font-weight: 800;
            color: ${({ theme }) => theme.textFade};
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    }

    .match-content {
        flex: 1;
        display: flex;
        align-items: center;
    }

    .team-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: ${({ theme }) => theme.text};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;