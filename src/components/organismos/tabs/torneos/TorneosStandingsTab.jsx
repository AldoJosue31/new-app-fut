import React, { useMemo } from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables';
import { Device } from '../../../../styles/breakpoints'; 
import { ContentContainer } from '../../../atomos/ContentContainer';
import { ContainerScroll } from '../../../atomos/ContainerScroll';

export const TorneosStandingsTab = ({ 
  torneo = {}, 
  equipos = [], 
  estadisticas = [],
  reglas = {} 
}) => {

  const config = {
    avanzan: Number(torneo?.config?.clasificados || reglas?.clasificados || 0),
    repechaje: Number(torneo?.config?.repechajeTeams || reglas?.repechajeTeams || 0),
    descensos: Number(torneo?.config?.descensos || reglas?.descensos || 0)
  };

  const tablaGeneral = useMemo(() => {
    if (!equipos) return [];
    const data = equipos.map((equipo) => {
      const stats = estadisticas.find(s => s.equipo_id === equipo.id) || {};
      return {
        id: equipo.id,
        nombre: equipo.name || equipo.nombre,
        logo: equipo.logo_url || equipo.img, 
        pj: stats.pj || 0, g: stats.g || 0, e: stats.e || 0, p: stats.p || 0,
        gf: stats.gf || 0, gc: stats.gc || 0, dg: stats.dg || 0, pts: stats.pts || 0,
      };
    });
    return data.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.dg - a.dg);
  }, [equipos, estadisticas]);

  const getZoneColor = (index, total) => {
    const position = index + 1;
    if (config.avanzan > 0 && position <= config.avanzan) return v.verde;
    if (config.repechaje > 0 && position <= (config.avanzan + config.repechaje)) return v.colorselector;
    if (config.descensos > 0 && position > (total - config.descensos)) return v.rojo;
    return null;
  };

  return (
    <TableCard>
      <TableScrollWrapper $height="auto">
        <StyledTable>
          <thead>
            <tr>
              <Th>Equipo</Th>
              <Th className="stat-col">PJ</Th>
              <Th className="stat-col hide-mobile">G</Th>
              <Th className="stat-col hide-mobile">E</Th>
              <Th className="stat-col hide-mobile">P</Th>
              <ThHideOnMobile className="stat-col">GF</ThHideOnMobile>
              <ThHideOnMobile className="stat-col">GC</ThHideOnMobile>
              <Th className="stat-col">DG</Th>
              <Th className="stat-col">PTS</Th>
            </tr>
          </thead>
          <tbody>
            {tablaGeneral.map((fila, index) => {
              const zoneColor = getZoneColor(index, tablaGeneral.length);
              return (
                <Tr key={fila.id}>
                  <Td className="team-col" $zoneColor={zoneColor}>
                    <TeamNameCell>
                      <span className="pos">{index + 1}</span>
                      {fila.logo && <img src={fila.logo} alt="logo" />}
                      <span className="team-name">{fila.nombre}</span>
                    </TeamNameCell>
                  </Td>
                  <Td className="stat-col">{fila.pj}</Td>
                  <Td className="stat-col hide-mobile">{fila.g}</Td>
                  <Td className="stat-col hide-mobile">{fila.e}</Td>
                  <Td className="stat-col hide-mobile">{fila.p}</Td>
                  <HideOnMobile className="stat-col">{fila.gf}</HideOnMobile>
                  <HideOnMobile className="stat-col">{fila.gc}</HideOnMobile>
                  <Td className="stat-col" style={{ 
                      color: fila.dg > 0 ? v.verde : fila.dg < 0 ? v.rojo : 'inherit', 
                      fontWeight: 'bold' 
                  }}>
                      {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                  </Td>
                  <Td className="stat-col points-cell">{fila.pts}</Td>
                </Tr>
              );
            })}
          </tbody>
        </StyledTable>
      </TableScrollWrapper>
    </TableCard>
  );
};

