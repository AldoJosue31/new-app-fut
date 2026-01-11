// src/components/organismos/tabs/torneos/GoleadoresTab.jsx
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getTopScorersService } from '../../../../services/estadisticas';
import { ContainerScroll } from '../../../atomos/ContainerScroll';
import { v } from '../../../../styles/variables';
import { Device } from '../../../../styles/breakpoints';

export function GoleadoresTab({ divisionName = null, tournamentId = null, limit = 20 }) {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await getTopScorersService({ division: divisionName, tournamentId, limit });
      setPlayers(data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error al cargar goleadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [divisionName, tournamentId, limit]);

  if (loading) return <LoadingWrapper>Cargando goleadores...</LoadingWrapper>;
  if (error) return <ErrorWrapper>{error}</ErrorWrapper>;

  return (
    <TableContainer>
      <TableCard>
        <TableScrollWrapper $height="auto">
          <StyledTable>
            <thead>
              <tr>
                <Th className="stat-col">#</Th>
                {/* Agregada clase player-col para alinear y fijar el título */}
                <Th className="player-col">Jugador</Th>
                {/* Agregada clase team-cell para alinear a la izquierda */}
                <Th className="team-cell">Equipo</Th>
                <ThHideOnMobile className="stat-col">Dorsal</ThHideOnMobile>
                <Th className="stat-col">Goles</Th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <Tr key={p.player_id}>
                  <Td className="stat-col pos-cell">{idx + 1}</Td>
                  <Td className="player-col">
                    <PlayerCell>
                      <span className="player-name">{p.first_name} {p.last_name}</span>
                    </PlayerCell>
                  </Td>
                  <Td className="team-cell">{p.team_name}</Td>
                  <TdHideOnMobile className="stat-col">{p.dorsal ?? '-'}</TdHideOnMobile>
                  <Td className="stat-col goals-cell">{p.goals}</Td>
                </Tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <Td colSpan={5} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                    No hay datos de goleadores registrados
                  </Td>
                </tr>
              )}
            </tbody>
          </StyledTable>
        </TableScrollWrapper>
      </TableCard>
    </TableContainer>
  );
}

// --- ESTILOS ---

const TableContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg};
  border-radius: 16px;
  box-shadow: ${v.boxshadowGray};
  margin: 0 auto 30px auto; 
  border: 1px solid ${({ theme }) => theme.color2}; 
  width: 98%; 
  max-width: 900px; 
  overflow: hidden; 
  flex-shrink: 0;
  align-self: center;
`;

const TableScrollWrapper = styled(ContainerScroll)`
  overflow-x: auto; 
  padding-bottom: 4px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
`;

const Th = styled.th`
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.65rem;
  padding: 12px 8px;
  text-align: center;
  border-bottom: 2px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  @media ${Device.tablet} {
    font-size: 0.75rem;
    padding: 18px 12px;
  }

  &.stat-col {
    width: 1%;
    min-width: 40px;
  }

  /* CORRECCIÓN: Alineación y Sticky para el encabezado del jugador */
  &.player-col {
    text-align: left;
    position: sticky;
    left: 0;
    z-index: 10; /* Superior al Td */
    background-color: ${({ theme }) => theme.bgtotal};
  }

  /* CORRECCIÓN: Alineación para el encabezado del equipo */
  &.team-cell {
    text-align: left;
  }
`;

const Td = styled.td`
  padding: 12px 8px;
  text-align: center;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text};
  border-bottom: 1px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  @media ${Device.tablet} {
    padding: 16px 12px;
    font-size: 0.95rem;
  }

  &.player-col {
    text-align: left;
    position: sticky;
    left: 0;
    z-index: 5;
    background-color: ${({ theme }) => theme.bg};
    min-width: 140px;
    /* Sombra sutil para separar al scrollear */
    box-shadow: 2px 0 5px -2px rgba(0,0,0,0.2);
  }

  &.team-cell {
    text-align: left;
    opacity: 0.8;
    font-size: 0.8rem;
  }

  &.goals-cell {
    font-weight: 800;
    color: ${v.colorPrincipal};
    font-size: 1rem;
  }
`;

const Tr = styled.tr`
  &:hover td {
    background-color: ${({ theme }) => theme.bgAlpha};
  }
`;

const PlayerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  .player-name {
    font-weight: 600;
  }
`;

const TdHideOnMobile = styled(Td)`
  display: none;
  @media ${Device.tablet} {
    display: table-cell;
  }
`;

const ThHideOnMobile = styled(Th)`
  display: none;
  @media ${Device.tablet} {
    display: table-cell;
  }
`;

const LoadingWrapper = styled.div`
  padding: 50px;
  text-align: center;
  color: ${({ theme }) => theme.text};
`;

const ErrorWrapper = styled.div`
  padding: 20px;
  color: ${v.rojo};
  text-align: center;
`;