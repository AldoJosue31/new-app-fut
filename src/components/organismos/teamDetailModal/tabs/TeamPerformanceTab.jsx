import React from "react";
import { RiFootballLine, RiUserSmileLine } from "react-icons/ri";
import { StatTableRowSkeleton } from "../skeletons";
import {
  CardIcon,
  PlayerCell,
  SectionContainer,
  SectionLabel,
  SortIndicator,
  StatsPanel,
  StyledTable,
  TableWrapper,
} from "../styles";

function SortIcon({ columnKey, sortConfig }) {
  if (sortConfig?.key !== columnKey) return null;

  return (
    <SortIndicator>
      {sortConfig.direction === "ascending" ? "▲" : "▼"}
    </SortIndicator>
  );
}

export function TeamPerformanceTab({
  loadingStats,
  requestStatSort,
  sortedStats,
  statSortConfig,
}) {
  return (
    <StatsPanel>
      <SectionContainer>
        <SectionLabel>Rendimiento Individual</SectionLabel>
        <TableWrapper>
          <StyledTable>
            <thead>
              <tr>
                <th className="col-player">
                  <button type="button" className="sort-button th-content" onClick={() => requestStatSort("name")}>
                    Jugador <SortIcon columnKey="name" sortConfig={statSortConfig} />
                  </button>
                </th>
                <th className="col-stat">
                  <button type="button" className="sort-button th-content centered" onClick={() => requestStatSort("matches")} aria-label="Ordenar por partidos jugados">
                    <RiUserSmileLine size={14} />
                  </button>
                </th>
                <th className="col-stat">
                  <button type="button" className="sort-button th-content centered" onClick={() => requestStatSort("goals")} aria-label="Ordenar por goles">
                    <RiFootballLine size={14} />
                  </button>
                </th>
                <th className="col-stat">
                  <button type="button" className="sort-button th-content centered" onClick={() => requestStatSort("yellow")} aria-label="Ordenar por tarjetas amarillas">
                    <CardIcon $color="#f1c40f" />
                  </button>
                </th>
                <th className="col-stat">
                  <button type="button" className="sort-button th-content centered" onClick={() => requestStatSort("red")} aria-label="Ordenar por tarjetas rojas">
                    <CardIcon $color="#e74c3c" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingStats ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <StatTableRowSkeleton key={index} />
                ))
              ) : sortedStats.length > 0 ? (
                sortedStats.map((player) => {
                  const playerName = player.name || "Jugador";

                  return (
                    <tr key={player.id}>
                      <td className="col-player">
                        <PlayerCell>
                          <div className="avatar-mini">
                            {player.photo ? (
                              <img src={player.photo} alt={playerName} />
                            ) : (
                              <span>{playerName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="p-info">
                            <span className="p-name">{playerName}</span>
                            {player.dorsal !== "?" && player.dorsal != null && (
                              <span className="p-dorsal">#{player.dorsal}</span>
                            )}
                          </div>
                        </PlayerCell>
                      </td>
                      <td className="col-stat">{player.matches}</td>
                      <td className="col-stat bold">{player.goals}</td>
                      <td className="col-stat">{player.yellow}</td>
                      <td className="col-stat">{player.red}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    Sin estadísticas
                  </td>
                </tr>
              )}
            </tbody>
          </StyledTable>
        </TableWrapper>
      </SectionContainer>
    </StatsPanel>
  );
}
