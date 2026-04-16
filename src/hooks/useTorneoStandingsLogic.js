import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/supabase.config';
import {
  isOfficialJornadaName,
  normalizeJornadaName,
  parseJornadaNumber,
  resolveRepositionMappings,
} from '../utils/jornadaUtils';

const getOfficialJornadaNumberFromName = (name) => {
  if (!isOfficialJornadaName(name)) return 0;
  return parseJornadaNumber(name, 0);
};

const findRepositionMapping = (jornadaId, jornadaName, repositionMappings = []) => {
  const normalizedName = normalizeJornadaName(jornadaName);

  return repositionMappings.find((mapping) => {
    if (jornadaId && Number(mapping?.repositionJornadaId) === Number(jornadaId)) {
      return true;
    }

    if (!normalizedName) return false;

    return (
      normalizeJornadaName(mapping?.repositionJornadaName) === normalizedName
    );
  }) || null;
};

const findRepositionMatchMapping = (matchId, repositionMatchMappings = []) => {
  if (!matchId) return null;

  return repositionMatchMappings.find(
    (mapping) => Number(mapping?.matchId) === Number(matchId)
  ) || null;
};

const getOfficialJornadaNumberFromMapping = (mapping, jornadas = []) => {
  if (!mapping) return 0;

  const mappedJornada = mapping?.originalJornadaId
    ? jornadas.find((jornada) => Number(jornada.id) === Number(mapping.originalJornadaId))
    : null;

  return getOfficialJornadaNumberFromName(
    mapping?.originalJornadaName || mappedJornada?.name
  );
};

