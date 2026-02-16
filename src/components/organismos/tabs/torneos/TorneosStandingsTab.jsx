import React, { useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../../supabase/supabase.config'; 
import { v } from '../../../../styles/variables';
import { Device } from '../../../../styles/breakpoints';
import { ContainerScroll } from '../../../atomos/ContainerScroll';
import { BiShareAlt, BiCheck } from "react-icons/bi"; // Eliminé iconos no usados si no los necesitas
import { motion } from 'framer-motion';

export const TorneosStandingsTab = ({
  torneo = {},
  equipos = [],
  estadisticas = [],
  reglas = {},
  onRefresh,
  isPublic = false
}) => {

  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_public || false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (onRefresh && typeof onRefresh === 'function') {
        onRefresh();
    }
  }, []);

  useEffect(() => {
    setIsPublicEnabled(torneo?.is_public || false);
  }, [torneo?.is_public]);

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

  const uniqueEquipos = useMemo(() => {
    if (!equipos) return [];
    const map = new Map();
    equipos.forEach(eq => map.set(eq.id, eq));
    return Array.from(map.values());
  }, [equipos]);

  const tablaGeneral = useMemo(() => {
    const data = uniqueEquipos.map((equipo) => {
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
        return a.pj - b.pj;
    });

  }, [uniqueEquipos, estadisticas]);

  const hasAnyLogo = useMemo(() => {
    return tablaGeneral.some(team => team.logo && team.logo.trim() !== '');
  }, [tablaGeneral]);

  const handleTogglePublic = async () => {
    if (updating) return;
    setUpdating(true);
    const newState = !isPublicEnabled;

    try {
        const { error } = await supabase
            .from('tournaments')
            .update({ is_public: newState })
            .eq('id', torneo.id);

        if (error) throw error;
        
        setIsPublicEnabled(newState);
        if (onRefresh) onRefresh(); 
        
    } catch (error) {
        console.error("Error updating public status:", error);
        alert("No se pudo actualizar el estado del enlace.");
    } finally {
        setUpdating(false);
    }
  };

  const handleShare = () => {
    const link = `${window.location.origin}/share/standings/${torneo.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" }
    })
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER DE ACCIONES (SOLO ADMIN) */}
      {!isPublic && (
        <ControlPanel>
            
            {/* TOGGLE SWITCH */}
            <ToggleContainer onClick={handleTogglePublic} $active={isPublicEnabled}>
                <div className="track">
                    <div className="thumb" />
                </div>
                <span className="label">
                    {updating ? "Guardando..." : (isPublicEnabled ? "Enlace Público: ACTIVO" : "Enlace Público: INACTIVO")}
                </span>
            </ToggleContainer>

            {/* BOTÓN DE COMPARTIR MODIFICADO */}
            {isPublicEnabled && (
                <ShareButton onClick={handleShare} $copied={copied}>
                    {copied ? <BiCheck size={20}/> : <BiShareAlt size={20}/>}
                    {/* Envolvemos el texto en span para ocultarlo en móvil */}
                    <span>{copied ? "Link Copiado" : "Copiar Enlace"}</span>
                </ShareButton>
            )}
        </ControlPanel>
      )}

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
                const status = getZoneStatus(index, tablaGeneral.length);
                const zoneColor = status?.color;
                const RowComponent = isPublic ? MotionTr : Tr;

                return (
                  <RowComponent
                    key={fila.id}
                    $isPublic={isPublic}
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
                    <Td className="stat-col">{fila.g}</Td>
                    <Td className="stat-col">{fila.e}</Td>
                    <Td className="stat-col">{fila.p}</Td>
                    <TdHideOnMobile className="stat-col">{fila.gf}</TdHideOnMobile>
                    <TdHideOnMobile className="stat-col">{fila.gc}</TdHideOnMobile>
                    <Td className="stat-col" style={{
                        color: fila.dg > 0 ? v.verde : fila.dg < 0 ? v.rojo : 'inherit',
                        fontWeight: 'bold'
                    }}>
                        {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
                    </Td>
                    <Td className="stat-col points-cell">{fila.pts}</Td>
                  </RowComponent>
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

// --- STYLES ---

const ControlPanel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 98%;
  max-width: 900px;
  margin: 0 auto 15px auto;
  background: ${({ theme }) => theme.bg};
  padding: 10px 15px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.color2};
  box-shadow: ${v.boxshadowGray};
  flex-wrap: nowrap; /* Cambio: Evita que se rompa la línea */
  gap: 10px;
`;

const ToggleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;

    .track {
        width: 44px;
        height: 24px;
        background-color: ${({ $active, theme }) => $active ? v.verde : theme.bg3};
        border-radius: 20px;
        position: relative;
        transition: background-color 0.3s ease;
        border: 1px solid ${({ theme }) => theme.color2};
    }

    .thumb {
        width: 20px;
        height: 20px;
        background-color: #fff;
        border-radius: 50%;
        position: absolute;
        top: 1px;
        left: 1px;
        transform: ${({ $active }) => $active ? 'translateX(20px)' : 'translateX(0)'};
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .label {
        font-size: 0.85rem;
        font-weight: 600;
        color: ${({ $active, theme }) => $active ? theme.text : theme.text + '80'};
        /* En móvil podemos acortar el texto del label si quieres, pero por ahora lo dejamos */
    }
`;

// --- BOTÓN DE COMPARTIR MODIFICADO ---
const ShareButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: ${({ $copied, theme }) => $copied ? v.verde : theme.bg2};
  color: ${({ $copied, theme }) => $copied ? '#fff' : theme.text};
  border: 1px solid ${({ theme }) => theme.color2};
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.3s ease;
  white-space: nowrap;
  
  &:hover {
    transform: translateY(-2px);
    background-color: ${({ $copied, theme }) => $copied ? v.verde : theme.bg3};
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  /* MEDIA QUERY PARA MÓVIL (Menos de 768px) */
  @media (max-width: 768px) {
    padding: 0;           /* Quitamos padding */
    width: 36px;          /* Ancho fijo */
    height: 36px;         /* Alto fijo */
    justify-content: center; /* Centrar icono */
    border-radius: 50%;   /* Hacerlo circular */
    
    /* Ocultamos el texto */
    span {
        display: none;
    }
  }
`;

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
  max-height: 600px;
  overflow-y: auto;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
  padding-right: 6px;
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

const TrBase = styled.tr`
  cursor: ${({ $isPublic }) => $isPublic ? 'default' : 'pointer'}; 
  transition: background-color 0.2s;
  &:hover td { background-color: ${({ theme }) => theme.bgAlpha}; }
`;

const Tr = TrBase;
const MotionTr = motion(TrBase);

const TdHideOnMobile = styled(Td)`
  display: table-cell;
  @media (max-width: 420px) {
    display: none;
  }
`;

const ThHideOnMobile = styled(Th)`
  display: table-cell;
  @media (max-width: 420px) {
    display: none;
  }
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