// --- STYLED COMPONENTS ---

const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg};
  border-radius: 16px;
  box-shadow: ${v.boxshadowGray};
  margin: 0 auto 30px auto;
  border: 1px solid ${({ theme }) => theme.color2}; 
  width: 100%; /* Toma todo el ancho en móvil */
  max-width: 900px; 
  overflow: hidden;

  @media ${Device.tablet} {
    width: 95%; /* Se reduce ligeramente en tablets y escritorio */
  }
`;

const TableScrollWrapper = styled(ContainerScroll)`
  overflow-x: auto; 
  padding-right: 0;
  padding-bottom: 8px;
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
  font-size: 0.7rem; /* Fuente más pequeña para móvil */
  padding: 12px 8px;
  text-align: center;
  border-bottom: 2px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  @media ${Device.tablet} {
    font-size: 0.75rem;
    padding: 18px 12px;
  }

  &:first-child {
    text-align: left;
    padding-left: 15px;
    position: sticky;
    left: 0;
    z-index: 10;
    background-color: ${({ theme }) => theme.bgtotal};
  }

  &.stat-col {
    width: 1%;
    min-width: 35px;

    @media ${Device.tablet} {
      min-width: 45px;
    }
  }

  &.hide-mobile {
    display: none;
    @media ${Device.tablet} {
      display: table-cell;
    }
  }
`;

const Td = styled.td`
  padding: 10px 6px; /* Padding reducido para móvil */
  text-align: center;
  font-size: 0.85rem; /* Fuente reducida */
  color: ${({ theme }) => theme.text};
  border-bottom: 1px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  @media ${Device.tablet} {
    padding: 16px 12px;
    font-size: 0.95rem;
  }

  &.team-col {
    text-align: left;
    padding-left: 15px;
    position: sticky;
    left: 0;
    z-index: 5;
    background-color: ${({ theme }) => theme.bg};
    box-shadow: inset 5px 0 0 0 ${({ $zoneColor }) => $zoneColor || 'transparent'};
    
    /* Limitamos el ancho para que no desplace los stats en móviles pequeños */
    max-width: 120px; 
    overflow: hidden;
    text-overflow: ellipsis;

    @media ${Device.tablet} {
        max-width: 250px;
        padding-left: 20px;
    }
  }

  &.stat-col {
    width: 1%;
  }

  &.hide-mobile {
    display: none;
    @media ${Device.tablet} {
      display: table-cell;
    }
  }

  &.points-cell {
    font-weight: 800;
    color: ${({ theme }) => theme.primary};
    font-size: 0.9rem;

    @media ${Device.tablet} {
      font-size: 1.05rem;
    }
  }
`;

const Tr = styled.tr`
  &:hover td {
    background-color: ${({ theme }) => theme.bgAlpha};
  }
  &:last-child td {
    border-bottom: none;
  }
`;

const HideOnMobile = styled.td`
  display: none;
  @media ${Device.tablet} {
    display: table-cell;
    padding: 16px 12px;
    text-align: center;
    border-bottom: 1px solid ${({ theme }) => theme.color2};
  }
`;

const ThHideOnMobile = styled(Th)`
  display: none;
  @media ${Device.tablet} {
    display: table-cell;
  }
`;

const TeamNameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  @media ${Device.tablet} {
    gap: 12px;
  }
  
  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
    border-radius: 4px;

    @media ${Device.tablet} {
      width: 32px;
      height: 32px;
    }
  }

  .pos {
    font-weight: 700;
    min-width: 16px;
    opacity: 0.5;
    font-size: 0.75rem;

    @media ${Device.tablet} {
      min-width: 20px;
      font-size: 0.85rem;
    }
  }

  .team-name {
    font-weight: 600;
    font-size: 0.8rem;

    @media ${Device.tablet} {
      font-size: 0.95rem;
    }
  }
`;