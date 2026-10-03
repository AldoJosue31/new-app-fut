import React from "react";
import styled from "styled-components";
import { ContainerScroll } from "../../../atomos/ContainerScroll";
import { SortControl } from "../../../moleculas/SortControl";
import { InternalViewHeader } from "../InternalViewHeader";
import { PlayerSkeleton } from "../skeletons";
import {
  EmptyMessage,
  InternalView,
  PlayerChip,
  PlayersGrid,
} from "../styles";

export function TeamDetailPlayersView({
  loadingPlayers,
  onBack,
  onManagePlayers,
  onSortChange,
  players,
  sortConfig,
  sortOptions,
  sortedPlayers,
}) {
  return (
    <InternalView>
      <InternalViewHeader onBack={onBack}>
        {!loadingPlayers && players.length > 0 && (
          <SortControl
            currentSort={sortConfig}
            onSortChange={onSortChange}
            options={sortOptions}
          />
        )}
      </InternalViewHeader>

      {onManagePlayers && <ViewTitle>Jugadores</ViewTitle>}

      <ContainerScroll $maxHeight="70vh">
        <PlayersGrid>
          {loadingPlayers
            ? Array.from({ length: 8 }).map((_, index) => (
                <PlayerSkeleton key={index} />
              ))
            : sortedPlayers.map((player) => (
                <PlayerChip key={player.id}>
                  <img
                    src={player.photo_url || "https://i.ibb.co/5vgZ0fX/hombre.png"}
                    alt={`${player.first_name || "Jugador"} ${player.last_name || ""}`.trim()}
                  />
                  <div className="info-p">
                    <span className="dorsal">#{player.dorsal}</span>
                    <span className="name">
                      {player.first_name} {player.last_name}
                    </span>
                    <span className="pos">{player.position || "Jugador"}</span>
                  </div>
                </PlayerChip>
              ))}

          {!loadingPlayers && players.length === 0 && (
            onManagePlayers ? (
              <EmptyPlayers>
                <EmptyMessage>Aún no hay jugadores registrados.</EmptyMessage>
                <button type="button" onClick={onManagePlayers}>Agregar jugadores</button>
              </EmptyPlayers>
            ) : (
              <EmptyMessage>Sin jugadores.</EmptyMessage>
            )
          )}
        </PlayersGrid>
      </ContainerScroll>
    </InternalView>
  );
}

const ViewTitle = styled.h2`
  margin: 0 0 20px;
  color: ${({ theme }) => theme.text};
  font-size: 1.25rem;
  font-weight: 750;
`;

const EmptyPlayers = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 44px 16px;
  text-align: center;

  button {
    min-height: 44px;
    padding: 10px 16px;
    border: 1px solid ${({ theme }) => theme.primary};
    border-radius: 12px;
    background: ${({ theme }) => theme.primary};
    color: #071e2a;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
  }

  button:hover { background: ${({ theme }) => theme.bg5}; }
  button:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
`;
