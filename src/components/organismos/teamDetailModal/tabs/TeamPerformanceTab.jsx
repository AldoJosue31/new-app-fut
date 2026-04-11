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
                <th
                  className="col-player clickable"
                  onClick={() => requestStatSort("name")}
                >
                  <div className="th-content">
                    Jugador <SortIcon columnKey="name" sortConfig={statSortConfig} />
                  </div>
                </th>
                <th
                  className="col-stat clickable"
                  onClick={() => requestStatSort("matches")}
                >
                  <div className="th-content centered">
                    <RiUserSmileLine size={14} />
                  </div>
                </th>
                <th
                  className="col-stat clickable"
                  onClick={() => requestStatSort("goals")}
                >
                  <div className="th-content centered">
                    <RiFootballLine size={14} />
                  </div>
                </th>
                <th
                  className="col-stat clickable"
                  onClick={() => requestStatSort("yellow")}
                >
                  <div className="th-content centered">
                    <CardIcon $color="#f1c40f" />
                  </div>
                </th>
                <th
                  className="col-stat clickable"
                  onClick={() => requestStatSort("red")}
                >
                  <div className="th-content centered">
                    <CardIcon $color="#e74c3c" />
                  </div>
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
