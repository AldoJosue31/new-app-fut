import React from "react";
import styled from "styled-components";
import { InternalViewHeader } from "../teamDetailModal/InternalViewHeader";

const columns = [
  ["PJ", "Partidos jugados", "pj"],
  ["G", "Ganados", "g"],
  ["E", "Empatados", "e"],
  ["P", "Perdidos", "p"],
  ["GF", "Goles a favor", "gf"],
  ["GC", "Goles en contra", "gc"],
  ["DG", "Diferencia de goles", "dg"],
  ["PTS", "Puntos", "pts"],
];

export function DelegateStandingsView({ onBack, standings = [], teamId, tournament }) {
  return (
    <StandingsView>
      <InternalViewHeader onBack={onBack} />
      <Header>
        <h2>Tabla de posiciones</h2>
        <p>{[tournament?.season, tournament?.format, tournament?.category].filter(Boolean).join(" · ")}</p>
      </Header>

      {standings.length === 0 ? (
        <EmptyState>La tabla estará disponible cuando se registren equipos participantes.</EmptyState>
      ) : (
        <TableScroll role="region" aria-label="Tabla de posiciones; desliza horizontalmente para ver todas las estadísticas" tabIndex={0}>
          <Table>
            <caption>Posiciones de {tournament?.season || "torneo actual"}</caption>
            <thead>
              <tr>
                <th scope="col" aria-label="Posición">#</th>
                <th scope="col">Equipo</th>
                {columns.map(([label, title]) => <th key={label} scope="col" title={title}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => {
                const isOwnTeam = String(row.id) === String(teamId);
                return (
                  <tr key={row.id} className={isOwnTeam ? "own-team" : undefined}>
                    <td>{index + 1}</td>
                    <th scope="row">
                      <TeamName>{row.nombre || "Equipo sin nombre"}</TeamName>
                      {isOwnTeam && <OwnTeamBadge>Tu equipo</OwnTeamBadge>}
                    </th>
                    {columns.map(([, , key]) => (
                      <td key={key} className={key === "pts" ? "points" : undefined}>
                        {key === "dg" && row[key] > 0 ? "+" : ""}{row[key] ?? 0}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
      )}
      <Legend>PJ partidos jugados · G ganados · E empatados · P perdidos · GF goles a favor · GC goles en contra · DG diferencia de goles · PTS puntos</Legend>
    </StandingsView>
  );
}

const StandingsView = styled.section`
  min-width: 0;
  width: 100%;
`;

const Header = styled.header`
  margin: 14px 0 23px;
  h2 { margin: 0 0 6px; font-size: clamp(1.4rem, 3vw, 1.8rem); line-height: 1.2; }
  p { margin: 0; color: ${({ theme }) => theme.tournamentDashboard.muted}; font-size: 0.88rem; }
`;

const TableScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.tournamentDashboard.surface};
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 3px; }
`;

const Table = styled.table`
  width: 100%;
  min-width: 700px;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;

  caption { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  th, td { padding: 13px 12px; border-bottom: 1px solid ${({ theme }) => theme.tournamentDashboard.border}; font-size: 0.85rem; }
  thead th { background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; color: ${({ theme }) => theme.tournamentDashboard.muted}; font-size: 0.73rem; font-weight: 750; text-align: center; }
  thead th:nth-child(2) { text-align: left; }
  tbody td { text-align: center; }
  tbody th { text-align: left; font-weight: 650; }
  tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
  tbody tr.own-team th, tbody tr.own-team td { background: ${({ theme }) => theme.tournamentDashboard.primarySoft}; }
  tbody tr.own-team th { color: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong}; }
  tbody tr.own-team td:first-child { font-weight: 800; }
  tbody .points { font-weight: 800; color: ${({ theme }) => theme.text}; }
  tbody tr.own-team .points { color: ${({ theme }) => theme.tournamentDashboard.hero.accentStrong}; }
  th:nth-child(2) { position: sticky; left: 0; min-width: 185px; z-index: 1; background: ${({ theme }) => theme.tournamentDashboard.surface}; }
  thead th:nth-child(2) { z-index: 2; background: ${({ theme }) => theme.tournamentDashboard.itemSurface}; }
  tbody tr.own-team th:nth-child(2) { background: ${({ theme }) => theme.tournamentDashboard.primarySoft}; }
`;

const TeamName = styled.span`
  display: block;
  overflow-wrap: anywhere;
`;

const OwnTeamBadge = styled.span`
  display: inline-block;
  margin-top: 4px;
  font-size: 0.69rem;
  font-weight: 750;
`;

const EmptyState = styled.p`
  padding: 30px;
  border: 1px solid ${({ theme }) => theme.tournamentDashboard.border};
  border-radius: 14px;
  color: ${({ theme }) => theme.tournamentDashboard.muted};
  text-align: center;
`;

const Legend = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.tournamentDashboard.muted};
  font-size: 0.74rem;
  line-height: 1.55;
`;
