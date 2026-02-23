import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { v } from '../../../../../styles/variables';
import { Device } from '../../../../../styles/breakpoints';
import { RiArrowUpSFill, RiArrowDownSFill, RiSubtractLine } from "react-icons/ri";

export default function StandingsTable({ tablaGeneral, config, isPublic }) {
  const navigate = useNavigate();

  const hasAnyLogo = useMemo(() => {
    return tablaGeneral.some(team => team.logo && team.logo.trim() !== '');
  }, [tablaGeneral]);

  const getZoneStatus = (index, total) => {
    const rank = index + 1;
    if (rank <= config.ascensos) return { color: '#22c55e', label: 'Ascenso Directo' };
    if (config.zonaLiguilla) {
      if (rank > config.ascensos && rank <= config.clasificados) return { color: '#3b82f6', label: 'Liguilla' };
      const limitLiguilla = Math.max(config.clasificados, config.ascensos);
      if (rank > limitLiguilla && rank <= (limitLiguilla + config.repechaje)) return { color: '#f59e0b', label: 'Repechaje' };
    }
    if (config.descensos > 0 && rank > (total - config.descensos)) return { color: '#ef4444', label: 'Descenso' };
    return null;
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" }
    })
  };

  return (
    <>
      <TableCard>
        <ResponsiveTableWrapper>
          <StyledTable>
            <thead>
              <tr>
                <Th className="team-col-header">Equipo</Th>
                <Th className="stat-col">PJ</Th>
                <Th className="stat-col hide-mobile">G</Th>
                <Th className="stat-col hide-mobile">E</Th>
                <Th className="stat-col hide-mobile">P</Th>
                <Th className="stat-col hide-mobile">GF</Th>
                <Th className="stat-col hide-mobile">GC</Th>
                <Th className="stat-col dif-col">DIF</Th>
                {/* COLUMNA PENDIENTES */}
                <Th className="stat-col pend-col hide-mobile" title="Partidos Pendientes">Pnd</Th>
                <Th className="stat-col pts-col">PTS</Th>
              </tr>
            </thead>
            <tbody>
              {tablaGeneral.map((fila, index) => {
                const status = getZoneStatus(index, tablaGeneral.length);
                const zoneColor = status?.color;
                const RowComponent = isPublic ? MotionTr : Tr;

                const flechasToShow = Math.min(fila.posDiff || 0, 3);
                const hoverText = fila.posDiff 
                    ? (fila.tendencia === 'up' ? `Subió ${fila.posDiff} puesto(s)` : `Bajó ${fila.posDiff} puesto(s)`) 
                    : 'Mantuvo posición';

                return (
                  <RowComponent
                    key={fila.id}
                    $isPublic={isPublic}
                    $zoneColor={zoneColor} 
                    onDoubleClick={() => {
                        if (!isPublic) {
                            navigate(`/equipos/${fila.id}`, { state: { initialView: 'stats' } });
                        }
                    }}
                    title={!isPublic ? "Doble click para ver estadísticas detalladas" : ""}
                    variants={isPublic ? rowVariants : {}}
                    initial={isPublic ? "hidden" : undefined}
                    animate={isPublic ? "visible" : undefined}
                    custom={index}
                  >
                    <Td className="team-col" $zoneColor={zoneColor}>
                      <TeamNameCell>
                        <div className="rank-container" title={hoverText}>
                           <span className="pos">{index + 1}</span>
                           <span className="tendencia">
                              {fila.tendencia === 'same' && <RiSubtractLine className="icon-same" />}
                              
                              {fila.tendencia === 'up' && Array.from({ length: flechasToShow }).map((_, i) => (
                                 <RiArrowUpSFill key={i} className="icon-up" style={{ marginTop: i > 0 ? '-5px' : '0' }} />
                              ))}
                              
                              {fila.tendencia === 'down' && Array.from({ length: flechasToShow }).map((_, i) => (
                                 <RiArrowDownSFill key={i} className="icon-down" style={{ marginTop: i > 0 ? '-5px' : '0' }} />
                              ))}
                           </span>
                        </div>

                        {hasAnyLogo ? (
                           <img
                             src={fila.logo || v.logoGenerico}
                             alt={fila.nombre}
                             onError={(e) => { e.target.onerror = null; e.target.src = v.logoGenerico; }}
                           />
                        ) : null}
                        <span className="team-name" title={fila.nombre}>{fila.nombre}</span>
                      </TeamNameCell>
                    </Td>

                    <Td className="stat-col val-pj">{fila.pj}</Td>
                    <Td className="stat-col hide-mobile val-stat">{fila.g}</Td>
                    <Td className="stat-col hide-mobile val-stat">{fila.e}</Td>
                    <Td className="stat-col hide-mobile val-stat">{fila.p}</Td>
                    <Td className="stat-col hide-mobile val-stat">{fila.gf}</Td>
                    <Td className="stat-col hide-mobile val-stat">{fila.gc}</Td>
                    <Td className="stat-col val-dif" style={{
                        color: fila.dg > 0 ? v.verde : fila.dg < 0 ? v.rojo : 'inherit'
                    }}>
                        {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                    </Td>
                    {/* VALOR PENDIENTES */}
                    <Td className="stat-col hide-mobile val-pend" style={{
                         color: fila.partidosPendientes > 0 ? '#f59e0b' : 'inherit',
                         opacity: fila.partidosPendientes > 0 ? 1 : 0.3
                    }}>
                        {fila.partidosPendientes}
                    </Td>
                    <Td className="stat-col val-pts">{fila.pts}</Td>
                  </RowComponent>
                );
              })}
              {tablaGeneral.length === 0 && (
                <tr>
                  <td colSpan="10" style={{textAlign:'center', padding:'20px', opacity:0.5}}>
                    No hay datos disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </StyledTable>
        </ResponsiveTableWrapper>
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
    </>
  );
}

// --- ESTILOS MODERNIZADOS Y COMPACTOS ---
const TableCard = styled.div`
  background-color: ${({ theme }) => theme.bg}; 
  border-radius: 12px; 
  box-shadow: ${v.boxshadowGray};
  margin: 0 auto 20px auto; 
  border: 1px solid ${({ theme }) => theme.color2}; 
  width: 100%; 
  max-width: 1000px; 
  overflow: hidden; 
  flex-shrink: 0; 
  align-self: center;
`;

const ResponsiveTableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.color2}; border-radius: 4px; }
`;

const StyledTable = styled.table`
  width: 100%; 
  border-collapse: collapse; 
  text-align: center;
