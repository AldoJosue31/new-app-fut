// src/components/organismos/tabs/torneos/subcomponents/StandingsTable.jsx
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { v } from '../../../../../styles/variables';
import { Device } from '../../../../../styles/breakpoints';
import { RiArrowUpSFill, RiArrowDownSFill, RiSubtractLine, RiInformationLine } from "react-icons/ri";
import { Skeleton } from '../../../../atomos/Skeleton';
import { DynamicTeamLogo } from '../../../../organismos/equipos/DynamicTeamLogo'; 

export default function StandingsTable({ tablaGeneral = [], config, isPublic, isLoading = false }) {
  const navigate = useNavigate();

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

  const getTieBreakerText = () => {
    const type = config.tieBreakType || 'normal';
    if (type === 'normal') {
        return "Criterios de desempate: 1° Puntos ➔ 2° Diferencia de goles (DIF) ➔ 3° Goles a favor (GF) ➔ 4° Menos partidos jugados (PJ)";
    }
    return "Criterios de desempate: 1° Puntos ➔ 2° Diferencia de goles ➔ 3° Goles a favor ➔ 4° Menos partidos jugados";
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" }
    })
  };

  const skeletonWidths = ['100px', '140px', '120px', '90px', '110px', '130px', '95px', '105px'];

  return (
    <>
      {/* Añadimos un ID para facilitar la captura de la imagen si es necesario */}
      <TableCard id="standings-table-card">
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
                <Th className="stat-col pend-col hide-mobile" title="Partidos Pendientes">Pnd</Th>
                <Th className="stat-col pts-col">PTS</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  // Pasamos $isEven explícitamente también en los skeletons
                  <TrBase key={`skeleton-${index}`} $isPublic={isPublic} $isEven={index % 2 === 1}>
                    <Td className="team-col">
                      <TeamNameCell>
                        <div className="rank-container">
                          <Skeleton width="16px" height="16px" radius="2px" />
                        </div>
                        <Skeleton width="26px" height="26px" radius="4px" />
                        <Skeleton width={skeletonWidths[index % 8]} height="16px" />
                      </TeamNameCell>
                    </Td>
                    <Td className="stat-col"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col hide-mobile"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col hide-mobile"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col hide-mobile"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col hide-mobile"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col hide-mobile"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col hide-mobile"><Skeleton width="16px" height="16px" style={{ margin: '0 auto' }} /></Td>
                    <Td className="stat-col"><Skeleton width="20px" height="20px" style={{ margin: '0 auto' }} /></Td>
                  </TrBase>
                ))
              ) : (
                tablaGeneral.map((fila, index) => {
                  const status = getZoneStatus(index, tablaGeneral.length);
                  const zoneColor = status?.color;
                  const RowComponent = isPublic ? MotionTr : Tr;

                  // Calculamos si la fila es par (efecto cebra)
                  // Usamos index % 2 === 1 porque el índice 0 es la fila 1 (impar), índice 1 es fila 2 (par).
                  const isEven = index % 2 === 1;

                  const flechasToShow = Math.min(fila.posDiff || 0, 3);
                  const hoverText = fila.posDiff 
                      ? (fila.tendencia === 'up' ? `Subió ${fila.posDiff} puesto(s)` : `Bajó ${fila.posDiff} puesto(s)`) 
                      : 'Mantuvo posición';

                  return (
                    <RowComponent
                      key={fila.id}
                      $isPublic={isPublic}
                      $zoneColor={zoneColor}
                      $isEven={isEven} // <-- PASAMOS LA PROP EXPLÍCITA AQUÍ
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
                                   <RiArrowUpSFill key={`up-${i}`} className="icon-up" />
                                ))}
                                {fila.tendencia === 'down' && Array.from({ length: flechasToShow }).map((_, i) => (
                                   <RiArrowDownSFill key={`down-${i}`} className="icon-down" />
                                ))}
                             </span>
                          </div>

                          <div className="logo-container">
                              {fila.logo ? (
                                  <img 
                                    src={fila.logo} 
                                    alt={fila.nombre} 
                                    crossOrigin="anonymous" // Importante para exportar imágenes externas
                                  />
                              ) : (
                                  <DynamicTeamLogo 
                                    name={fila.nombre} 
                                    color={fila.color || "#000000"} 
                                    size="100%" 
                                  />
                              )}
                          </div>
                          
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
                      <Td className="stat-col hide-mobile val-pend" style={{
                           color: fila.partidosPendientes > 0 ? '#f59e0b' : 'inherit',
                           opacity: fila.partidosPendientes > 0 ? 1 : 0.3
                      }}>
                          {fila.partidosPendientes}
                      </Td>
                      <Td className="stat-col val-pts">{fila.pts}</Td>
                    </RowComponent>
                  );
                })
              )}

              {!isLoading && tablaGeneral.length === 0 && (
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

      <BottomInfoContainer>
        <TieBreakerContainer>
           <RiInformationLine size={16} />
           <span>{getTieBreakerText()}</span>
        </TieBreakerContainer>

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
      </BottomInfoContainer>
    </>
  );
}

