import React from "react";
import styled from "styled-components";
import { RiArrowLeftRightLine } from "react-icons/ri";
import { ContainerScroll } from "../../../../../index";
import { PendingMatchCard } from "./PendingMatchCard";

export function PlanningSidebar({ matches, isConfirmed, onSwapClick, setDraggedMatch, jornadaIndex }) {
  return (
    <SidebarContainer>
      <div className="sb-header">
        <span>Por Asignar ({matches.length})</span>
        {!isConfirmed && (
          <button className="btn-add" onClick={onSwapClick} title="Intercambiar Jornada">
            <RiArrowLeftRightLine />
          </button>
        )}
      </div>
      <div className="scroll-wrapper">
        <ContainerScroll>
          <div className="list-content">
            {matches.map((match) => (
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
                jornadaIndex={jornadaIndex}
              />
            ))}
            {matches.length === 0 && <div className="empty">Todo asignado ✅</div>}
          </div>
        </ContainerScroll>
      </div>
    </SidebarContainer>
  );
}

const SidebarContainer = styled.div`
  width: 280px; background: ${({ theme }) => theme.bgcards}; border: 1px solid ${({ theme }) => theme.bg4}; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; height: 100%;
  .sb-header { padding: 10px; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem;
    .btn-add { background: none; border: none; color: ${({ theme }) => theme.text}; cursor: pointer; display: flex; align-items: center; font-size: 1.2rem; transition: all 0.2s; &:hover { transform: scale(1.1); color: #3498db; } }
  }
  .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; }
  .list-content { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
  .empty { text-align: center; opacity: 0.5; margin-top: 20px; font-size: 0.8rem; }
  @media (max-width: 768px) { width: 100%; height: 300px; }
`;