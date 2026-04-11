import React from "react";
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
            <EmptyMessage>Sin jugadores.</EmptyMessage>
          )}
        </PlayersGrid>
      </ContainerScroll>
    </InternalView>
  );
}
