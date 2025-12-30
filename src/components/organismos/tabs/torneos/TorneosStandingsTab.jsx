import React from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { Card, CardHeader } from "../../../../index";

export function TorneosStandingsTab({ standings, division, season, loading }) {
  return (
    <Card>
      <CardHeader
        Icono={v.iconolineal}
        titulo="Tabla de Posiciones"
        subtitulo={division ? `${division.name} - ${season}` : "Selecciona una división"}
      />
      
      {loading ? (
         <LoadingState>Cargando datos...</LoadingState>
      ) : (
        <TableWrapper>
          <ResponsiveTable>
            <thead>
              <tr>
                <th className="sticky-col first-col">Pos</th>
                <th className="sticky-col second-col left-align">Equipo</th>
                <th>PTS</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <tr key={team.team_id}>
                  <td className="sticky-col first-col rank">{index + 1}</td>
                  <td className="sticky-col second-col left-align team-cell">
                    <TeamLogo src={team.logo_url || v.iconofotovacia} alt="logo" />
                    <span className="name">{team.team_name}</span>
                  </td>
                  <td className="points">{team.pts}</td>
                  <td>{team.pj}</td>
                  <td>{team.pg}</td>
                  <td>{team.pe}</td>
                  <td>{team.pp}</td>
                  <td>{team.gf}</td>
                  <td>{team.gc}</td>
                  <td className={team.dg > 0 ? "positive" : (team.dg < 0 ? "negative" : "")}>
                    {team.dg}
                  </td>
                </tr>
              ))}
              {standings.length === 0 && (
                <tr><td colSpan="10" className="empty-state">No hay registros disponibles.</td></tr>
              )}
            </tbody>
          </ResponsiveTable>
        </TableWrapper>
      )}
    </Card>
  );
}

// --- STYLES ---
const LoadingState = styled.div`
  padding: 40px; text-align: center; opacity: 0.7; color: ${({theme}) => theme.text};
`;
const TeamLogo = styled.img`
  width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;
`;
const TableWrapper = styled.div`
  width: 100%; overflow-x: auto; padding-bottom: 10px;
  &::-webkit-scrollbar { height: 8px; }
  &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
`;
const ResponsiveTable = styled.table`
  width: 100%; border-collapse: separate; border-spacing: 0; color: ${({ theme }) => theme.text}; min-width: 600px;
  thead th {
    position: sticky; top: 0; z-index: 10; text-align: center; padding: 15px;
    background-color: ${({ theme }) => theme.bgcards}; border-bottom: 2px solid ${({ theme }) => theme.bgtotal};
  }
  tbody td {
    padding: 16px 15px; text-align: center; border-bottom: 1px solid ${({ theme }) => theme.bgtotal};
    background-color: ${({ theme }) => theme.bgcards};
  }
  .sticky-col { position: sticky; z-index: 5; background-color: ${({ theme }) => theme.bgcards}; }
  .first-col { left: 0; width: 50px; border-right: 1px solid ${({ theme }) => theme.bgtotal}; }
  .second-col { left: 50px; min-width: 150px; border-right: 1px solid ${({ theme }) => theme.bgtotal}; }
  .left-align { text-align: left; }
  .team-cell { font-weight: 700; display: flex; align-items: center; }
  .points { font-weight: 800; color: ${({ theme }) => theme.primary}; font-size: 1.1rem; }
  .positive { color: #22c55e; } .negative { color: #ef4444; }
  .empty-state { padding: 40px; font-style: italic; opacity: 0.5; }
`;