// --- ESTILOS ---
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
  padding: 6px 4px; 
  border-bottom: 2px solid ${({ theme }) => theme.color2};
  white-space: nowrap;
  
  @media ${Device.tablet} { font-size: 0.75rem; padding: 8px 8px; }
  &.team-col-header { text-align: left; padding-left: 20px; }
  &.stat-col { width: 1%; min-width: 25px; }
  
  &.pend-col { color: #f59e0b; }
  &.pts-col { color: ${v.colorPrincipal}; opacity: 1; font-weight: 900; }
  &.hide-mobile { @media (max-width: 500px) { display: none; } }
`;

const Td = styled.td`
  padding: 4px 4px; 
  font-size: 0.8rem; 
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  
  @media ${Device.tablet} { padding: 6px 8px; font-size: 0.9rem; }
  
  &.team-col {
    text-align: left; 
    padding-left: 10px; 
    background-color: inherit; 
    border-left: 4px solid ${({ $zoneColor }) => $zoneColor || 'transparent'};
    transition: background-color 0.3s ease;
    @media ${Device.tablet} { padding-left: 15px; border-left: 5px solid ${({ $zoneColor }) => $zoneColor || 'transparent'}; }
  }

  &.val-pj { font-weight: 700; }
  &.val-stat { color: ${({ theme }) => theme.text}CC; }
  &.val-dif { font-weight: 800; }
  
  &.val-pts { 
    font-weight: 900; color: ${v.colorPrincipal}; font-size: 1rem; 
    @media ${Device.tablet} { font-size: 1.15rem; } 
  }
  &.hide-mobile { @media (max-width: 500px) { display: none; } }
`;

const TrBase = styled.tr`
  cursor: ${({ $isPublic }) => $isPublic ? 'default' : 'pointer'}; 
  transition: background-color 0.2s;
  
  /* ELIMINADO EL USO DE :nth-child(even) CSS */
  
  /* AHORA USAMOS LA PROP $isEven PARA APLICAR EL FONDO EXPLICITAMENTE */
  /* Esto asegura que la librería de captura de imagen detecte el estilo */
  background-color: ${({ $isEven, theme }) => 
    $isEven ? (theme.bg2 || 'rgba(128, 128, 128, 0.04)') : 'transparent'};

  td { border-bottom: 1px solid ${({ $zoneColor, theme }) => $zoneColor ? `${$zoneColor}60` : theme.color2}; }
  
  &:hover { 
    background-color: ${({ theme }) => theme.bgAlpha}; 
  }
  
  &:last-child td { border-bottom: none; }
`;

const Tr = TrBase;
const MotionTr = motion(TrBase);

const TeamNameCell = styled.div`
  display: flex; align-items: center; gap: 8px; 
  @media ${Device.tablet} { gap: 14px; }
  
  .rank-container {
    display: flex; align-items: center; gap: 4px; 
    min-width: 32px; 
    justify-content: flex-end;
    @media ${Device.tablet} { min-width: 38px; gap: 6px; }
  }

  .pos { 
    font-weight: 800; 
    font-size: 0.75rem; 
    opacity: 0.5; 
    flex-shrink: 0;
    
    width: 16px; 
    text-align: center; 
    display: inline-block;

    @media ${Device.tablet} { 
      font-size: 0.9rem; 
      width: 20px; 
    }
  }

  .tendencia {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    
    .icon-up, .icon-down {
      margin: -3px 0; 
      line-height: 1; 
      font-size: 14px; 
      @media ${Device.tablet} { font-size: 18px; margin: -5px 0; }
    }

    .icon-up { color: #22c55e; }
    .icon-down { color: #ef4444; }
    .icon-same { color: ${({ theme }) => theme.text}40; font-size: 14px; margin-left: 2px; @media ${Device.tablet} { font-size: 16px; } }
  }
  
  .logo-container {
    width: 20px; height: 20px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    @media ${Device.tablet} { width: 26px; height: 26px; } 
    
    img { width: 100%; height: 100%; object-fit: contain; border-radius: 4px; }
    svg { width: 100%; height: 100%; }
  }
  
  .team-name { 
    font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; 
    @media (min-width: 400px) { max-width: 140px; } 
    @media ${Device.tablet} { font-size: 0.95rem; max-width: 300px; } 
  }
`;

const BottomInfoContainer = styled.div`
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 10px; 
  max-width: 1000px; 
  margin: 0 auto 15px auto; 
  padding: 0 10px;
`;

const TieBreakerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.7rem; 
  color: ${({ theme }) => theme.text}70; 
  text-align: center;
  flex-wrap: wrap;

  @media ${Device.tablet} { 
    font-size: 0.75rem; 
  }
`;

const LeyendaContainer = styled.div`
  display: flex; 
  gap: 8px; 
  flex-wrap: wrap; 
  justify-content: center; 
`;

const Badge = styled.span`
  font-size: 0.65rem; font-weight: 700; padding: 4px 8px; border-radius: 4px;
  background: ${({$color}) => `${$color}15`}; color: ${({$color}) => $color}; border: 1px solid ${({$color}) => $color};
  @media ${Device.tablet} { font-size: 0.75rem; padding: 6px 12px; }
`;