import React from "react";
import styled from "styled-components";
import { ContainerScroll } from "../../../../../index";
import { PendingMatchCard } from "./PendingMatchCard";

export function PlanningSidebar({ matches, isConfirmed, setDraggedMatch, jornadaIndex }) {
  return (
    <SidebarContainer>
      <div className="sb-header">
        <span>Por Asignar ({matches.length})</span>
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
  .sb-header { padding: 10px; border-bottom: 1px solid ${({ theme }) => theme.bg4}; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem; }
  .scroll-wrapper { flex: 1; height: 100%; overflow: hidden; }
  .list-content { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
  .empty { text-align: center; opacity: 0.5; margin-top: 20px; font-size: 0.8rem; }
  @media (max-width: 768px) { width: 100%; height: 300px; }
`;