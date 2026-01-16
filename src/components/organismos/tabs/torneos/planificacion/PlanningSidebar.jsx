import React, { useMemo } from "react";
import styled from "styled-components";
import { ContainerScroll } from "../../../../../index";
import { PendingMatchCard } from "./PendingMatchCard";

export function PlanningSidebar({ matches, isConfirmed, setDraggedMatch, jornadaIndex }) {
  
  // Separar visualmente para mejor UX
  const { delayed, current } = useMemo(() => {
    const currentNum = jornadaIndex + 1;
    return matches.reduce((acc, m) => {
        const mNum = m.originJornada ? parseInt(m.originJornada.split(' ')[1]) : 999;
        if (mNum < currentNum) acc.delayed.push(m);
        else acc.current.push(m);
        return acc;
    }, { delayed: [], current: [] });
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
                {delayed.length > 0 && <span className="section-title">De esta Jornada</span>}
                {current.map((match) => (
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

            {matches.length === 0 && <div className="empty">Todo asignado ✅</div>}
          </div>
        </ContainerScroll>
      </div>
    </SidebarContainer>
  );
}

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
  
  .scroll-wrapper { 
    flex: 1; 
    height: 100%; 
    overflow: hidden; 
  }
  
  .list-content { 
    padding: 10px; 
    display: flex; 
    flex-direction: column; 
    gap: 15px; 
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: ${({theme}) => theme.text2};
    margin-bottom: 2px;
    
    &.warning {
        color: #e74c3c;
    }
  }

  .empty { 
    text-align: center; 
    opacity: 0.5; 
    margin-top: 20px; 
    font-size: 0.8rem; 
  }
  
  @media (max-width: 768px) { width: 100%; height: 300px; }
`;