export const getOfficialJornadaNumberForMatch = (
  match,
  jornadas = [],
  repositionMappings = [],
  repositionMatchMappings = []
) => {
  const matchMapping = findRepositionMatchMapping(match?.id, repositionMatchMappings);
  const mappedOfficialNum = getOfficialJornadaNumberFromMapping(matchMapping, jornadas);
  if (mappedOfficialNum > 0) return mappedOfficialNum;

  const originJornada = match?.originJornadaId
    ? jornadas.find((jornada) => Number(jornada.id) === Number(match.originJornadaId))
    : null;
  const originOfficialNum = getOfficialJornadaNumberFromName(match?.originJornada);
  if (originOfficialNum > 0) return originOfficialNum;

  const originJornadaOfficialNum = getOfficialJornadaNumberFromName(originJornada?.name);
  if (originJornadaOfficialNum > 0) return originJornadaOfficialNum;

  const directName = match?.jornadas?.name || match?.jornada?.name || '';
  const directOfficialNum = getOfficialJornadaNumberFromName(directName);
  if (directOfficialNum > 0) return directOfficialNum;

  const jornadaId = match?.jornada_id || match?.jornadas?.id || match?.jornada?.id;
  const jornadaObj = jornadaId
    ? jornadas.find((jornada) => Number(jornada.id) === Number(jornadaId))
    : null;

  const jornadaOfficialNum = getOfficialJornadaNumberFromName(jornadaObj?.name);
  if (jornadaOfficialNum > 0) return jornadaOfficialNum;

  const mapping = findRepositionMapping(
    jornadaId,
    directName || jornadaObj?.name,
    repositionMappings
  );

  if (!mapping) return 0;

  return getOfficialJornadaNumberFromMapping(mapping, jornadas);
};

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
  const parsedTournamentConfig = useMemo(() => {
    if (typeof torneo?.config === 'string') {
      try {
        return JSON.parse(torneo.config) || {};
      } catch (error) {
        return {};
      }
    }

    return torneo?.config || {};
  }, [torneo?.config]);

  const repositionMappings = useMemo(() => {
    return resolveRepositionMappings({
      jornadas: mergedJornadas,
      configuredMappings: Array.isArray(parsedTournamentConfig?.repositionMappings)
        ? parsedTournamentConfig.repositionMappings
        : [],
    });
  }, [mergedJornadas, parsedTournamentConfig]);

  const repositionMatchMappings = useMemo(() => {
    return Array.isArray(parsedTournamentConfig?.repositionMatchMappings)
      ? parsedTournamentConfig.repositionMatchMappings
      : [];
  }, [parsedTournamentConfig]);

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
    const matchesByJornada = {};
    let maxJFromMatches = 0;

    relevantMatches.forEach(p => {
      const jNum = getOfficialJornadaNumberForMatch(
        p,
        mergedJornadas,
        repositionMappings,
        repositionMatchMappings
      );

      if (jNum <= 0) return;

      if (!matchesByJornada[jNum]) matchesByJornada[jNum] = [];
      matchesByJornada[jNum].push(p);

      if (jNum > maxJFromMatches) maxJFromMatches = jNum;
    });

    let maxConfirmed = 0;
    const confirmedList = [];

    if (Array.isArray(mergedJornadas)) {
      const confirmedJornadas = mergedJornadas
        .filter(j => isOfficialJornadaName(j?.name))
        .map(j => ({
          num: parseJornadaNumber(j.name, 0),
          status: (j.status || '').toLowerCase()
        }))
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

            // Para el dropdown mostramos cuántos hay pendientes en ESA jornada específica
            if (st === 'pendiente' && m.team1_id != null && m.team2_id != null) {
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
  }, [relevantMatches, mergedJornadas, repositionMappings, repositionMatchMappings]);

  // 5. Cálculo maestro de la Tabla General
  const tablaGeneral = useMemo(() => {
    const buildTableUpTo = (limitJornada) => {
      const statsMap = {};
      uniqueEquipos.forEach(eq => {
        statsMap[eq.id] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, partidosPendientes: 0 };
      });

      relevantMatches.forEach(partido => {
        const jNum = getOfficialJornadaNumberForMatch(
          partido,
          mergedJornadas,
          repositionMappings,
          repositionMatchMappings
        );
        
        // Excluimos partidos posteriores al límite seleccionado
        if (jNum <= 0 || jNum > limitJornada) return;

        const statusLower = String(partido.status || '').trim().toLowerCase();
        const localId = partido.team1_id;
        const visitanteId = partido.team2_id;

        // Acumulación de pendientes hasta el límite seleccionado
        if (statusLower === 'pendiente') {
           if (localId && visitanteId) {
               if (statsMap[localId]) statsMap[localId].partidosPendientes += 1;
               if (statsMap[visitanteId]) statsMap[visitanteId].partidosPendientes += 1;
           }
           return; 
        }

        if (!['finalizado', 'completado', 'jugado', 'terminado'].includes(statusLower)) return;
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

  }, [uniqueEquipos, selectedJornadaView, effectiveJornada, relevantMatches, config, mergedJornadas, repositionMappings, repositionMatchMappings]);

  // 6. Texto para exportar e imprimir
  const activeJornadaName = useMemo(() => {
    if ((!relevantMatches.length) && (!mergedJornadas.length)) return 'Sin iniciar';
    if (effectiveJornada === 0) return 'Sin iniciar';
    
    // Función auxiliar para contar pendientes acumulados hasta una jornada límite
    const getAccumulatedPendings = (limit) => {
        return relevantMatches.filter(m => {
            const st = String(m.status || '').trim().toLowerCase();
            const jNum = getOfficialJornadaNumberForMatch(
                m,
                mergedJornadas,
                repositionMappings,
                repositionMatchMappings
            );

            // CORRECCIÓN: ACUMULAMOS DESDE LA JORNADA 1 HASTA EL LÍMITE
            return jNum > 0 && jNum <= limit && st === 'pendiente' && m.team1_id != null && m.team2_id != null;
        }).length;
    };

    if (selectedJornadaView === 'recent') {
        const totalPendientes = getAccumulatedPendings(effectiveJornada);
        const suffix = totalPendientes > 0 ? ` (${totalPendientes} pendientes)` : ' (Completada)';
        return `Jornada ${effectiveJornada}${suffix}`; 
    } else {
        const sel = parseInt(selectedJornadaView, 10);
        if (isNaN(sel)) return `Jornada ${effectiveJornada}`;
        
        // Pasamos el límite de la jornada histórica seleccionada
        const pend = getAccumulatedPendings(sel);
        const suffix = pend > 0 ? ` (${pend} pendientes)` : ' (Completada)';
        
        return `Jornada ${sel}${suffix}`;
    }
  }, [selectedJornadaView, effectiveJornada, relevantMatches, mergedJornadas, repositionMappings, repositionMatchMappings]);

  return {
    config,
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    tablaGeneral,
    activeJornadaName,
    isCalculating: fetchingJornadas,
    mergedJornadas,
    repositionMappings,
    repositionMatchMappings,
    relevantMatches
  };
};