`;

const Th = styled.th`
  background-color: ${({ theme }) => theme.bgtotal}; 
  color: ${({ theme }) => theme.text}; 
  opacity: 0.8;
  font-weight: 700;
  text-transform: uppercase; 
  font-size: 0.65rem; 
  padding: 8px 6px; 
  border-bottom: 2px solid ${({ theme }) => theme.color2};
  white-space: nowrap;
  
  @media ${Device.tablet} { font-size: 0.75rem; padding: 12px 10px; }
  &.team-col-header { text-align: left; padding-left: 20px; }
  &.stat-col { width: 1%; min-width: 25px; }
  
  &.pend-col { color: #f59e0b; }
  &.pts-col { color: ${v.colorPrincipal}; opacity: 1; font-weight: 900; }
  &.hide-mobile { @media (max-width: 500px) { display: none; } }
`;

const Td = styled.td`
  padding: 6px 4px; 
  font-size: 0.8rem; 
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  
  @media ${Device.tablet} { padding: 10px 10px; font-size: 0.95rem; }
  
  &.team-col {
    text-align: left; 
    padding-left: 10px; 
    background-color: ${({ theme }) => theme.bg};
    border-left: 4px solid ${({ $zoneColor }) => $zoneColor || 'transparent'};
    transition: background-color 0.3s ease;
    @media ${Device.tablet} { padding-left: 15px; border-left: 5px solid ${({ $zoneColor }) => $zoneColor || 'transparent'}; }
  }

  &.val-pj { font-weight: 700; }
  &.val-stat { color: ${({ theme }) => theme.text}CC; }
  &.val-dif { font-weight: 800; }
  &.val-pend { font-weight: 700; }
  
  &.val-pts { 
    font-weight: 900; color: ${v.colorPrincipal}; font-size: 1rem; 
    @media ${Device.tablet} { font-size: 1.15rem; } 
  }
  &.hide-mobile { @media (max-width: 500px) { display: none; } }
`;

const TrBase = styled.tr`
  cursor: ${({ $isPublic }) => $isPublic ? 'default' : 'pointer'}; 
  transition: background-color 0.2s;
  td { border-bottom: 1px solid ${({ $zoneColor, theme }) => $zoneColor ? `${$zoneColor}60` : theme.color2}; }
  &:hover td { background-color: ${({ theme }) => theme.bgAlpha}; }
  &:last-child td { border-bottom: none; }
`;

const Tr = TrBase;
const MotionTr = motion(TrBase);

const TeamNameCell = styled.div`
  display: flex; align-items: center; gap: 8px; 
  @media ${Device.tablet} { gap: 14px; }
  
  .rank-container {
    display: flex; align-items: center; gap: 4px; min-width: 28px; justify-content: flex-end;
    @media ${Device.tablet} { min-width: 36px; gap: 6px; }
  }

  .pos { 
    font-weight: 800; font-size: 0.75rem; opacity: 0.5; text-align: right; flex-shrink: 0;
    @media ${Device.tablet} { font-size: 0.9rem; }
  }

  .tendencia {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    .icon-up, .icon-down { margin-bottom: -5px; }
    .icon-up { color: #22c55e; font-size: 16px; @media ${Device.tablet} { font-size: 18px; } }
    .icon-down { color: #ef4444; font-size: 16px; @media ${Device.tablet} { font-size: 18px; } }
    .icon-same { color: ${({ theme }) => theme.text}40; font-size: 14px; margin-left: 2px; @media ${Device.tablet} { font-size: 16px; } }
  }
  
  img { 
    width: 20px; height: 20px; object-fit: contain; border-radius: 4px; flex-shrink: 0;
    @media ${Device.tablet} { width: 26px; height: 26px; } 
  }
  
  .team-name { 
    font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; 
    @media (min-width: 400px) { max-width: 140px; } 
    @media ${Device.tablet} { font-size: 0.95rem; max-width: 300px; } 
  }
`;

const LeyendaContainer = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 1000px; margin: 0 auto 10px auto; padding: 0 10px;
`;

const Badge = styled.span`
  font-size: 0.65rem; font-weight: 700; padding: 4px 8px; border-radius: 4px;
  background: ${({$color}) => `${$color}15`}; color: ${({$color}) => $color}; border: 1px solid ${({$color}) => $color};
  @media ${Device.tablet} { font-size: 0.75rem; padding: 6px 12px; }
`;