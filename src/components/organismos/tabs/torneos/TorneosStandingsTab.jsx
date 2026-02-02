import React, { useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { v } from '../../../../styles/variables'; 
import { Device } from '../../../../styles/breakpoints'; 
import { ContainerScroll } from '../../../atomos/ContainerScroll';

export const TorneosStandingsTab = ({ 
  torneo = {}, 
  equipos = [], 
  estadisticas = [],
  reglas = {},
  onRefresh 
}) => {

  useEffect(() => {
    if (onRefresh && typeof onRefresh === 'function') {
        onRefresh();
    }
  }, []);

  const config = useMemo(() => {
    const c = torneo?.config || reglas || {};
    return {
      ascensos: parseInt(c.ascensos) || 0,
      descensos: parseInt(c.descensos) || 0,
      zonaLiguilla: c.zonaLiguilla || false,
      clasificados: parseInt(c.clasificados) || 0,
      repechaje: parseInt(c.repechajeTeams) || 0
    };
  }, [torneo?.config, reglas]);

  // --- CORRECCIÓN DE DUPLICADOS ---
  // Filtramos la lista de equipos para asegurar que cada ID sea único.
  // Esto previene que si la BD devuelve el equipo "Golden Boys" dos veces, se renderice dos filas.
  const uniqueEquipos = useMemo(() => {
    if (!equipos) return [];
    const map = new Map();
    equipos.forEach(eq => map.set(eq.id, eq));
    return Array.from(map.values());
  }, [equipos]);

  const tablaGeneral = useMemo(() => {
    const data = uniqueEquipos.map((equipo) => {
      // Usamos .find() que solo devuelve la primera coincidencia, lo cual es correcto.
      // Si estadisticas tiene duplicados, esto ignora los extra.
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

    return data.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        if (b.gf !== a.gf) return b.gf - a.gf;
        // Si todo es igual, menor partidos jugados va primero (mejor rendimiento)
        return a.pj - b.pj;
    });

  }, [uniqueEquipos, estadisticas]);

  const hasAnyLogo = useMemo(() => {
    return tablaGeneral.some(team => team.logo && team.logo.trim() !== '');
  }, [tablaGeneral]);

  const getZoneStatus = (index, total) => {
    const rank = index + 1;
    
    if (rank <= config.ascensos) {
      return { color: '#22c55e', label: 'Ascenso Directo' };
    }

    if (config.zonaLiguilla) {
      if (rank > config.ascensos && rank <= config.clasificados) {
        return { color: '#3b82f6', label: 'Liguilla' };
      }
      const limitLiguilla = Math.max(config.clasificados, config.ascensos);
      if (rank > limitLiguilla && rank <= (limitLiguilla + config.repechaje)) {
        return { color: '#f59e0b', label: 'Repechaje' };
      }
    }

    if (config.descensos > 0 && rank > (total - config.descensos)) {
      return { color: '#ef4444', label: 'Descenso' };
    }

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
                <ThHideOnMobile className="stat-col">G</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">E</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">P</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">GF</ThHideOnMobile>
                <ThHideOnMobile className="stat-col">GC</ThHideOnMobile>
                <Th className="stat-col">DG</Th>
                <Th className="stat-col">PTS</Th>
              </tr>
            </thead>
            <tbody>
              {tablaGeneral.map((fila, index) => {
                const status = getZoneStatus(index, tablaGeneral.length);
                const zoneColor = status?.color;
                
                return (
                  <Tr key={fila.id}>
                    <Td className="team-col" $zoneColor={zoneColor}>
                      <TeamNameCell>
                        <span className="pos">{index + 1}</span>
                        {hasAnyLogo ? (
                           <img 
                             src={fila.logo || v.logoGenerico} 
                             alt={fila.nombre} 
                             onError={(e) => { e.target.onerror = null; e.target.src = v.logoGenerico; }}
                           />
                        ) : null}
                        <span className="team-name">{fila.nombre}</span>
                      </TeamNameCell>
                    </Td>
                    <Td className="stat-col" style={{ fontWeight: 'bold', color: v.text }}>{fila.pj}</Td>
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
              {tablaGeneral.length === 0 && (
                <tr><td colSpan="9" style={{textAlign:'center', padding:'20px', opacity:0.5}}>No hay datos disponibles</td></tr>
              )}
            </tbody>
          </StyledTable>
        </TableScrollWrapper>
      </TableCard>

      {(config.ascensos > 0 || config.zonaLiguilla || config.descensos > 0) && (
        <LeyendaContainer>
             {config.ascensos > 0 && <Badge $color="#22c55e">Ascenso</Badge>}
             {config.zonaLiguilla && (
                <>
                    <Badge $color="#3b82f6">Liguilla</Badge>
                    {config.repechaje > 0 && <Badge $color="#f59e0b">Repechaje</Badge>}
                </>
             )}
             {config.descensos > 0 && <Badge $color="#ef4444">Descenso</Badge>}
        </LeyendaContainer>
      )}
    </div>
  );
};

// --- STYLED COMPONENTS ---

const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg};
  border-radius: 16px;
  box-shadow: ${v.boxshadowGray};
  margin: 0 auto 10px auto; 
  border: 1px solid ${({ theme }) => theme.color2}; 
  width: 98%; 
  max-width: 900px; 
  overflow: hidden; 
  flex-shrink: 0;
  align-self: center;
`;

const TableScrollWrapper = styled(ContainerScroll)`
  overflow-x: auto; 
  padding-bottom: 2px;
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
  padding: 8px 4px;
  text-align: center;
  border-bottom: 2px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  @media ${Device.tablet} {
    font-size: 0.75rem;
    padding: 12px 8px;
  }

  &:first-child {
    text-align: left;
    padding-left: 10px;
    position: sticky;
    left: 0;
    z-index: 10;
    background-color: ${({ theme }) => theme.bgtotal};
  }

  &.stat-col {
    width: 1%;
    min-width: 30px;
    @media ${Device.tablet} { min-width: 40px; }
  }
`;

const Td = styled.td`
  padding: 6px 4px;
  text-align: center;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.text};
  border-bottom: 1px solid ${({ theme }) => theme.color2};
  white-space: nowrap;

  @media ${Device.tablet} {
    padding: 10px 8px;
    font-size: 0.95rem;
  }

  &.team-col {
    text-align: left;
    padding-left: 10px;
    position: sticky;
    left: 0;
    z-index: 5;
    background-color: ${({ theme }) => theme.bg};
    box-shadow: inset 4px 0 0 0 ${({ $zoneColor }) => $zoneColor || 'transparent'};
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: box-shadow 0.3s ease;

    @media ${Device.tablet} {
        max-width: 250px;
        box-shadow: inset 5px 0 0 0 ${({ $zoneColor }) => $zoneColor || 'transparent'};
    }
  }

  &.points-cell {
    font-weight: 800;
    color: ${({ theme }) => theme.primary};
    font-size: 0.9rem;
    @media ${Device.tablet} { font-size: 1.05rem; }
  }
`;

const Tr = styled.tr`
  &:hover td { background-color: ${({ theme }) => theme.bgAlpha}; }
`;

const TdHideOnMobile = styled(Td)`
  display: none;
  @media ${Device.tablet} { display: table-cell; }
`;

const ThHideOnMobile = styled(Th)`
  display: none;
  @media ${Device.tablet} { display: table-cell; }
`;

const TeamNameCell = styled.div`
  display: flex; align-items: center; gap: 6px;
  @media ${Device.tablet} { gap: 10px; }

  img {
    width: 20px; height: 20px; object-fit: contain;
    @media ${Device.tablet} { width: 28px; height: 28px; }
    border-radius: 4px; 
  }

  .pos {
    font-weight: 700; min-width: 12px; font-size: 0.75rem; opacity: 0.5;
  }

  .team-name {
    font-weight: 600; font-size: 0.8rem;
    @media ${Device.tablet} { font-size: 0.9rem; }
  }
`;

const LeyendaContainer = styled.div`
    display: flex; 
    gap: 8px; 
    flex-wrap: wrap; 
    justify-content: flex-end; 
    max-width: 900px;
    margin: 0 auto 10px auto; 
    padding: 0 10px;
`;

const Badge = styled.span`
    font-size: 0.65rem; 
    font-weight: 700; 
    padding: 2px 6px;
    border-radius: 4px;
    background: ${({$color}) => `${$color}15`};
    color: ${({$color}) => $color};
    border: 1px solid ${({$color}) => $color};
    
    @media ${Device.tablet} {
        font-size: 0.75rem;
        padding: 4px 10px;
    }
`;