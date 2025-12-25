import React from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Title } from "../atomos/Title";
import { Device } from "../../styles/breakpoints"; 

export function LigaTemplate({ standings, division, season, loading }) {
  return (
    <Container>
      <HeaderSection>
        <Title>Liga</Title>
      </HeaderSection>

      <ContentGrid>
        <Card>
          <CardHeader>
            <div className="icon-box">
              <v.iconolineal />
            </div>
            <div className="header-info">
              <h3>Tabla General</h3>
              <span className="subtitle">
                {division ? `${division.name} - ${season}` : "Selecciona una división"}
              </span>
            </div>
          </CardHeader>

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
                        {/* Renderizamos el logo si existe, o uno por defecto */}
                        <TeamLogo 
                          src={team.logo_url || v.iconofotovacia || "https://via.placeholder.com/30"} 
                          alt="logo" 
                        />
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
                        No hay registros disponibles para esta división.
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </TableWrapper>
          )}
        </Card>
      </ContentGrid>
    </Container>
  );
}

// --- ESTILOS COMPLETOS ---

const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};
  padding-top: 80px; 

  @media ${Device.tablet} {
    padding-top: 20px;
  }
`;

const HeaderSection = styled.div`
  margin-bottom: 10px;
  width: 100%;
  max-width: 1000px;
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
  max-width: 1000px;
  overflow: hidden; 
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
    h3 { margin: 0; font-size: 20px; font-weight: 700; }
    .subtitle { font-size: 14px; opacity: 0.7; margin-top: 4px; }
  }
`;

const LoadingState = styled.div`
  padding: 40px;
  text-align: center;
  font-weight: 500;
  color: ${({theme}) => theme.text};
  opacity: 0.7;
`;

const TeamLogo = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 8px;
  vertical-align: middle;
  border: 1px solid ${({ theme }) => theme.bgtotal};
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  padding-bottom: 10px;

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.bgtotal};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }
`;

const ResponsiveTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: ${({ theme }) => theme.text};
  min-width: 600px;

  thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    text-align: center;
    padding: 15px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${({ theme }) => theme.text};
    opacity: 0.8;
    background-color: ${({ theme }) => theme.bgcards};
    border-bottom: 2px solid ${({ theme }) => theme.bgtotal};
  }

  tbody td {
    padding: 16px 15px;
    text-align: center;
    border-bottom: 1px solid ${({ theme }) => theme.bgtotal};
    font-size: 0.95rem;
    background-color: ${({ theme }) => theme.bgcards};
  }

  .sticky-col {
    position: sticky;
    z-index: 5;
    background-color: ${({ theme }) => theme.bgcards}; 
  }

  thead .sticky-col {
    z-index: 15;
  }

  .first-col {
    left: 0;
    width: 50px;
    min-width: 50px;
    border-right: 1px solid ${({ theme }) => theme.bgtotal};
  }

  .second-col {
    left: 50px;
    min-width: 150px;
    box-shadow: 4px 0 8px -4px rgba(0,0,0,0.1); 
    border-right: 1px solid ${({ theme }) => theme.bgtotal};
  }

  .left-align { text-align: left; }
  .rank { font-weight: bold; opacity: 0.5; }
  .team-cell { font-weight: 700; color: ${({ theme }) => theme.text}; display: flex; align-items: center; }
  .points { font-weight: 800; color: ${({ theme }) => theme.primary || "#1cb0f6"}; font-size: 1.1rem; }
  
  .positive { color: #22c55e; font-weight: 600; } 
  .negative { color: #ef4444; font-weight: 600; }
  
  .empty-state { padding: 40px; font-style: italic; opacity: 0.5; }

  tbody tr:last-child td { border-bottom: none; }
  
  tbody tr:hover td {
    background-color: ${({ theme }) => theme.bgtotal}40;
  }
`;