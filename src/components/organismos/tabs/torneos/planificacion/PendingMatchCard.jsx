import React from "react";
import styled from "styled-components";
import { Badge } from "../../../../../index"; 
import { RiDragMove2Line, RiSettings3Line, RiCloseLine, RiLockLine } from "react-icons/ri";
import { v } from "../../../../../styles/variables";
import { parseJornadaNumber } from "../../../../../utils/jornadaUtils";

export const PendingMatchCard = ({
  match,
  isConfirmed,
  onDragStart,
  onDragEnd,
  currentJornadaNumber = 1,
  onOpenResolution,
  onClearResolution,
}) => {
  const matchJornadaNum = parseJornadaNumber(match.originJornada, 999);
  const isDelayed = matchJornadaNum < currentJornadaNumber;
  const hasResolution = !!match.resolution;

  return (
    <Card 
      draggable={!isConfirmed && !hasResolution} 
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      $isConfirmed={isConfirmed}
      $isDelayed={isDelayed}
      $hasResolution={hasResolution}
    >
      <div className="drag-handle">
        {hasResolution ? <RiLockLine /> : <RiDragMove2Line />}
      </div>
      
      <div className="info">
        <div className="teams">
            <span className="team-name">{match.local?.name || "Local"}</span>
            <span className="vs">vs</span>
            <span className="team-name">{match.visitante?.name || "Visitante"}</span>
        </div>
        
        {isDelayed && !hasResolution && (
            <div className="meta">
                 <Badge color="#e74c3c" >
                    Pendiente {match.originJornada}
                 </Badge>
            </div>
        )}

        {hasResolution && (
             <ResolutionBadge $type={match.resolution.type}>
               {match.resolution.type === 'default'
                 ? `Victoria Default: ${match.resolution.winnerName}`
                 : 'Se Dejará Pendiente'}
             </ResolutionBadge>
        )}
      </div>

      {/* Condición: Solo mostramos las acciones si no es una jornada confirmada Y 
          (o no es un partido retrasado, o sí lo es pero tiene una resolución que revertir) */}
      {!isConfirmed && (!isDelayed || hasResolution) && (
         <div className="actions">
            {hasResolution ? (
               <button className="icon-btn revert" onClick={(e) => { e.stopPropagation(); onClearResolution(match.id); }} title="Revertir Decisión">
                  <RiCloseLine />
               </button>
            ) : (
               <button className="icon-btn resolve" onClick={(e) => { e.stopPropagation(); onOpenResolution(match); }} title="Definir Partido">
                  <RiSettings3Line />
               </button>
            )}
         </div>
      )}
    </Card>
  );
};

const Card = styled.div`
  background: ${({ theme, $isDelayed, $hasResolution }) => $hasResolution ? theme.bg4 : ($isDelayed ? theme.bg4 + '40' : theme.bg2)};
  border: 1px solid ${({ theme, $isDelayed, $hasResolution }) => $hasResolution ? v.colorPrincipal : ($isDelayed ? '#e74c3c' : theme.bg4)};
  border-left: 4px solid ${({ theme, $isDelayed, $hasResolution }) => $hasResolution ? v.colorPrincipal : ($isDelayed ? '#e74c3c' : theme.gray300)};
  padding: 6px 10px; /* Reducido de 10px a 6px 10px para hacerlo más delgado */
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px; /* Reducido para juntar más los elementos */
  cursor: ${({ $isConfirmed, $hasResolution }) => ($isConfirmed || $hasResolution) ? 'default' : 'grab'};
  transition: all 0.2s;
  opacity: ${({ $isConfirmed }) => $isConfirmed ? 0.6 : 1};

  &:hover {
    transform: ${({ $isConfirmed, $hasResolution }) => ($isConfirmed || $hasResolution) ? 'none' : 'translateY(-2px)'};
    box-shadow: ${({ $isConfirmed, $hasResolution }) => ($isConfirmed || $hasResolution) ? 'none' : '0 4px 8px rgba(0,0,0,0.1)'};
    border-color: ${({ theme, $isDelayed, $hasResolution }) => $hasResolution ? v.colorPrincipal : ($isDelayed ? '#c0392b' : theme.primary)};
  }

  .drag-handle {
    color: ${({ theme, $hasResolution }) => $hasResolution ? theme.textFade : theme.text2};
    cursor: ${({ $hasResolution }) => $hasResolution ? 'default' : 'grab'};
    display: flex;
    align-items: center;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px; /* Reducido para apretar el texto interior */
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
    margin-top: 2px;
  }

  .actions {
    display: flex;
    align-items: center;
    
    .icon-btn {
      background: none;
      border: none;
      color: ${({ theme }) => theme.text2};
      font-size: 1.1rem; /* Reducido ligeramente el tamaño del icono */
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px; /* Reducido el padding del botón */
      border-radius: 6px;
      transition: all 0.2s;

      &:hover { background: ${({ theme }) => theme.bg4}; color: ${({ theme }) => theme.text}; }
      
      &.revert { color: #e74c3c; &:hover { background: #e74c3c20; } }
      &.resolve { color: ${v.colorPrincipal}; &:hover { background: ${v.colorPrincipal}20; } }
    }
  }
`;

const ResolutionBadge = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  color: ${({ $type }) => $type === 'default' ? '#2ecc71' : '#f39c12'};
  background: ${({ $type }) => $type === 'default' ? '#2ecc7120' : '#f39c1220'};
  padding: 2px 5px; /* Ligeramente más delgado */
  border-radius: 4px;
  display: inline-block;
  align-self: flex-start;
  margin-top: 2px;
`;
