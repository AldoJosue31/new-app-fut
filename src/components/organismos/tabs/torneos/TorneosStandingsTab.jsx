import React, { useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../../../../supabase/supabase.config'; 
import { v } from '../../../../styles/variables';
import { BiShareAlt, BiCheck } from "react-icons/bi"; 
import { RiImageLine } from "react-icons/ri"; 

import StandingsExportModal from './subcomponents/StandingsExportModal';
import StandingsTable from './subcomponents/StandingsTable';
import { StandingsJornadaSelector } from './StandingsJornadaSelector';
import { Skeleton } from '../../../atomos/Skeleton'; // ajusta ruta si la necesitas distinta

export const TorneosStandingsTab = ({
  torneo = {},
  equipos = [],
  estadisticas = [],
  partidos = [],
  jornadas: jornadasProp = [],
  reglas = {},
  onRefresh,
  isPublic = false,
  isLoading = false 
}) => {

  const [copied, setCopied] = useState(false);
  const [isPublicEnabled, setIsPublicEnabled] = useState(torneo?.is_public || false);
  const [updating, setUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [selectedJornadaView, setSelectedJornadaView] = useState('recent');

  // jornadas fetch por si el padre no las pasa
  const [fetchedJornadas, setFetchedJornadas] = useState([]);
  const [fetchingJornadas, setFetchingJornadas] = useState(false);

  useEffect(() => {
    setIsPublicEnabled(torneo?.is_public || false);
  }, [torneo?.is_public]);

  useEffect(() => {
    setSelectedJornadaView('recent');
  }, [torneo?.id]);

  // fetch jornadas SOLO si no se pasan por prop
  useEffect(() => {
    let mounted = true;
    const loadJornadas = async () => {
      if (!torneo?.id) {
        if (mounted) setFetchedJornadas([]);
        return;
      }
      if (Array.isArray(jornadasProp) && jornadasProp.length > 0) return;

      try {
        setFetchingJornadas(true);
        const { data, error } = await supabase
          .from('jornadas')
          .select('*')
          .eq('tournament_id', torneo.id)
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching jornadas:', error);
          if (mounted) setFetchedJornadas([]);
        } else {
          if (mounted) setFetchedJornadas(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Fetch jornadas unexpected error:', err);
        if (mounted) setFetchedJornadas([]);
      } finally {
        if (mounted) setFetchingJornadas(false);
      }
    };

    loadJornadas();
    return () => { mounted = false; };
  }, [torneo?.id, jornadasProp]);

  const mergedJornadas = (Array.isArray(jornadasProp) && jornadasProp.length > 0) ? jornadasProp : fetchedJornadas;

  const config = useMemo(() => {
    let c = {};
    if (typeof torneo?.config === 'string') {
        try { c = JSON.parse(torneo.config); } catch(e){}
    } else {
        c = torneo?.config || reglas || {};
    }

    return {
      ascensos: parseInt(c.ascensos) || 0,
      descensos: parseInt(c.descensos) || 0,
      zonaLiguilla: c.zonaLiguilla || false,
      clasificados: parseInt(c.clasificados) || 0,
      repechaje: parseInt(c.repechajeTeams) || 0,
      winPoints: c.winPoints !== undefined ? Number(c.winPoints) : 3,
      drawPoints: c.drawPoints !== undefined ? Number(c.drawPoints) : 1,
      lossPoints: c.lossPoints !== undefined ? Number(c.lossPoints) : 0,
      tieBreakType: c.tieBreakType || 'normal'
    };
  }, [torneo?.config, reglas]);

  const uniqueEquipos = useMemo(() => {
    if (!equipos) return [];
    const map = new Map();
    equipos.forEach(eq => map.set(eq.id, eq));
    return Array.from(map.values());
  }, [equipos]);

  // Filtrar partidos que correspondan al torneo actual (defensivo)
  const relevantMatches = useMemo(() => {
    if (!partidos || partidos.length === 0) return [];
    return partidos.filter(p => {
      const torneoFromMatch =
        (p.jornadas && (p.jornadas.tournament_id || p.jornadas.tournament)) ||
        (p.jornada && (p.jornada.tournament_id || p.jornada.tournament)) ||
        p.tournament_id ||
        null;

      if (!torneo?.id) return true;

      if (!torneoFromMatch) {
        if (p.jornada_id && Array.isArray(mergedJornadas) && mergedJornadas.length > 0) {
          const j = mergedJornadas.find(x => Number(x.id) === Number(p.jornada_id));
          if (j && (Number(j.tournament_id) === Number(torneo.id) || !j.tournament_id)) return true;
        }
        return false;
      }
      return Number(torneoFromMatch) === Number(torneo.id);
    });
  }, [partidos, torneo?.id, mergedJornadas]);

  // ====== DETECCIÓN INMEDIATA + cálculo de pendientes por jornada ======
  const {
    effectiveJornada,
    pendingsByJornada,
    jornadasConfirmadasForDropdown,
    allJornadasChronological
  } = useMemo(() => {
    const parseJNum = (name) => {
      const m = ('' + (name || '')).match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    };

    const matchesByJornada = {};
    const pendings = {};
    let maxJFromMatches = 0;

    // 1) Build matchesByJornada + pendings (pendings STRICT only status === 'pendiente' and both teams present)
    relevantMatches.forEach(p => {
      // prefer name in joined jornada object; fallback to join via jornada_id -> mergedJornadas later
      let jName = p.jornadas?.name || p.jornada?.name || '';
      let jNum = parseJNum(jName);

      if ((!jNum || jNum === 0) && p.jornada_id && Array.isArray(mergedJornadas)) {
        const jObj = mergedJornadas.find(x => Number(x.id) === Number(p.jornada_id));
        if (jObj) {
          jNum = parseJNum(jObj.name);
          jName = jObj.name;
        }
      }

      if (jNum <= 0) return;

      if (!matchesByJornada[jNum]) matchesByJornada[jNum] = [];
      matchesByJornada[jNum].push(p);

      if (jNum > maxJFromMatches) maxJFromMatches = jNum;

      const st = (p.status || '').toLowerCase();
      const validTeams = p.team1_id && p.team2_id;
      if (st === 'pendiente' && validTeams) {
        pendings[jNum] = (pendings[jNum] || 0) + 1;
      }
    });

    // 2) Obtener jornadas confirmadas de mergedJornadas (preferible)
    const confirmedSet = new Set();
    let maxConfirmed = 0;

    if (Array.isArray(mergedJornadas) && mergedJornadas.length > 0) {
      mergedJornadas.forEach(j => {
        if (torneo?.id && j.tournament_id && Number(j.tournament_id) !== Number(torneo.id)) return;
        const jNum = parseJNum(j.name);
        const status = (j.status || '').toLowerCase();
        const isConfirmed = ['confirmada', 'activa', 'en curso', 'publicada'].includes(status);
        if (jNum > 0 && isConfirmed) {
          confirmedSet.add(jNum);
          if (jNum > maxConfirmed) maxConfirmed = jNum;
        }
      });
    }

    // 3) También buscar confirmadas directamente desde matches (si tienen join info p.jornadas?.status)
    relevantMatches.forEach(p => {
      const jStatus = (p.jornadas?.status || p.jornada?.status || '').toLowerCase();
      if (!jStatus) return;
      const isConfirmed = ['confirmada', 'activa', 'en curso', 'publicada'].includes(jStatus);
      if (!isConfirmed) return;
      const jName = p.jornadas?.name || p.jornada?.name || '';
      const jNum = parseJNum(jName);
      if (jNum > 0) {
        confirmedSet.add(jNum);
        if (jNum > maxConfirmed) maxConfirmed = jNum;
      }
    });
const confirmedList = [];

if (Array.isArray(mergedJornadas)) {

  // 1️⃣ Obtener jornadas confirmadas ordenadas
  const confirmedJornadas = mergedJornadas
    .map(j => ({
      num: parseJNum(j.name),
      status: (j.status || '').toLowerCase()
    }))
    .filter(j => j.num > 0 && j.status.includes('confirmad'))
    .sort((a, b) => a.num - b.num);

  if (confirmedJornadas.length === 0) {
    return {
      effectiveJornada: maxJFromMatches || 1,
      pendingsByJornada: pendings,
      jornadasConfirmadasForDropdown: [],
      allJornadasChronological: []
    };
  }

  // 2️⃣ Detectar última jornada confirmada
  const lastConfirmedNum = confirmedJornadas[confirmedJornadas.length - 1].num;

  confirmedJornadas.forEach(j => {
    const jNum = j.num;
    const matches = matchesByJornada[jNum] || [];

    // Contar pendientes (solo para mostrar en UI)
    let pendingCount = 0;
    let allFinished = true;

    matches.forEach(m => {
      const st = (m.status || '').toLowerCase();

      if (st !== 'finalizado' && st !== 'completado' && st !== 'jugado' && st !== 'terminado') {
        allFinished = false;
      }

      if (st === 'pendiente' && m.team1_id && m.team2_id) {
        pendingCount++;
      }
    });

    // 3️⃣ Si es la última confirmada pero NO todos finalizados → excluir
    if (jNum === lastConfirmedNum && !allFinished) {
      return;
    }

    confirmedList.push({
      num: jNum,
      pendientes: pendingCount
    });
  });
}

confirmedList.sort((a, b) => a.num - b.num);

    // 5) Cronological list (ALL jornadas detected either from mergedJornadas or from matches)
    const cronSet = new Set();
    if (Array.isArray(mergedJornadas)) {
      mergedJornadas.forEach(j => {
        if (torneo?.id && j.tournament_id && Number(j.tournament_id) !== Number(torneo.id)) return;
        const n = parseJNum(j.name);
        if (n > 0) cronSet.add(n);
      });
    }
    Object.keys(matchesByJornada).forEach(k => {
      const n = Number(k);
      if (n > 0) cronSet.add(n);
    });
    // create sorted array with pendings count
    const chrono = Array.from(cronSet).map(n => ({ num: n, pendientes: pendings[n] || 0 })).sort((a,b)=>a.num-b.num);

    // 6) Decide effective jornada:
    // prefer maxConfirmed (from mergedJornadas or matches' joined jornada status)
    // if none, fallback to maxJFromMatches (last jornada with any match)
    // final fallback: 1
    const effective = (maxConfirmed && maxConfirmed > 0) ? maxConfirmed : (maxJFromMatches || 1);

    return {
      effectiveJornada: effective,
      pendingsByJornada: pendings,
      jornadasConfirmadasForDropdown: confirmedList,
      allJornadasChronological: chrono
    };
  }, [relevantMatches, mergedJornadas, torneo?.id]);

  // 2. TABLA: construye tabla usando SOLO partidos con status 'pendiente' para contador PND
  const tablaGeneral = useMemo(() => {
    const buildTableUpTo = (limitJornada, limitPendientes) => {
      const statsMap = {};
      uniqueEquipos.forEach(eq => {
        statsMap[eq.id] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, partidosPendientes: 0 };
      });

      relevantMatches.forEach(partido => {
        const name = partido.jornadas?.name || partido.jornada?.name || '';
        let matchDigits = ('' + name).match(/\d+/);
        let jNum = matchDigits ? parseInt(matchDigits[0], 10) : 0;

        if (jNum === 0 && partido.jornada_id && Array.isArray(mergedJornadas)) {
          const jObj = mergedJornadas.find(x => Number(x.id) === Number(partido.jornada_id));
          if (jObj) {
            const jm = ('' + (jObj.name || '')).match(/\d+/);
            if (jm) jNum = parseInt(jm[0], 10);
          }
        }
        if (jNum <= 0 || jNum > limitJornada) return;

        const localId = partido.team1_id;
        const visitanteId = partido.team2_id;
        if (!localId || !visitanteId) return;

        const local = statsMap[localId];
        const visitante = statsMap[visitanteId];
        if (!local || !visitante) return;

        const statusLower = (partido.status || '').toLowerCase();
        const isFinished = ['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower);
        
        const golesLocal = parseInt(partido.goals1, 10);
        const golesVisitante = parseInt(partido.goals2, 10);
        const hasValidResult = !isNaN(golesLocal) && !isNaN(golesVisitante);
        
        const isCancelled = ['cancelado', 'anulado'].includes(statusLower);
        const isDescanso = ['descanso'].includes(statusLower);

        const isPlayed = isFinished && hasValidResult;

        // PND: SOLO cuenta si status === 'pendiente' (y jornada dentro del límite)
        if (statusLower === 'pendiente' && jNum <= limitPendientes && !isCancelled && !isDescanso) {
          local.partidosPendientes += 1;
          visitante.partidosPendientes += 1;
          return;
        }

        if (!isPlayed) return;

        local.pj += 1; visitante.pj += 1;
        local.gf += golesLocal; visitante.gf += golesVisitante;
        local.gc += golesVisitante; visitante.gc += golesLocal;

        if (golesLocal > golesVisitante) {
          local.g += 1; visitante.p += 1;
        } else if (golesLocal < golesVisitante) {
          visitante.g += 1; local.p += 1;
        } else {
          local.e += 1; visitante.e += 1;
        }

        let ptsL = parseInt(partido.puntos1, 10);
        let ptsV = parseInt(partido.puntos2, 10);
        
        if (isNaN(ptsL)) ptsL = 0;
        if (isNaN(ptsV)) ptsV = 0;

        const isZeroZeroLegit = (ptsL === 0 && ptsV === 0 && golesLocal === golesVisitante && config.drawPoints === 0);
        
        if (ptsL === 0 && ptsV === 0 && !isZeroZeroLegit) {
            if (golesLocal > golesVisitante) {
                ptsL = config.winPoints;
                ptsV = config.lossPoints;
            } else if (golesLocal < golesVisitante) {
                ptsL = config.lossPoints;
                ptsV = config.winPoints;
            } else {
                ptsL = config.drawPoints;
                ptsV = config.drawPoints;
            }
        }

        local.pts += ptsL;
        visitante.pts += ptsV;
      });

      const data = uniqueEquipos.map((equipo) => {
        const stats = statsMap[equipo.id] || { pj:0, g:0, e:0, p:0, gf:0, gc:0, dg:0, pts:0, partidosPendientes:0 };
        return {
          id: equipo.id,
          nombre: equipo.name || equipo.nombre,
          logo: equipo.logo_url || equipo.img,
          color: equipo.color, 
          ...stats,
          dg: (stats.gf || 0) - (stats.gc || 0)
        };
      });

      return data.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.dg !== a.dg) return b.dg - a.dg;
          if (b.gf !== a.gf) return b.gf - a.gf;
          return a.pj - b.pj;
      });
    };

    let limitCurrent = 0;
    let limitPendientes = 0;

    if (selectedJornadaView === 'recent') {
      limitCurrent = effectiveJornada; 
      limitPendientes = effectiveJornada; 
    } else {
      limitCurrent = parseInt(selectedJornadaView, 10);
      limitPendientes = limitCurrent; 
    }

    const prevLimit = limitCurrent - 1;

    const prevTable = buildTableUpTo(prevLimit, prevLimit);
    const prevRanks = {};
    prevTable.forEach((eq, index) => { prevRanks[eq.id] = index + 1; });

    const currentTable = buildTableUpTo(limitCurrent, limitPendientes);

    return currentTable.map((eq, index) => {
      const currentRank = index + 1;
      const prevRank = prevRanks[eq.id];

      let tendencia = 'same';
      let posDiff = 0; 
      
      if (prevLimit <= 0 || !prevRank) {
        tendencia = 'same'; 
      } else if (prevRank > currentRank) {
        tendencia = 'up';
        posDiff = prevRank - currentRank; 
      } else if (prevRank < currentRank) {
        tendencia = 'down';
        posDiff = currentRank - prevRank; 
      }

      return { ...eq, tendencia, posDiff };
    });

  }, [uniqueEquipos, selectedJornadaView, effectiveJornada, relevantMatches, config, mergedJornadas]);

  // Texto de la jornada (usa solo pendientes con status 'Pendiente')
  const activeJornadaName = useMemo(() => {
    if ((!relevantMatches || relevantMatches.length === 0) && (!mergedJornadas || mergedJornadas.length === 0)) return 'Sin iniciar';
    if (effectiveJornada === 0) return 'Sin iniciar';
    
    if (selectedJornadaView === 'recent') {
        let totalPendientes = 0;
        relevantMatches.forEach(m => {
            const name = m.jornadas?.name || m.jornada?.name || '';
            const matchDigits = ('' + name).match(/\d+/);
            const jNum = matchDigits ? parseInt(matchDigits[0], 10) : 0;

            if (jNum > 0 && jNum <= effectiveJornada && m.team1_id && m.team2_id) {
                const statusLower = (m.status || '').toLowerCase();
                if (statusLower === 'pendiente') totalPendientes++;
            }
        });

        const suffix = totalPendientes > 0 
          ? ` (con ${totalPendientes} pendiente${totalPendientes > 1 ? 's' : ''})` 
          : '';
        return `Jornada ${effectiveJornada}${suffix}`; 
    } else {
        const sel = parseInt(selectedJornadaView, 10);
        if (isNaN(sel)) return `Jornada ${effectiveJornada}`;
        let pend = 0;
        relevantMatches.forEach(m => {
          const name = m.jornadas?.name || m.jornada?.name || '';
          const matchDigits = ('' + name).match(/\d+/);
          const jNum = matchDigits ? parseInt(matchDigits[0], 10) : 0;
          if (jNum === sel && (m.status || '').toLowerCase() === 'pendiente') pend++;
        });
        const suffix = pend > 0 ? ` (con ${pend} pendiente${pend>1?'s':''})` : ' (Completada)';
        return `Jornada ${sel}${suffix}`;
    }
  }, [selectedJornadaView, effectiveJornada, relevantMatches, mergedJornadas]);

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

// ===== SKELETON ESTABLE DEFINITIVO =====
const [showSkeleton, setShowSkeleton] = useState(true);
const skeletonLockedRef = React.useRef(false);

useEffect(() => {

  // Si ya se ocultó una vez, nunca volver a mostrar
  if (skeletonLockedRef.current) return;

  // Esperar hasta que exista jornada válida
  const jornadaLista =
    effectiveJornada &&
    effectiveJornada > 0 &&
    tablaGeneral &&
    tablaGeneral.length > 0;

  if (!jornadaLista) return;

  // Anti-flicker (oculta suave)
  const t = setTimeout(() => {
    setShowSkeleton(false);
    skeletonLockedRef.current = true; // 🔒 nunca vuelve
  }, 220);

  return () => clearTimeout(t);

}, [effectiveJornada, tablaGeneral]);

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

            <div style={{ width: '280px' }}>
              {showSkeleton ? (
                <Skeleton width="100%" height="36px" radius="8px" />
              ) : (
                <SelectorWrapper>
                  <StandingsJornadaSelector 
                    selected={selectedJornadaView}
                    onChange={setSelectedJornadaView}
                    effectiveJornada={effectiveJornada}
                    jornadasOptions={jornadasConfirmadasForDropdown}
                  />
                </SelectorWrapper>
              )}
            </div>

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
        isLoading={showSkeleton} 
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

/* ---------- estilos (sin cambios relevantes) ---------- */
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

const SelectorWrapper = styled.div`
  max-width: 320px;
  width: 100%;
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