import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/supabase.config';

export const useTorneoStandingsLogic = ({
  torneo,
  equipos,
  partidos,
  jornadasProp,
  reglas,
  selectedJornadaView
}) => {
  const [fetchedJornadas, setFetchedJornadas] = useState([]);
  const [fetchingJornadas, setFetchingJornadas] = useState(false);

  const jornadasStr = JSON.stringify(jornadasProp || []);

  // 1. Obtener jornadas si no vienen por props
  useEffect(() => {
    let mounted = true;
    const loadJornadas = async () => {
      if (!torneo?.id) {
        if (mounted) setFetchedJornadas([]);
        return;
      }
      
      const parsedJornadas = JSON.parse(jornadasStr);
      if (Array.isArray(parsedJornadas) && parsedJornadas.length > 0) return;

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
  }, [torneo?.id, jornadasStr]);

  const mergedJornadas = (Array.isArray(jornadasProp) && jornadasProp.length > 0) ? jornadasProp : fetchedJornadas;

  // 2. Configuración de puntos y liguilla
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

  // 3. Filtrar partidos del torneo
  const relevantMatches = useMemo(() => {
    if (!partidos || partidos.length === 0) return [];
    return partidos.filter(p => {
      const torneoFromMatch =
        (p.jornadas && (p.jornadas.tournament_id || p.jornadas.tournament)) ||
        (p.jornada && (p.jornada.tournament_id || p.jornada.tournament)) ||
        p.tournament_id || null;

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

  // 4. Detección de la jornada actual/efectiva y listado para el dropdown
  const { effectiveJornada, jornadasConfirmadasForDropdown } = useMemo(() => {
    const parseJNum = (name) => {
      const m = ('' + (name || '')).match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    };

    const matchesByJornada = {};
    let maxJFromMatches = 0;

    relevantMatches.forEach(p => {
      let jName = p.jornadas?.name || p.jornada?.name || '';
      let jNum = parseJNum(jName);

      if ((!jNum || jNum === 0) && p.jornada_id && Array.isArray(mergedJornadas)) {
        const jObj = mergedJornadas.find(x => Number(x.id) === Number(p.jornada_id));
        if (jObj) jNum = parseJNum(jObj.name);
      }

      if (jNum <= 0) return;

      if (!matchesByJornada[jNum]) matchesByJornada[jNum] = [];
      matchesByJornada[jNum].push(p);

      if (jNum > maxJFromMatches) maxJFromMatches = jNum;
    });

    let maxConfirmed = 0;
    const confirmedList = [];

    if (Array.isArray(mergedJornadas)) {
      const confirmedJornadas = mergedJornadas
        .map(j => ({ num: parseJNum(j.name), status: (j.status || '').toLowerCase() }))
        .filter(j => j.num > 0 && j.status.includes('confirmad'))
        .sort((a, b) => a.num - b.num);

      if (confirmedJornadas.length > 0) {
        const lastConfirmedNum = confirmedJornadas[confirmedJornadas.length - 1].num;
        maxConfirmed = lastConfirmedNum;

        confirmedJornadas.forEach(j => {
          const jNum = j.num;
          const matches = matchesByJornada[jNum] || [];
          let pendingCount = 0;
          let allFinished = true;

          matches.forEach(m => {
            const st = String(m.status || '').trim().toLowerCase();
            if (!['finalizado', 'completado', 'jugado', 'terminado'].includes(st)) {
              allFinished = false;
            }

            // REGLA ESTRICTA DE PENDIENTES
            if (st === 'pendiente') {
              pendingCount++;
            }
          });

          if (jNum === lastConfirmedNum && !allFinished) return;

          confirmedList.push({ num: jNum, pendientes: pendingCount });
        });
      }
    }

    confirmedList.sort((a, b) => a.num - b.num);
    const effective = maxConfirmed > 0 ? maxConfirmed : (maxJFromMatches || 1);

    return {
      effectiveJornada: effective,
      jornadasConfirmadasForDropdown: confirmedList
    };
  }, [relevantMatches, mergedJornadas]);

  // 5. Cálculo maestro de la Tabla General
  const tablaGeneral = useMemo(() => {
    const buildTableUpTo = (limitJornada) => {
      const statsMap = {};
      uniqueEquipos.forEach(eq => {
        statsMap[eq.id] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, partidosPendientes: 0 };
      });

      relevantMatches.forEach(partido => {
        let name = partido.jornadas?.name || partido.jornada?.name || '';
        let jNum = name.match(/\d+/) ? parseInt(name.match(/\d+/)[0], 10) : 0;

        if (jNum === 0 && partido.jornada_id && Array.isArray(mergedJornadas)) {
          const jObj = mergedJornadas.find(x => Number(x.id) === Number(partido.jornada_id));
          if (jObj) jNum = parseInt(('' + (jObj.name || '')).match(/\d+/)?.[0] || 0, 10);
        }
        
        // Si el partido pertenece a una jornada mayor al límite seleccionado, lo ignoramos
        if (jNum <= 0 || jNum > limitJornada) return;

        const statusLower = String(partido.status || '').trim().toLowerCase();
        const localId = partido.team1_id;
        const visitanteId = partido.team2_id;

        // --- REGLA ABSOLUTA DE PENDIENTES ---
        // Si en la BD dice "Pendiente", sumamos a los equipos que existan y saltamos al siguiente.
        if (statusLower === 'pendiente') {
           if (localId && statsMap[localId]) statsMap[localId].partidosPendientes += 1;
           if (visitanteId && statsMap[visitanteId]) statsMap[visitanteId].partidosPendientes += 1;
           return; 
        }

        // --- PARTIDOS JUGADOS / FINALIZADOS ---
        if (!['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower)) return;
        
        // Aquí SÍ exigimos que existan los dos equipos para sumar puntos
        if (!localId || !visitanteId) return;

        const local = statsMap[localId];
        const visitante = statsMap[visitanteId];
        if (!local || !visitante) return;

        const golesLocal = parseInt(partido.goals1, 10);
        const golesVisitante = parseInt(partido.goals2, 10);
        const hasValidResult = !isNaN(golesLocal) && !isNaN(golesVisitante);

        if (!hasValidResult) return;

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
                ptsL = config.winPoints; ptsV = config.lossPoints;
            } else if (golesLocal < golesVisitante) {
                ptsL = config.lossPoints; ptsV = config.winPoints;
            } else {
                ptsL = config.drawPoints; ptsV = config.drawPoints;
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

    let limitCurrent = selectedJornadaView === 'recent' ? effectiveJornada : parseInt(selectedJornadaView, 10);
    const prevLimit = limitCurrent - 1;

    const prevTable = buildTableUpTo(prevLimit);
    const prevRanks = {};
    prevTable.forEach((eq, index) => { prevRanks[eq.id] = index + 1; });

    const currentTable = buildTableUpTo(limitCurrent);

    return currentTable.map((eq, index) => {
      const currentRank = index + 1;
      const prevRank = prevRanks[eq.id];
      let tendencia = 'same';
      let posDiff = 0; 
      
      if (prevLimit > 0 && prevRank) {
        if (prevRank > currentRank) { tendencia = 'up'; posDiff = prevRank - currentRank; } 
        else if (prevRank < currentRank) { tendencia = 'down'; posDiff = currentRank - prevRank; }
      }

      return { ...eq, tendencia, posDiff };
    });

  }, [uniqueEquipos, selectedJornadaView, effectiveJornada, relevantMatches, config, mergedJornadas]);

  // 6. Texto para exportar
  const activeJornadaName = useMemo(() => {
    if ((!relevantMatches.length) && (!mergedJornadas.length)) return 'Sin iniciar';
    if (effectiveJornada === 0) return 'Sin iniciar';
    
    if (selectedJornadaView === 'recent') {
        let totalPendientes = 0;
        relevantMatches.forEach(m => {
            let jNum = 0;
            if (m.jornadas?.name) jNum = parseInt(m.jornadas.name.match(/\d+/)?.[0] || 0, 10);
            else if (m.jornada?.name) jNum = parseInt(m.jornada.name.match(/\d+/)?.[0] || 0, 10);
            else if (m.jornada_id && Array.isArray(mergedJornadas)) {
                const jObj = mergedJornadas.find(x => Number(x.id) === Number(m.jornada_id));
                if (jObj) jNum = parseInt(('' + (jObj.name || '')).match(/\d+/)?.[0] || 0, 10);
            }

            const st = String(m.status || '').trim().toLowerCase();
            
            // REGLA ESTRICTA DE PENDIENTES
            if (jNum > 0 && jNum <= effectiveJornada && st === 'pendiente') {
                totalPendientes++;
            }
        });
        const suffix = totalPendientes > 0 
          ? ` (Con ${totalPendientes} partido${totalPendientes > 1 ? 's' : ''} pendiente${totalPendientes > 1 ? 's' : ''})` 
          : '';
        return `Jornada ${effectiveJornada}${suffix}`; 
    } else {
        const sel = parseInt(selectedJornadaView, 10);
        if (isNaN(sel)) return `Jornada ${effectiveJornada}`;
        
        let pend = relevantMatches.filter(m => {
          const st = String(m.status || '').trim().toLowerCase();
          
          let jNum = 0;
          if (m.jornadas?.name) jNum = parseInt(m.jornadas.name.match(/\d+/)?.[0] || 0, 10);
          else if (m.jornada?.name) jNum = parseInt(m.jornada.name.match(/\d+/)?.[0] || 0, 10);
          else if (m.jornada_id && Array.isArray(mergedJornadas)) {
              const jObj = mergedJornadas.find(x => Number(x.id) === Number(m.jornada_id));
              if (jObj) jNum = parseInt(('' + (jObj.name || '')).match(/\d+/)?.[0] || 0, 10);
          }

          // REGLA ESTRICTA DE PENDIENTES
          return jNum === sel && st === 'pendiente';
        }).length;

        const suffix = pend > 0 
          ? ` (Con ${pend} partido${pend > 1 ? 's' : ''} pendiente${pend > 1 ? 's' : ''})` 
          : ' (Completada)';
        return `Jornada ${sel}${suffix}`;
    }
  }, [selectedJornadaView, effectiveJornada, relevantMatches, mergedJornadas]);

  return {
    config,
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    tablaGeneral,
    activeJornadaName,
    isCalculating: fetchingJornadas 
  };
};