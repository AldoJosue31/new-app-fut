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
            <Badge color="#e74c3c">Pendiente {match.originJornada}</Badge>
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
  background: ${({ theme, $isDelayed, $hasResolution, $isSelected }) =>
    $isSelected
      ? `${v.colorPrincipal}14`
      : $hasResolution
        ? theme.bg4
        : $isDelayed
          ? `${theme.bg4}40`
          : theme.bg2};
  border: 1px solid
    ${({ theme, $isDelayed, $hasResolution, $isSelected }) =>
      $isSelected
        ? v.colorPrincipal
        : $hasResolution
          ? v.colorPrincipal
          : $isDelayed
            ? "#e74c3c"
            : theme.bg4};
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
  opacity: ${({ $isConfirmed }) => ($isConfirmed ? 0.6 : 1)};

  &:hover {
    transform: ${({ $isConfirmed, $hasResolution }) =>
      $isConfirmed || $hasResolution ? "none" : "translateY(-2px)"};
    box-shadow: ${({ $isConfirmed, $hasResolution }) =>
      $isConfirmed || $hasResolution ? "none" : "0 4px 8px rgba(0,0,0,0.1)"};
    border-color: ${({ theme, $isDelayed, $hasResolution, $isSelected }) =>
      $isSelected
        ? v.colorPrincipal
        : $hasResolution
          ? v.colorPrincipal
          : $isDelayed
            ? "#c0392b"
            : theme.primary};
  }

  ${({ $isSelected }) =>
    $isSelected &&
    css`
      box-shadow: 0 0 0 1px ${v.colorPrincipal}, 0 10px 20px rgba(0, 0, 0, 0.12);
      transform: translateY(-1px);
    `}

  .drag-handle {
    color: ${({ theme, $hasResolution, $isSelected }) =>
      $hasResolution ? theme.textFade : $isSelected ? v.colorPrincipal : theme.text2};
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
      color: ${({ theme }) => theme.text2};
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
      color: ${({ theme }) => theme.text2};
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: ${({ theme }) => theme.bg4};
        color: ${({ theme }) => theme.text};
      }

      &.revert {
        color: #e74c3c;

        &:hover {
          background: #e74c3c20;
        }
      }

      &.resolve {
        color: ${v.colorPrincipal};

        &:hover {
          background: ${v.colorPrincipal}20;
        }
      }
    }
  }
`;

const ResolutionBadge = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  color: ${({ $type }) => ($type === "default" ? "#2ecc71" : "#f39c12")};
  background: ${({ $type }) => ($type === "default" ? "#2ecc7120" : "#f39c1220")};
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
  color: ${({ $isSelected }) => ($isSelected ? v.colorPrincipal : "inherit")};
  opacity: ${({ $isSelected }) => ($isSelected ? 1 : 0.6)};
`;
