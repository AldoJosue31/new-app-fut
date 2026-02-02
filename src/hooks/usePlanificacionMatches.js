import { useState, useEffect, useMemo, useCallback } from "react";
import { addDaysToDate } from "../utils/dateUtils";
import { getPartidosExternosRango } from "../services/torneos";

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

  // --- LOGICA DE FECHAS ---
  const [jornadaDates, setJornadaDates] = useState({});
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);

  // --- LOGICA DE PARTIDOS EXTERNOS (FIXED) ---
  const [showExternalMatches, setShowExternalMatches] = useState(false);
  const [externalMatches, setExternalMatches] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(false);

  const currentJornadaName = `Jornada ${jornadaIndex + 1}`;
  const isConfirmed = jornadaStatus === 'Confirmada' || jornadaStatus === 'Finalizada';
  
  const storageKey = useMemo(() => {
    if (!activeTournament?.id) return null;
    return `planning_draft_${activeTournament.id}_J${jornadaIndex}_v${dataVersion}`;
  }, [activeTournament?.id, jornadaIndex, dataVersion]);

  const datesStorageKey = useMemo(() => {
      if (!activeTournament?.id) return null;
      return `tournament_dates_${activeTournament.id}`;
  }, [activeTournament?.id]);

  useEffect(() => {
      if (datesStorageKey) {
          const savedDates = localStorage.getItem(datesStorageKey);
          if (savedDates) {
              setJornadaDates(JSON.parse(savedDates));
          } else {
              const initialDate = activeTournament?.startDate || new Date().toISOString().split('T')[0];
              setJornadaDates({ 0: initialDate });
          }
      }
  }, [datesStorageKey, activeTournament]);

  useEffect(() => {
      if (Object.keys(jornadaDates).length === 0) return;
      const storedDate = jornadaDates[jornadaIndex];

      if (storedDate) {
          setWeekStartDate(storedDate);
      } else {
          let referenceDate = new Date().toISOString().split('T')[0];
          let diffWeeks = 1;

          if (jornadaIndex > 0) {
              const prevDate = jornadaDates[jornadaIndex - 1];
              if (prevDate) referenceDate = prevDate;
          }

          const newCalculatedDate = addDaysToDate(referenceDate, 7 * diffWeeks);
          setWeekStartDate(newCalculatedDate);
          
          setJornadaDates(prev => {
              const newMap = { ...prev, [jornadaIndex]: newCalculatedDate };
              localStorage.setItem(datesStorageKey, JSON.stringify(newMap));
              return newMap;
          });
      }
  }, [jornadaIndex, jornadaDates, datesStorageKey]);

  const handleSetWeekStartDate = (newDate) => {
      setWeekStartDate(newDate);
      setJornadaDates(prev => {
          const newMap = { ...prev, [jornadaIndex]: newDate };
          localStorage.setItem(datesStorageKey, JSON.stringify(newMap));
          return newMap;
      });
  };

  // --- EFECTO: CARGAR EXTERNOS CON CONVERSIÓN DE ZONA HORARIA ---
  useEffect(() => {
    if (showExternalMatches && weekStartDate && activeTournament?.id) {
        setLoadingExternal(true);
        // Pedimos un rango amplio (8 días) para evitar bordes de zona horaria
        const endDate = addDaysToDate(weekStartDate, 8); 
        
        getPartidosExternosRango(weekStartDate, endDate, activeTournament.id)
            .then(data => {
                // AQUÍ ESTA LA MAGIA: Convertimos la fecha UTC de la DB a la fecha LOCAL string 'YYYY-MM-DD'
                const processed = data.map(m => {
                    if (!m.rawDate) return m;
                    const d = new Date(m.rawDate);
                    // Forzamos la obtención de componentes locales
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const localDateStr = `${year}-${month}-${day}`;
                    
                    return { ...m, date: localDateStr };
                });
                setExternalMatches(processed);
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingExternal(false));
    } else if (!showExternalMatches) {
        setExternalMatches([]);
    }
  }, [showExternalMatches, weekStartDate, activeTournament?.id]);

  const toggleExternalMatches = () => setShowExternalMatches(prev => !prev);
  
  // ... (Resto del código igual) ...
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

    const matchesDBList = (matchesDB || []).map(m => ({ ...m, _source: 'db' }));
    
    const activeTeamIds = new Set();
    matchesDBList.forEach(m => {
        if (m.team1_id) activeTeamIds.add(String(m.team1_id));
        if (m.team2_id) activeTeamIds.add(String(m.team2_id));
    });

    const officialJornadaIds = new Set(matchesDBList.map(m => String(m.id)));
    
    const cleanGlobalMatches = (globalPendingMatches || []).reduce((acc, gm) => {
        const gmId = String(gm.id);
        const t1 = String(gm.team1_id ?? gm.local?.id);
        const t2 = String(gm.team2_id ?? gm.visitante?.id);
        const gmOriginName = (gm.jornadas?.name || gm.originJornada || "").trim();

        if (officialJornadaIds.has(gmId)) return acc;
        if (gmOriginName === currentJornadaName) return acc;
        if (activeTeamIds.has(t1) || activeTeamIds.has(t2)) return acc; 

        acc.push({ ...gm, _source: 'global' });
        return acc;
    }, []);

    const allMatchesRaw = [...cleanGlobalMatches, ...matchesDBList];
    const uniqueMap = new Map();
    allMatchesRaw.forEach(m => { if (m?.id) uniqueMap.set(String(m.id), m); });
    
    const dbFormatted = Array.from(uniqueMap.values()).map(formatMatch).filter(Boolean);

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

    const currentScheduled = mergedMatches.filter(m => m.date);
    
    const currentPending = mergedMatches.filter(m => {
        if (m.date || m.status === 'Finalizado') return false;
        if (!m.originJornada) return false;
        const mNum = getJornadaNum(m.originJornada);
        const cNum = jornadaIndex + 1;
        return m.originJornada === currentJornadaName || mNum < cNum;
    });

    let currentSuggestions = [];
    if (teams.length % 2 !== 0) {
        const teamsPlaying = new Set();
        currentScheduled.forEach(m => {
            if (m.originJornada === currentJornadaName || m.date) {
                if (m.local?.id) teamsPlaying.add(m.local.id);
                if (m.visitante?.id && !m.isByeMatch) teamsPlaying.add(m.visitante.id);
            }
        });
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
    weekStartDate, setWeekStartDate: handleSetWeekStartDate,
    durationMatch, autoAdjustTimes, currentJornadaName,
    clearDraft,
    showExternalMatches, toggleExternalMatches, externalMatches, loadingExternal
  };
};