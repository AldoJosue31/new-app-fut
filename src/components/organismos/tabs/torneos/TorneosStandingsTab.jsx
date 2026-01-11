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

  const config = useMemo(() => {
    const isLiguillaActive = torneo?.config?.zonaLiguilla ?? reglas?.zonaLiguilla ?? false;
    return {
      avanzan: isLiguillaActive 
        ? Number(torneo?.config?.clasificados || reglas?.clasificados || 0)
        : Number(torneo?.config?.ascensos || reglas?.ascensos || 0),
      repechaje: isLiguillaActive 
        ? Number(torneo?.config?.repechajeTeams || reglas?.repechajeTeams || 0)
        : 0,
      descensos: Number(torneo?.config?.descensos || reglas?.descensos || 0)
    };
  }, [torneo?.config, reglas]);

  const tablaGeneral = useMemo(() => {
    if (!equipos) return [];
    const data = equipos.map((equipo) => {
      const stats = estadisticas.find(s => s.team_id === equipo.id) || {};
      return {
        id: equipo.id,
        nombre: equipo.name || equipo.nombre,
        logo: equipo.logo_url || equipo.img, 
        pj: stats.pj || 0,
        g:  stats.pg || 0,
        e:  stats.pe || 0,
        p:  stats.pp || 0,
        gf: stats.gf || 0,
        gc: stats.gc || 0,
        dg: stats.dg || 0,
        pts: stats.pts || 0,
      };
    });
    return data.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.dg - a.dg);
  }, [equipos, JSON.stringify(estadisticas)]);

  const getZoneColor = (index, total) => {
    const position = index + 1;
    if (config.avanzan > 0 && position <= config.avanzan) return v.verde;
    if (config.repechaje > 0 && position <= (config.avanzan + config.repechaje)) return v.colorselector;
    if (config.descensos > 0 && position > (total - config.descensos)) return v.rojo;
    return null;
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <TableCard>
        <TableScrollWrapper $height="auto">
          <StyledTable>
            <thead>
              <tr>
                <Th>Equipo</Th>
                <Th className="stat-col">PJ</Th>
                {/* Columnas ocultas en móvil */}
                <ThHideOnMobile className="stat-col">G</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">E</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">P</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">GF</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">GC</ThHideOnMobile>
                {/* DG y PTS se mantienen por ser críticos */}
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
                    <TdHideOnMobile className="stat-col">{fila.g}</TdHideOnMobile>
                    <TdHideOnMobile className="stat-col">{fila.e}</TdHideOnMobile>
                    <TdHideOnMobile className="stat-col">{fila.p}</TdHideOnMobile>
                    <TdHideOnMobile className="stat-col">{fila.gf}</TdHideOnMobile>
                    <TdHideOnMobile className="stat-col">{fila.gc}</TdHideOnMobile>
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
    </div>
  );
};

// --- STYLED COMPONENTS OPTIMIZADOS ---

const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg};
  border-radius: 16px;
  box-shadow: ${v.boxshadowGray};
  
  /* 2. Cambia el margen superior de 15px a 0 */
  /* El 'auto' lateral mantiene el centrado */
  margin: 0 auto 30px auto; 
  
  border: 1px solid ${({ theme }) => theme.color2}; 
  width: 98%; 
  max-width: 900px; 
  overflow: hidden; 
  flex-shrink: 0;
  align-self: center; /* Mantiene el centrado horizontal */
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
  font-size: 0.65rem; /* Fuente más pequeña en móvil */
  padding: 12px 8px; /* Padding reducido */
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
    min-width: 35px; /* Más estrecho en móvil */
    @media ${Device.tablet} {
        min-width: 45px;
    }
  }
`;

const Td = styled.td`
  padding: 12px 8px; /* Padding reducido en móvil */
  text-align: center;
  font-size: 0.85rem; /* Fuente más pequeña */
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
    box-shadow: inset 4px 0 0 0 ${({ $zoneColor }) => $zoneColor || 'transparent'};
    max-width: 130px; /* Nombre más recortado en móvil */
    overflow: hidden;
    text-overflow: ellipsis;

    @media ${Device.tablet} {
        max-width: 250px;
        box-shadow: inset 5px 0 0 0 ${({ $zoneColor }) => $zoneColor || 'transparent'};
    }
  }

  &.points-cell {
    font-weight: 800;
    color: ${({ theme }) => theme.primary};
    font-size: 0.95rem;
    @media ${Device.tablet} {
        font-size: 1.05rem;
    }
  }
`;

const Tr = styled.tr`
  &:hover td {
    background-color: ${({ theme }) => theme.bgAlpha};
  }
`;

// Componentes para ocultar columnas dinámicamente
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

const TeamNameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px; /* Gap reducido */
  
  @media ${Device.tablet} {
    gap: 12px;
  }

  img {
    width: 24px; /* Logo más pequeño en móvil */
    height: 24px;
    object-fit: contain;
    @media ${Device.tablet} {
        width: 32px;
        height: 32px;
    }
  }

  .pos {
    font-weight: 700;
    min-width: 15px;
    font-size: 0.8rem;
    opacity: 0.5;
  }

  .team-name {
    font-weight: 600;
    font-size: 0.85rem;
    @media ${Device.tablet} {
        font-size: 0.95rem;
    }
  }
`;