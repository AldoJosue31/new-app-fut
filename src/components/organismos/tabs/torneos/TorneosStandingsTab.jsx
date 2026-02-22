import React, { useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../../supabase/supabase.config'; 
import { v } from '../../../../styles/variables';
import { BiShareAlt, BiCheck } from "react-icons/bi"; 
import { RiImageLine } from "react-icons/ri"; 

import StandingsExportModal from './subcomponents/StandingsExportModal';
import StandingsTable from './subcomponents/StandingsTable';

export const TorneosStandingsTab = ({
  torneo = {},
  equipos = [],
  estadisticas = [],
  partidos = [],
  reglas = {},
  onRefresh,
  isPublic = false
}) => {

  const [copied, setCopied] = useState(false);
  const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_public || false);
  const [updating, setUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [selectedJornadaView, setSelectedJornadaView] = useState('recent');

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
      repechaje: parseInt(c.repechajeTeams) || 0,
      winPoints: parseInt(c.winPoints) || 3,
      drawPoints: parseInt(c.drawPoints) || 1,
      lossPoints: parseInt(c.lossPoints) || 0,
    };
  }, [torneo?.config, reglas]);

  const uniqueEquipos = useMemo(() => {
    if (!equipos) return [];
    const map = new Map();
    equipos.forEach(eq => map.set(eq.id, eq));
    return Array.from(map.values());
  }, [equipos]);

  // 1. OBTENER HISTORIAL DE OPCIONES 
  const historialJornadas = useMemo(() => {
    if (!partidos || partidos.length === 0) return [];

    const matchesByJornada = {};
    partidos.forEach(p => {
      const num = p.jornadas ? parseInt(p.jornadas.name.replace(/\D/g, ''), 10) : 0;
      if (num > 0) {
        if (!matchesByJornada[num]) matchesByJornada[num] = [];
        matchesByJornada[num].push(p);
      }
    });

    const opciones = [];

    Object.entries(matchesByJornada).forEach(([jNumStr, matches]) => {
      const jNum = parseInt(jNumStr, 10);
      const realMatches = matches.filter(m => m.team1_id && m.team2_id);
      
      if (realMatches.length > 0) {
        let playedCount = 0;
        let pendingCount = 0;
        let unconfirmedCount = 0; 
        
        realMatches.forEach(m => {
          const statusLower = (m.status || '').toLowerCase();
          const isFinished = ['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower);
          const isPendiente = statusLower === 'pendiente'; 
          const hasResult = m.goals1 != null && m.goals2 != null; 
          
          if (isFinished && hasResult) {
            playedCount++;
          } else if (isPendiente) {
            pendingCount++;
          } else {
            unconfirmedCount++;
          }
        });

        if (unconfirmedCount === 0 && playedCount > 0) {
          opciones.push({
            num: jNum,
            pendingCount: pendingCount
          });
        }
      }
    });

    return opciones.sort((a, b) => a.num - b.num);
  }, [partidos]);

  // 2. ENCONTRAR LA JORNADA EFECTIVA DE FORMA GLOBAL
  const effectiveJornada = useMemo(() => {
    if (selectedJornadaView === 'recent') {
      let maxJornadaIniciada = 0;
      partidos.forEach(m => {
         if (!m.team1_id || !m.team2_id) return;
         const statusLower = (m.status || '').toLowerCase();
         const isFinished = ['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower);
         const hasResult = m.goals1 != null && m.goals2 != null;
         
         if (isFinished && hasResult) {
             const jNum = m.jornadas ? parseInt(m.jornadas.name.replace(/\D/g, ''), 10) : 0;
             if (jNum > maxJornadaIniciada) maxJornadaIniciada = jNum;
         }
      });
      return maxJornadaIniciada;
    }
    return parseInt(selectedJornadaView, 10) || 0;
  }, [selectedJornadaView, partidos]);


  // 3. CÁLCULO DE TABLA DOBLE CON DIFERENCIA DE PUESTOS
  const tablaGeneral = useMemo(() => {

    const getGoles = (partido, keys) => {
      for (const key of keys) {
        const val = partido[key];
        if (val !== undefined && val !== null && val !== '') {
          const num = parseInt(val, 10);
          if (!isNaN(num)) return num;
        }
      }
      return 0; 
    };

    const buildTableUpTo = (limitJornada) => {
      const statsMap = {};
      uniqueEquipos.forEach(eq => {
        statsMap[eq.id] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
      });

      partidos.forEach(partido => {
        const jNum = partido.jornadas ? parseInt(partido.jornadas.name.replace(/\D/g, ''), 10) : 0;
        
        if (jNum <= 0 || jNum > limitJornada) return;

        const statusLower = (partido.status || '').toLowerCase();
        const isPlayed = ['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower);
        if (!isPlayed) return;

        const localId = partido.team1_id;
        const visitanteId = partido.team2_id;
        if (!localId || !visitanteId) return;

        const local = statsMap[localId];
        const visitante = statsMap[visitanteId];
        if (!local || !visitante) return;

        const golesLocal = getGoles(partido, ['goals1']);
        const golesVisitante = getGoles(partido, ['goals2']);

        local.pj += 1; visitante.pj += 1;
        local.gf += golesLocal; visitante.gf += golesVisitante;
        local.gc += golesVisitante; visitante.gc += golesLocal;

        if (golesLocal > golesVisitante) {
          local.g += 1; local.pts += config.winPoints; 
          visitante.p += 1; visitante.pts += config.lossPoints;
        } else if (golesLocal < golesVisitante) {
          visitante.g += 1; visitante.pts += config.winPoints; 
          local.p += 1; local.pts += config.lossPoints;
        } else {
          local.e += 1; visitante.e += 1;
          local.pts += config.drawPoints; visitante.pts += config.drawPoints;
        }
      });

      const data = uniqueEquipos.map((equipo) => ({
        id: equipo.id,
        nombre: equipo.name || equipo.nombre,
        logo: equipo.logo_url || equipo.img,
        ...statsMap[equipo.id],
      }));

      return data.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.dg !== a.dg) return b.dg - a.dg;
          if (b.gf !== a.gf) return b.gf - a.gf;
          return a.pj - b.pj;
      });
    };

    const prevTable = buildTableUpTo(effectiveJornada - 1);
    const prevRanks = {};
    prevTable.forEach((eq, index) => {
      prevRanks[eq.id] = index + 1; 
    });

    let currentTable = [];
    if (selectedJornadaView === 'recent') {
      const data = uniqueEquipos.map((equipo) => {
        const stats = estadisticas.find(s => s.team_id === equipo.id) || {};
        return {
          id: equipo.id,
          nombre: equipo.name || equipo.nombre,
          logo: equipo.logo_url || equipo.img,
          pj: stats.pj || 0, g: stats.pg || 0, e: stats.pe || 0, p: stats.pp || 0,
          gf: stats.gf || 0, gc: stats.gc || 0, dg: stats.dg || 0, pts: stats.pts || 0,
        };
      });
      currentTable = data.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.dg !== a.dg) return b.dg - a.dg;
          if (b.gf !== a.gf) return b.gf - a.gf;
          return a.pj - b.pj;
      });
    } else {
      currentTable = buildTableUpTo(effectiveJornada);
    }

    return currentTable.map((eq, index) => {
      const currentRank = index + 1;
      const prevRank = prevRanks[eq.id];

      let tendencia = 'same';
      let posDiff = 0; // NUEVO: Extraemos la cantidad de puestos que se movió
      
      if (effectiveJornada <= 1 || !prevRank) {
        tendencia = 'same'; 
      } else if (prevRank > currentRank) {
        tendencia = 'up';
        posDiff = prevRank - currentRank; // Ej: Pasó del 5 al 2 -> Movió 3 puestos
      } else if (prevRank < currentRank) {
        tendencia = 'down';
        posDiff = currentRank - prevRank; // Ej: Pasó del 1 al 2 -> Perdió 1 puesto
      }

      // Devolvemos el equipo con su tendencia y la diferencia exacta de puestos
      return { ...eq, tendencia, posDiff };
    });

  }, [uniqueEquipos, estadisticas, selectedJornadaView, effectiveJornada, partidos, config]);

  // 4. TEXTO INTELIGENTE DE LA JORNADA ACTIVA
  const activeJornadaName = useMemo(() => {
    if (!partidos || partidos.length === 0) return 'Sin iniciar';
    
    if (selectedJornadaView === 'recent') {
      if (effectiveJornada === 0) return 'Vista Actual';

      let totalPendientes = 0;
      let totalPorConfirmar = 0;

      partidos.forEach(m => {
        if (!m.team1_id || !m.team2_id) return; 
        const jNum = m.jornadas ? parseInt(m.jornadas.name.replace(/\D/g, ''), 10) : 0;
        
        if (jNum > 0 && jNum <= effectiveJornada) {
          const statusLower = (m.status || '').toLowerCase();
          const isFinished = ['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower);
          const isPendiente = statusLower === 'pendiente';
          const hasResult = m.goals1 != null && m.goals2 != null;

          if (isPendiente) {
            totalPendientes++;
          } else if (!isFinished || !hasResult) {
            totalPorConfirmar++;
          }
        }
      });

      let extras = [];
      if (totalPendientes > 0) extras.push(`${totalPendientes} pendiente${totalPendientes !== 1 ? 's' : ''}`);
      if (totalPorConfirmar > 0) extras.push(`${totalPorConfirmar} por confirmar`);

      const suffix = extras.length > 0 ? ` (${extras.join(', ')})` : '';
      return `Jornada ${effectiveJornada}${suffix}`; 

    } else {
      const targetJornada = historialJornadas.find(j => String(j.num) === String(selectedJornadaView));
      if (targetJornada) {
        const suffix = targetJornada.pendingCount > 0 
          ? ` (con ${targetJornada.pendingCount} pendiente${targetJornada.pendingCount > 1 ? 's' : ''})` 
          : '';
        return `Jornada ${targetJornada.num}${suffix}`;
      }
      return 'Vista Actual';
    }
  }, [selectedJornadaView, historialJornadas, partidos, effectiveJornada]);

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

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isPublic && (
        <ControlPanel>
            <ToggleContainer onClick={handleTogglePublic} $active={isPublicEnabled}>
                <div className="track"><div className="thumb" /></div>
                <span className="label">
                    {updating ? "Guardando..." : (isPublicEnabled ? "Enlace Público: ACTIVO" : "Enlace Público: INACTIVO")}
                </span>
            </ToggleContainer>

            {historialJornadas.length > 0 && (
                <SelectJornada
                  value={selectedJornadaView}
                  onChange={(e) => setSelectedJornadaView(e.target.value)}
                >
                  <option value="recent">Vista Actual</option>
                  <optgroup label="Historial de Jornadas">
                    {historialJornadas.map(j => {
                      const suffix = j.pendingCount > 0 
                        ? ` (con ${j.pendingCount} pendiente${j.pendingCount > 1 ? 's' : ''})` 
                        : '';
                      return (
                        <option key={j.num} value={j.num}>
                          Jornada {j.num}{suffix}
                        </option>
                      );
                    })}
                  </optgroup>
                </SelectJornada>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
                <ShareButton onClick={() => setShowExportModal(true)} title="Exportar Tabla">
                    <RiImageLine size={20}/>
                    <span>Exportar</span>
                </ShareButton>

                {isPublicEnabled && (
                    <ShareButton onClick={handleShare} $copied={copied} title="Copiar Enlace">
                        {copied ? <BiCheck size={20}/> : <BiShareAlt size={20}/>}
                        <span>{copied ? "Copiado" : "Link"}</span>
                    </ShareButton>
                )}
            </div>
        </ControlPanel>
      )}

      <StandingsTable 
        tablaGeneral={tablaGeneral} 
        config={config} 
        isPublic={isPublic} 
      />

      <StandingsExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tablaGeneral={tablaGeneral}
        torneo={torneo}
        config={config}
        activeJornadaName={activeJornadaName} 
      />
    </div>
  );
};

