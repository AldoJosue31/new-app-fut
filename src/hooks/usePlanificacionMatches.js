import { useState, useEffect, useMemo, useCallback } from "react";

export const usePlanificacionMatches = (
    activeTournament, 
    jornadaIndex, 
    teams, 
    matchesDB, 
    globalPendingMatches,
    jornadaStatus,
    dataVersion = 0
) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [allPendingMatches, setAllPendingMatches] = useState([]); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);

  const currentJornadaName = `Jornada ${jornadaIndex + 1}`;
  const isConfirmed = jornadaStatus === 'Confirmada' || jornadaStatus === 'Finalizada';
  
  // Key para LocalStorage que fuerza limpieza al cambiar versión
  const storageKey = useMemo(() => {
    if (!activeTournament?.id) return null;
    return `planning_draft_${activeTournament.id}_J${jornadaIndex}_v${dataVersion}`;
  }, [activeTournament?.id, jornadaIndex, dataVersion]);

  const byeTeam = useMemo(() => ({ id: 'BYE', name: 'DESCANSA', img: null, isBye: true }), []);

  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45, 10);
    const minDescanso = parseInt(activeTournament?.config?.minutosDescanso || 15, 10);
    return (minPorTiempo * 2) + minDescanso;
  }, [activeTournament]);

  const getJornadaNum = (str) => {
    if (!str) return 999;
    const parts = str.split(' ');
    return parts.length > 1 ? parseInt(parts[1], 10) : 999;
  };

  const clearDraft = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
    setIsLoaded(false); 
  }, [storageKey]);

  const autoAdjustTimes = useCallback((matches, dateToFix) => {
    let matchesOfDay = [...matches].filter(m => m.date === dateToFix).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    if (matchesOfDay.length <= 1) return matches;
    
    for (let i = 1; i < matchesOfDay.length; i++) {
      const prev = matchesOfDay[i - 1];
      const curr = matchesOfDay[i];
      const [ph, pm] = (prev.time || "00:00").split(':').map(Number);
      const prevEndMinutes = (ph * 60) + pm + durationMatch;
      const [ch, cm] = (curr.time || "00:00").split(':').map(Number);
      const currStartMinutes = (ch * 60) + cm;
      
      if (currStartMinutes < prevEndMinutes) {
        const newH = Math.floor(prevEndMinutes / 60);
        const newM = prevEndMinutes % 60;
        curr.time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        curr.isModified = true;
      }
    }
    return [...matches.filter(m => m.date !== dateToFix), ...matchesOfDay];
  }, [durationMatch]);

  const formatMatch = useCallback((m) => {
      const localId = m.team1_id ?? m.local?.id;
      const visitId = m.team2_id ?? m.visitante?.id;
      
      const localTeam = teams.find(t => t.id == localId);
      let visitTeam = teams.find(t => t.id == visitId);
      let isByeMatch = false;

      if (!visitTeam && (visitId === null || visitId === 'BYE')) {
          visitTeam = byeTeam;
          isByeMatch = true;
      }

      if (!localTeam || !visitTeam) return null;

      const hasT = typeof m.date === 'string' && m.date.includes('T');
      // Si viene de DB y no tiene nombre, asignamos la actual. Si viene de Global, respetamos su origen (o falta de él).
      let rawOrigin = m.jornadas?.name || m.originJornada;
      if (!rawOrigin && m._source === 'db') {
          rawOrigin = currentJornadaName;
      }

      return {
        id: m.id,
        local: localTeam,
        visitante: visitTeam,
        date: m.date ? (hasT ? m.date.split('T')[0] : m.date) : null,
        time: m.date ? (hasT ? m.date.split('T')[1].substring(0, 5) : (m.time || activeTournament?.config?.horaInicio || "08:00")) : null,
        status: m.status,
        goals1: m.goals1,
        goals2: m.goals2,
        referee_id: m.referee_id,
        observations: m.observations,
        jornada_id: m.jornada_id,
        originJornada: rawOrigin, 
        isModified: Boolean(m.isModified) || false,
        isByeMatch: isByeMatch
      };
  }, [teams, byeTeam, currentJornadaName, activeTournament]);

  // --- CARGA Y PROCESAMIENTO ---
  useEffect(() => {
    if (!teams || teams.length < 2) return;

    // 1. Borrador LocalStorage
    let hasDraft = false;
    let draftMap = new Map();

    if (!isConfirmed && storageKey) {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                const combined = [...(parsed.scheduledMatches || []), ...(parsed.allPendingMatches || [])];
                if (combined.length > 0) {
                    combined.forEach(m => draftMap.set(String(m.id), m));
                    hasDraft = true;
                }
            } catch (e) { console.error(e); }
        }
    }

    // 2. Datos Reales (DB) - FUENTE DE VERDAD
    const matchesDBList = (matchesDB || []).map(m => ({ ...m, _source: 'db' }));
    
    // Identificar equipos ocupados en la BD (para matar fantasmas)
    const activeTeamIds = new Set();
    matchesDBList.forEach(m => {
        if (m.team1_id) activeTeamIds.add(String(m.team1_id));
        if (m.team2_id) activeTeamIds.add(String(m.team2_id));
    });

    const officialJornadaIds = new Set(matchesDBList.map(m => String(m.id)));
    
    // 3. Procesar Globales con FIREWALL ESTRICTO
    const cleanGlobalMatches = (globalPendingMatches || []).reduce((acc, gm) => {
        const gmId = String(gm.id);
        const t1 = String(gm.team1_id ?? gm.local?.id);
        const t2 = String(gm.team2_id ?? gm.visitante?.id);
        const gmOriginName = (gm.jornadas?.name || gm.originJornada || "").trim();

        // REGLA 1: Colisión de IDs (BD gana)
        if (officialJornadaIds.has(gmId)) return acc;

        // REGLA 2: Colisión de Nombre de Jornada (Si dice ser de esta jornada pero no está en BD -> Basura)
        if (gmOriginName === currentJornadaName) return acc;

        // REGLA 3 (LA SOLUCIÓN): Conflicto de Equipos (Anti-Ghost)
        // Si el Equipo A ya tiene un partido oficial en esta jornada (matchesDB),
        // ignoramos cualquier partido pendiente global que involucre al Equipo A.
        // Esto elimina las versiones viejas ("partidos que antes de la modificación").
        if (activeTeamIds.has(t1) || activeTeamIds.has(t2)) {
             return acc; 
        }

        acc.push({ ...gm, _source: 'global' });
        return acc;
    }, []);

    // 4. Fusión (Prioridad: cleanGlobal primero, matchesDB después para sobreescribir)
    const allMatchesRaw = [...cleanGlobalMatches, ...matchesDBList];
    const uniqueMap = new Map();
    allMatchesRaw.forEach(m => { if (m?.id) uniqueMap.set(String(m.id), m); });
    
    const dbFormatted = Array.from(uniqueMap.values()).map(formatMatch).filter(Boolean);

    // 5. Aplicar Borrador
    const mergedMatches = dbFormatted.map(dbMatch => {
        if (hasDraft) {
            const draftMatch = draftMap.get(String(dbMatch.id));
            if (draftMatch) {
                return {
                    ...dbMatch, 
                    date: draftMatch.date, 
                    time: draftMatch.time,
                    status: draftMatch.status || dbMatch.status,
                    isModified: draftMatch.isModified
                };
            }
        }
        return dbMatch;
    });

    // 6. Clasificación
    const currentScheduled = mergedMatches.filter(m => m.date);
    
    const currentPending = mergedMatches.filter(m => {
        if (m.date || m.status === 'Finalizado') return false;
        
        // Si no tiene origen, lo descartamos (formateo fallido o fantasma)
        if (!m.originJornada) return false;

        const mNum = getJornadaNum(m.originJornada);
        const cNum = jornadaIndex + 1;
        
        return m.originJornada === currentJornadaName || mNum < cNum;
    });

    // 7. Generar Descansos
    let currentSuggestions = [];
    if (teams.length % 2 !== 0) {
        const teamsPlaying = new Set();
        currentScheduled.forEach(m => {
            if (m.originJornada === currentJornadaName || m.date) {
                if (m.local?.id) teamsPlaying.add(m.local.id);
                if (m.visitante?.id && !m.isByeMatch) teamsPlaying.add(m.visitante.id);
            }
        });
        // También consideramos los pendientes validados para no duplicar descansos
        currentPending.forEach(m => {
            if (m.originJornada === currentJornadaName) {
                 if (m.local?.id) teamsPlaying.add(m.local.id);
                 if (m.visitante?.id) teamsPlaying.add(m.visitante.id);
            }
        });

        const resting = teams.filter(t => !teamsPlaying.has(t.id));
        resting.forEach(team => {
            currentSuggestions.push({
                id: `bye-${jornadaIndex}-${team.id}`,
                local: team, visitante: byeTeam, status: 'Pendiente',
                originJornada: currentJornadaName, isModified: false, isByeMatch: true,
                date: null, time: null
            });
        });
    }

    setScheduledMatches(currentScheduled);
    setAllPendingMatches([...currentPending, ...currentSuggestions]);
    setIsLoaded(true);

  }, [
      teams, matchesDB, globalPendingMatches, 
      isConfirmed, storageKey, formatMatch, 
      currentJornadaName, jornadaIndex, byeTeam
  ]); 

  // Guardado
  useEffect(() => {
    if (isLoaded && storageKey && !isConfirmed) {
        const draftData = { scheduledMatches, allPendingMatches };
        localStorage.setItem(storageKey, JSON.stringify(draftData));
    }
  }, [scheduledMatches, allPendingMatches, storageKey, isLoaded, isConfirmed]);

  const sidebarMatches = useMemo(() => {
    const scheduledIds = new Set(scheduledMatches.map(m => String(m.id)));
    return allPendingMatches.filter(m => !scheduledIds.has(String(m.id)));
  }, [allPendingMatches, scheduledMatches]);

  return {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    sidebarMatches,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes, currentJornadaName,
    clearDraft 
  };
};