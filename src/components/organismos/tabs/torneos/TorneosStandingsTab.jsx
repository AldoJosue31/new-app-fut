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

  /* 1. LÓGICA DE CONFIGURACIÓN: Nombres reales de tu base de datos/estado */
const config = useMemo(() => {
    // Verificamos si la liguilla está habilitada en la config del torneo
    const isLiguillaActive = torneo?.config?.zonaLiguilla ?? reglas?.zonaLiguilla ?? false;

    return {
      // ZONA VERDE: 
      // Si hay Liguilla -> Se basa en 'clasificados' (Playoffs)
      // Si NO hay Liguilla -> Se basa en 'ascensos' (Directos)
      avanzan: isLiguillaActive 
        ? Number(torneo?.config?.clasificados || reglas?.clasificados || 0)
        : Number(torneo?.config?.ascensos || reglas?.ascensos || 0),
      
      // ZONA REPECHAJE: Solo visible si hay Liguilla
      repechaje: isLiguillaActive 
        ? Number(torneo?.config?.repechajeTeams || reglas?.repechajeTeams || 0)
        : 0,
      
      // ZONA ROJA: Siempre visible (Descensos)
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
        pj: stats.pj || 0, g: stats.g || 0, e: stats.e || 0, p: stats.p || 0,
        gf: stats.gf || 0, gc: stats.gc || 0, dg: stats.dg || 0, pts: stats.pts || 0,
      };
    });
    return data.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.dg - a.dg);
  }, [equipos, JSON.stringify(estadisticas)]);

  /* 2. LÓGICA DE COLORES DE ZONA */
  const getZoneColor = (index, total) => {
    const position = index + 1;
    if (config.avanzan > 0 && position <= config.avanzan) return v.verde;
    if (config.repechaje > 0 && position <= (config.avanzan + config.repechaje)) return v.colorselector;
    if (config.descensos > 0 && position > (total - config.descensos)) return v.rojo;
    return null;
  };

  return (
    <ContentContainer>
      <TableCard>
        <TableScrollWrapper $height="auto">
          <StyledTable>
            <thead>
              <tr>
                <Th>Equipo</Th>
                <Th className="stat-col">PJ</Th>
                <Th className="stat-col">G</Th>
                <Th className="stat-col">E</Th>
                <Th className="stat-col">P</Th>
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
                    <Td className="stat-col">{fila.g}</Td>
                    <Td className="stat-col">{fila.e}</Td>
                    <Td className="stat-col">{fila.p}</Td>
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
    </ContentContainer>
  );
};

// --- STYLED COMPONENTS (DISEÑO SOLICITADO + LOGICA DE CENTRADO) ---

const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg};
  border-radius: 16px;
  box-shadow: ${v.boxshadowGray};
  margin: 0 auto 30px auto; /* Centrado horizontal */
  border: 1px solid ${({ theme }) => theme.color2}; 
  width: 95%; /* Ancho reducido */
  max-width: 900px; 
  overflow: hidden; 
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
  font-size: 0.75rem;
  padding: 18px 12px;
  text-align: center;
  border-bottom: 2px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  &:first-child {
    text-align: left;
    padding-left: 20px;
    position: sticky;
    left: 0;
    z-index: 10;
    background-color: ${({ theme }) => theme.bgtotal};
  }

  &.stat-col {
    width: 1%; /* Evita que las columnas de números se estiren */
    min-width: 45px;
  }
`;

const Td = styled.td`
  padding: 16px 12px;
  text-align: center;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  border-bottom: 1px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  &.team-col {
    text-align: left;
    padding-left: 20px;
    position: sticky;
    left: 0;
    z-index: 5;
    background-color: ${({ theme }) => theme.bg};
    
    /* BORDE DE ZONA: Usamos box-shadow inset para que sea visible en celdas sticky */
    box-shadow: inset 5px 0 0 0 ${({ $zoneColor }) => $zoneColor || 'transparent'};
    
    max-width: 180px; 
    overflow: hidden;
    text-overflow: ellipsis;

    @media ${Device.tablet} {
        max-width: 250px;
    }
  }

  &.stat-col {
    width: 1%;
  }

  &.points-cell {
    font-weight: 800;
    color: ${({ theme }) => theme.primary};
    font-size: 1.05rem;
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
  gap: 12px;
  
  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    border-radius: 4px;
  }

  .pos {
    font-weight: 700;
    min-width: 20px;
    opacity: 0.5;
    margin-left: 5px; /* Espacio para el borde de color */
  }

  .team-name {
    font-weight: 600;
  }
`;