import React from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Title } from "../atomos/Title";
import { Device } from "../../styles/breakpoints";

export function LigaTemplate({ standings, division, season }) {
  return (
    <Container>
      <HeaderSection>
        <Title>Liga</Title>
      </HeaderSection>

      <ContentGrid>
        <Card>
          <CardHeader>
            <div className="icon-box">
              <v.iconolineal /> {/* Icono de gráfico */}
            </div>
            <div className="header-info">
              <h3>Tabla General</h3>
              {division && season && (
                <span className="subtitle">{division} - {season}</span>
              )}
            </div>
          </CardHeader>

          <TableWrapper>
            <ResponsiveTable>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th className="left-align">Equipo</th>
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
                    <td className="rank">{index + 1}</td>
                    <td className="left-align team-cell">
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
                  <tr>
                    <td colSpan="10" className="empty-state">
                      No hay registros disponibles.
                    </td>
                  </tr>
                )}
              </tbody>
            </ResponsiveTable>
          </TableWrapper>
        </Card>
      </ContentGrid>
    </Container>
  );
}

// --- ESTILOS REPLICADOS Y ADAPTADOS ---
const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};

  /* --- CAMBIO --- */
  padding-top: 80px; 

  @media ${Device.tablet} {
    padding-top: 20px;
  }
`;

const HeaderSection = styled.div`
  margin-bottom: 10px;
  width: 100%;
  max-width: 1000px; // Coincide con el ancho de la tarjeta
`;

const ContentGrid = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.bgcards};
  padding: 30px;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.boxshadowGray};
  color: ${({ theme }) => theme.text};
  width: 100%;
  max-width: 1000px; // Más ancho para la tabla
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;

  .icon-box {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    background: ${({ theme }) => theme.primary || v.colorPrincipal};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 22px;
  }
  
  .header-info {
    display: flex;
    flex-direction: column;
    h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
    }
    .subtitle {
      font-size: 14px;
      opacity: 0.7;
      margin-top: 4px;
    }
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto; // Scroll si la pantalla es muy pequeña
`;

const ResponsiveTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: ${({ theme }) => theme.text};

  thead th {
    text-align: center;
    padding: 15px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${({ theme }) => theme.text};
    opacity: 0.6;
    border-bottom: 2px solid ${({ theme }) => theme.bgtotal};
  }

  tbody td {
    padding: 16px 15px;
    text-align: center;
    border-bottom: 1px solid ${({ theme }) => theme.bgtotal};
    font-size: 0.95rem;
  }

  .left-align { text-align: left; }
  .rank { font-weight: bold; opacity: 0.5; }
  .team-cell { font-weight: 600; }
  .points { font-weight: 800; color: ${({ theme }) => theme.text}; font-size: 1.1rem; }
  
  .positive { color: #22c55e; font-weight: 600; } 
  .negative { color: #ef4444; font-weight: 600; }
  
  .empty-state {
    padding: 40px;
    font-style: italic;
    opacity: 0.5;
  }

  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover {
    background-color: ${({ theme }) => theme.bgtotal}40;
  }
`;