// --- STYLES EXCLUSIVOS DE LOS CONTROLES Y SELECTORES ---
const SelectJornada = styled.select`
  background-color: ${({ theme }) => theme.bg2};
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.color2};
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  flex-shrink: 1;
  max-width: 250px;
  transition: all 0.3s ease;
  text-overflow: ellipsis;

  &:focus { border-color: ${v.primary}; }
  
  @media (max-width: 600px) {
    max-width: 140px;
    font-size: 0.75rem;
  }
`;

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
  flex-wrap: wrap; 
  gap: 10px;
`;

const ToggleContainer = styled.div`
    display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;
    .track {
        width: 44px; height: 24px; background-color: ${({ $active, theme }) => $active ? v.verde : theme.bg3};
        border-radius: 20px; position: relative; transition: background-color 0.3s ease; border: 1px solid ${({ theme }) => theme.color2};
    }
    .thumb {
        width: 20px; height: 20px; background-color: #fff; border-radius: 50%; position: absolute; top: 1px; left: 1px;
        transform: ${({ $active }) => $active ? 'translateX(20px)' : 'translateX(0)'};
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .label { font-size: 0.85rem; font-weight: 600; color: ${({ $active, theme }) => $active ? theme.text : theme.text + '80'}; }
    @media (max-width: 600px) { .label { display: none; } }
`;

const ShareButton = styled.button`
  display: flex; align-items: center; gap: 8px;
  background-color: ${({ $copied, theme }) => $copied ? v.verde : theme.bg2};
  color: ${({ $copied, theme }) => $copied ? '#fff' : theme.text};
  border: 1px solid ${({ theme }) => theme.color2};
  padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
  transition: all 0.3s ease; white-space: nowrap;
  
  &:hover {
    transform: translateY(-2px);
    background-color: ${({ $copied, theme }) => $copied ? v.verde : theme.bg3};
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  @media (max-width: 768px) {
    padding: 0; width: 36px; height: 36px; justify-content: center; border-radius: 50%;
    span { display: none; }
  }
`;