import React from "react";
import styled, { css } from "styled-components";
import { Badge } from "../../../../atomos/Badge";
import {
  RiCheckLine,
  RiDragMove2Line,
  RiSettings3Line,
  RiCloseLine,
  RiLockLine,
} from "react-icons/ri";
import { parseJornadaNumber } from "../../../../../utils/jornadaUtils";

export const PendingMatchCard = ({
  match,
  isConfirmed,
  onDragStart,
  onDragEnd,
  currentJornadaNumber = 1,
  onOpenResolution,
  onClearResolution,
  onSelect,
  isSelected = false,
  isTapSelectionEnabled = false,
}) => {
  const matchJornadaNum = parseJornadaNumber(match.originJornada, 999);
  const isDelayed = matchJornadaNum < currentJornadaNumber;
  const hasResolution = !!match.resolution;
  const canInteract = !isConfirmed && !hasResolution;

  const handleCardClick = () => {
    if (!isTapSelectionEnabled || !canInteract) return;
    onSelect?.(match);
  };

  return (
    <Card
      draggable={canInteract}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      $isConfirmed={isConfirmed}
      $isDelayed={isDelayed}
      $hasResolution={hasResolution}
      $isSelected={isSelected}
      $isTapSelectionEnabled={isTapSelectionEnabled}
      role={isTapSelectionEnabled && canInteract ? "button" : undefined}
      tabIndex={isTapSelectionEnabled && canInteract ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && isTapSelectionEnabled && canInteract) {
          e.preventDefault();
          onSelect?.(match);
        }
      }}
    >
      <div className="drag-handle">
        {hasResolution ? (
          <RiLockLine />
        ) : isSelected ? (
          <RiCheckLine />
        ) : (
          <RiDragMove2Line />
        )}
      </div>

      <div className="info">
        <div className="teams">
          <span className="team-name">{match.local?.name || "Local"}</span>
          <span className="vs">vs</span>
          <span className="team-name">{match.visitante?.name || "Visitante"}</span>
        </div>

        {isDelayed && !hasResolution && (
          <div className="meta">
            <DelayedBadge>Pendiente {match.originJornada}</DelayedBadge>
          </div>
        )}

        {hasResolution && (
          <ResolutionBadge $type={match.resolution.type}>
            {match.resolution.type === "default"
              ? `Victoria Default: ${match.resolution.winnerName}`
              : "Se dejara pendiente"}
          </ResolutionBadge>
        )}

        {isTapSelectionEnabled && canInteract && (
          <TapHint $isSelected={isSelected}>
            {isSelected ? "Toca una fila para soltarlo" : "Toca para seleccionar"}
          </TapHint>
        )}
      </div>

      {!isConfirmed && (!isDelayed || hasResolution) && (
        <div className="actions">
          {hasResolution ? (
            <button type="button"
              aria-label="Revertir decisión del partido"
              className="icon-btn revert"
              onClick={(e) => {
                e.stopPropagation();
                onClearResolution(match.id);
              }}
              title="Revertir decision"
            >
              <RiCloseLine />
            </button>
          ) : (
            <button type="button"
              aria-label="Definir resolución del partido"
              className="icon-btn resolve"
              onClick={(e) => {
                e.stopPropagation();
                onOpenResolution(match);
              }}
              title="Definir partido"
            >
              <RiSettings3Line />
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

const Card = styled.div`
  background: ${({ theme, $isSelected }) =>
    $isSelected ? theme.bgcards : theme.bg3};
  border: 1px solid
    ${({ theme, $isDelayed, $hasResolution, $isSelected }) =>
      $isSelected || $hasResolution
        ? theme.tournamentDashboard?.hero?.accentStrong || theme.color1
        : $isDelayed
          ? theme.tournamentDashboard?.metrics?.danger || "#e74c3c"
          : theme.tournamentDashboard?.border || theme.bg5};
  color: ${({ theme }) => theme.text};
  padding: 6px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: ${({ $isConfirmed, $hasResolution, $isTapSelectionEnabled }) =>
    $isConfirmed || $hasResolution
      ? "default"
      : $isTapSelectionEnabled
        ? "pointer"
        : "grab"};
  transition: all 0.2s;
  opacity: ${({ $isConfirmed }) => ($isConfirmed ? 0.85 : 1)};

  &:hover {
    transform: ${({ $isConfirmed, $hasResolution }) =>
      $isConfirmed || $hasResolution ? "none" : "translateY(-2px)"};
    box-shadow: ${({ $isConfirmed, $hasResolution }) =>
      $isConfirmed || $hasResolution ? "none" : "0 4px 8px rgba(0,0,0,0.1)"};
    border-color: ${({ theme, $isDelayed, $hasResolution, $isSelected }) =>
      $isDelayed && !$hasResolution && !$isSelected
        ? theme.tournamentDashboard?.metrics?.danger || "#e74c3c"
        : theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
  }

  &:focus-visible {
    outline: 2px solid
      ${({ theme }) =>
        theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    outline-offset: 2px;
  }

  ${({ $isSelected }) =>
    $isSelected &&
    css`
      outline: 2px solid
        ${({ theme }) =>
          theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
      outline-offset: 2px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
      transform: translateY(-1px);
    `}

  .drag-handle {
    color: ${({ theme }) =>
      theme.tournamentDashboard?.hero?.accentStrong || theme.color1};
    cursor: ${({ $hasResolution, $isTapSelectionEnabled }) =>
      $hasResolution ? "default" : $isTapSelectionEnabled ? "pointer" : "grab"};
    display: flex;
    align-items: center;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .teams {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;

    .vs {
      color: ${({ theme }) => theme.colorSubtitle};
      font-size: 0.7rem;
    }

    .team-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90px;
    }
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
      color: ${({ theme }) => theme.colorSubtitle};
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: ${({ theme }) => theme.bg6};
        color: ${({ theme }) => theme.text};
      }

      &.revert {
        color: ${({ theme }) =>
          theme.tournamentDashboard?.metrics?.danger || "#e74c3c"};

        &:hover {
          background: ${({ theme }) =>
            `${theme.tournamentDashboard?.metrics?.danger || "#e74c3c"}20`};
        }
      }

      &.resolve {
        color: ${({ theme }) =>
          theme.tournamentDashboard?.hero?.accentStrong || theme.color1};

        &:hover {
          background: ${({ theme }) => theme.bg6};
        }
      }
    }
  }
`;

const DelayedBadge = styled(Badge)`
  background: ${({ theme }) =>
    `${theme.tournamentDashboard?.metrics?.danger || "#e74c3c"}18`};
  color: ${({ theme }) => theme.text};
  border-color: ${({ theme }) =>
    `${theme.tournamentDashboard?.metrics?.danger || "#e74c3c"}40`};
`;

const ResolutionBadge = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  color: ${({ theme, $type }) =>
    $type === "default"
      ? theme.tournamentDashboard?.metrics?.accentStrong || theme.text
      : theme.text};
  background: ${({ theme, $type }) =>
    $type === "default"
      ? theme.tournamentDashboard?.metrics?.accentSoft || theme.bg6
      : `${theme.tournamentDashboard?.metrics?.warning || "#f39c12"}20`};
  padding: 2px 5px;
  border-radius: 4px;
  display: inline-block;
  align-self: flex-start;
  margin-top: 2px;
`;

const TapHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 0.65rem;
  font-weight: 800;
  color: ${({ theme, $isSelected }) =>
    $isSelected ? theme.text : theme.colorSubtitle};
`;
