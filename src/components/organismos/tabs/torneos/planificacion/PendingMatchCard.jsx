import React from "react";
import styled from "styled-components";
import { Badge } from "../../../../../index"; 
import { RiDragMove2Line } from "react-icons/ri";

export const PendingMatchCard = ({ match, isConfirmed, onDragStart, currentJornadaIndex }) => {
  // Detectar si es de una jornada anterior a la actual
  const matchJornadaNum = match.originJornada ? parseInt(match.originJornada.split(' ')[1]) : 999;
  const isDelayed = matchJornadaNum < (currentJornadaIndex + 1);

  return (
    <Card 
      draggable={!isConfirmed} 
      onDragStart={onDragStart}
      $isConfirmed={isConfirmed}
      $isDelayed={isDelayed}
    >
      <div className="drag-handle">
        <RiDragMove2Line />
      </div>
      
      <div className="info">
        <div className="teams">
            <span className="team-name">{match.local?.name || "Local"}</span>
            <span className="vs">vs</span>
            <span className="team-name">{match.visitante?.name || "Visitante"}</span>
        </div>
        
        {isDelayed && (
            <div className="meta">
                 <Badge color="#e74c3c" >
                    Pendiente {match.originJornada}
                 </Badge>
            </div>
        )}
      </div>
    </Card>
  );
};

const Card = styled.div`
  background: ${({ theme, $isDelayed }) => $isDelayed ? theme.bg4 + '40' : theme.bg2};
  border: 1px solid ${({ theme, $isDelayed }) => $isDelayed ? '#e74c3c' : theme.bg4};
  border-left: 4px solid ${({ theme, $isDelayed }) => $isDelayed ? '#e74c3c' : theme.gray300};
  padding: 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: ${({ $isConfirmed }) => $isConfirmed ? 'default' : 'grab'};
  transition: all 0.2s;
  opacity: ${({ $isConfirmed }) => $isConfirmed ? 0.6 : 1};

  &:hover {
    transform: ${({ $isConfirmed }) => $isConfirmed ? 'none' : 'translateY(-2px)'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-color: ${({ theme, $isDelayed }) => $isDelayed ? '#c0392b' : theme.primary};
  }

  .drag-handle {
    color: ${({ theme }) => theme.text2};
    cursor: grab;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .teams {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    
    .vs { color: ${({theme})=>theme.text2}; font-size: 0.7rem; }
    .team-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; }
  }

  .meta {
    display: flex;
    justify-content: flex-start;
  }
`;