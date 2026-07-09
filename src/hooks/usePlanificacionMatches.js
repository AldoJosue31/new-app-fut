import { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from "react";
import { addDaysToDate } from "../utils/dateUtils";
import { getPartidosExternosRango } from "../services/torneos";
import {
  getJornadaReferenceNumber,
  isRepositionJornadaName,
  normalizeJornadaName,
  parseJornadaNumber,
} from "../utils/jornadaUtils";
import { isPlayoffJornadaName } from "../utils/playoffUtils";

const getPlayoffJornadaBaseName = (name = "") =>
  normalizeJornadaName(name).replace(/\s*\((ida|vuelta)\)\s*$/i, "").trim();

const isSamePlayoffJornadaScope = (originName = "", currentName = "") => {
  const normalizedOrigin = normalizeJornadaName(originName);
  const normalizedCurrent = normalizeJornadaName(currentName);
  if (!normalizedOrigin || !normalizedCurrent) return false;
  if (normalizedOrigin === normalizedCurrent) return true;
  if (/\((ida|vuelta)\)\s*$/i.test(normalizedCurrent)) return false;
  return getPlayoffJornadaBaseName(normalizedOrigin) === getPlayoffJornadaBaseName(normalizedCurrent);
};

export const usePlanificacionMatches = (
    activeTournament, 
    jornadaIndex, 
    teams, 
    matchesDB, 
    globalPendingMatches,
    jornadaData, 
    dataVersion = 0,
    jornadasList = [] 
) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [allPendingMatches, setAllPendingMatches] = useState([]); 
  const [loadedContextKey, setLoadedContextKey] = useState(null);

  // --- LOGICA DE FECHAS ---
  const [jornadaDates, setJornadaDates] = useState({});
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);

  // --- LOGICA DE PARTIDOS EXTERNOS ---
  const [showExternalMatches, setShowExternalMatches] = useState(true);
  const [externalMatches, setExternalMatches] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const externalMatchesRequestRef = useRef(0);

  const jornadaStatus = jornadaData?.status;
  const currentJornadaName = jornadaData?.name || `Jornada ${jornadaIndex + 1}`;
  const currentJornadaNumber = getJornadaReferenceNumber(jornadaData, jornadaIndex);
  const isRepositionJornada = isRepositionJornadaName(currentJornadaName);
  const isPlayoffJornada = isPlayoffJornadaName(currentJornadaName);
  const isConfirmed = jornadaStatus === 'Confirmada' || jornadaStatus === 'Finalizada';
  
  const targetJornadaIndex = useMemo(() => {
      if (!jornadasList || jornadasList.length === 0) return 0;
      let lastConfirmedIdx = -1;
      for (let i = 0; i < jornadasList.length; i++) {
          if (jornadasList[i].status === 'Confirmada' || jornadasList[i].status === 'Finalizada') {
              lastConfirmedIdx = i;
          }
      }
      return lastConfirmedIdx + 1;
  }, [jornadasList]);

  const storageKey = useMemo(() => {
    if (!activeTournament?.id) return null;
    const jornadaKey = jornadaData?.id ? `id_${jornadaData.id}` : `J${jornadaIndex}`;
    return `planning_draft_${activeTournament.id}_${jornadaKey}_v${dataVersion}`;
  }, [activeTournament?.id, jornadaData?.id, jornadaIndex, dataVersion]);

  const dataContextKey = useMemo(() => {
    const compactMatches = (items = []) =>
      items
        .map((match) => [
          match?.id,
          match?.jornada_id,
          match?.date,
          match?.status,
          match?.originJornada,
          match?.jornadas?.name,
        ].join(":"))
        .join("|");

    return [
      activeTournament?.id || "",
      jornadaData?.id || jornadaIndex,
      currentJornadaName,
      currentJornadaNumber,
      dataVersion,
      isConfirmed ? "confirmed" : "open",
      isRepositionJornada ? "reposition" : "regular",
      isPlayoffJornada ? "playoff" : "league",
      targetJornadaIndex,
      (teams || []).map((team) => team?.id).join(","),
      compactMatches(matchesDB),
      compactMatches(globalPendingMatches),
      storageKey || "",
    ].join("::");
  }, [
    activeTournament?.id,
    currentJornadaName,
    currentJornadaNumber,
    dataVersion,
    globalPendingMatches,
    isConfirmed,
    isPlayoffJornada,
    isRepositionJornada,
    jornadaData?.id,
    jornadaIndex,
    matchesDB,
    storageKey,
    targetJornadaIndex,
    teams,
  ]);

  const isPlanningDataReady = loadedContextKey === dataContextKey;

  const datesStorageKey = useMemo(() => {
      if (!activeTournament?.id) return null;
      return `tournament_dates_${activeTournament.id}`;
  }, [activeTournament?.id]);

  useLayoutEffect(() => {
      if (datesStorageKey) {
          const savedDates = localStorage.getItem(datesStorageKey);
          if (savedDates) {
              setJornadaDates(JSON.parse(savedDates));
          } else {
              const initialDate = activeTournament?.start_date || new Date().toISOString().split('T')[0];
              setJornadaDates({ 0: initialDate });
          }
      }
  }, [datesStorageKey, activeTournament]);

  useLayoutEffect(() => {
      if (jornadaData?.start_date) {
          setWeekStartDate(jornadaData.start_date);
      } else if (Object.keys(jornadaDates).length > 0) {
          const storedDate = jornadaDates[jornadaIndex];
          if (storedDate) {
              setWeekStartDate(storedDate);
          } else {
              let referenceDate = activeTournament?.start_date || new Date().toISOString().split('T')[0];
              if (jornadaIndex > 0) {
                  const prevDate = jornadaDates[jornadaIndex - 1];
                  if (prevDate) referenceDate = prevDate;
                  const newCalculatedDate = addDaysToDate(referenceDate, 7);
                  setWeekStartDate(newCalculatedDate);
              } else {
                  setWeekStartDate(referenceDate);
              }
          }
      }
  }, [jornadaIndex, jornadaDates, jornadaData, activeTournament]);

  const handleSetWeekStartDate = (newDate) => {
      setWeekStartDate(newDate);
      setJornadaDates(prev => {
          const newMap = { ...prev, [jornadaIndex]: newDate };
          localStorage.setItem(datesStorageKey, JSON.stringify(newMap));
          return newMap;
      });
  };

  const fetchExternalMatches = useCallback(async (startDateToCheck) => {
      if (!activeTournament?.id) return [];
      
      const leagueId = activeTournament.division?.league_id || activeTournament.divisions?.league_id;
      
      if (!leagueId) {
          console.warn("No se encontró league_id en activeTournament");
          return [];
      }

      const endDate = addDaysToDate(startDateToCheck, 7);
      const requestId = externalMatchesRequestRef.current + 1;
      externalMatchesRequestRef.current = requestId;
      
      setLoadingExternal(true);
      try {
          const data = await getPartidosExternosRango(
              startDateToCheck, 
              endDate, 
              activeTournament.id, 
              leagueId
          );
          if (requestId === externalMatchesRequestRef.current) {
              setExternalMatches(data);
          }
          return data;
      } catch (err) {
          console.error("Error fetching external matches:", err);
          return [];
      } finally {
          if (requestId === externalMatchesRequestRef.current) {
              setLoadingExternal(false);
          }
      }
  }, [activeTournament]);

  useEffect(() => {
    if (showExternalMatches && weekStartDate) {
        fetchExternalMatches(weekStartDate);
    } else if (!showExternalMatches) {
        externalMatchesRequestRef.current += 1;
        setExternalMatches([]);
        setLoadingExternal(false);
    }
  }, [showExternalMatches, weekStartDate, fetchExternalMatches]);

  const toggleExternalMatches = () => setShowExternalMatches(prev => !prev);
  
  const byeTeam = useMemo(() => ({ id: 'BYE', name: 'DESCANSA', img: null, isBye: true }), []);

  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45, 10);
    const minDescanso = parseInt(activeTournament?.config?.minutosDescanso || 15, 10);
    return (minPorTiempo * 2) + minDescanso;
  }, [activeTournament]);

  const getJornadaNum = (str) => parseJornadaNumber(str, 999);

  const clearDraft = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
    setLoadedContextKey(null);
  }, [storageKey]);

  const autoAdjustTimes = useCallback((matches, dateToFix) => {
    if (!dateToFix) return matches;

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

      // PARSEO SEGURO DE FECHAS
      let finalDate = null;
      let finalTime = null;

      if (m.date) {
          const rawDate = m.date.toString().trim();
          if (rawDate.includes('T')) {
              const parts = rawDate.split('T');
              finalDate = parts[0];
              finalTime = parts[1].substring(0, 5);
          } else if (rawDate.includes(' ')) {
              const parts = rawDate.split(' ');
              finalDate = parts[0];
              finalTime = parts[1].substring(0, 5);
          } else {
              finalDate = rawDate;
              finalTime = m.time || activeTournament?.config?.horaInicio || "08:00";
          }
      }

      let rawOrigin = m.originJornada || m.jornadas?.name;
      if (!rawOrigin && m._source === 'db') {
          rawOrigin = currentJornadaName;
      }

      return {
        id: m.id,
        local: localTeam,
        visitante: visitTeam,
        date: finalDate,
        time: finalTime,
        status: (!m.date && m.status === 'Programado') ? 'Pendiente' : m.status,
        goals1: m.goals1,
        goals2: m.goals2,
        referee_id: m.referee_id,
        observations: m.observations,
        jornada_id: m.jornada_id,
        originJornadaId: m.originJornadaId || null,
        originJornada: rawOrigin, 
        playedInJornada: m.playedInJornada || "",
        isReferenceOnly: Boolean(m.isReferenceOnly),
        isRepositionScheduled: Boolean(m.isRepositionScheduled),
        isModified: Boolean(m.isModified) || false,
        isByeMatch: isByeMatch,
        isExternal: false 
      };
  }, [teams, byeTeam, currentJornadaName, activeTournament]);

  // --- CARGA DATOS LOCALES ---
  useLayoutEffect(() => {
    if (!teams || teams.length < 2) {
      setScheduledMatches([]);
      setAllPendingMatches([]);
      setLoadedContextKey(dataContextKey);
      return;
    }

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
    const officialJornadaIds = new Set(matchesDBList.map(m => String(m.id)));
    
    const cleanGlobalMatches = isPlayoffJornada ? [] : (globalPendingMatches || []).reduce((acc, gm) => {
        const gmId = String(gm.id);
        const gmOriginName = (gm.jornadas?.name || gm.originJornada || "").trim();

        if (officialJornadaIds.has(gmId)) return acc;
        if (gmOriginName === currentJornadaName) return acc;
        if (jornadaIndex !== targetJornadaIndex) return acc;

        if (!isRepositionJornada) {
            const originNum = getJornadaNum(gmOriginName);
            const currentNum = currentJornadaNumber;
            if (originNum > currentNum) return acc;
        }

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
                const keepDbResult = dbMatch.status === 'Finalizado';

                return {
                    ...dbMatch, 
                    date: keepDbResult
                        ? dbMatch.date
                        : draftMatch.date !== undefined ? draftMatch.date : dbMatch.date,
                    time: keepDbResult
                        ? dbMatch.time
                        : draftMatch.time !== undefined ? draftMatch.time : dbMatch.time,
                    status: keepDbResult ? dbMatch.status : draftMatch.status || dbMatch.status,
                    isModified: keepDbResult ? false : draftMatch.isModified,
                    originJornada: draftMatch.originJornada || dbMatch.originJornada,
                    resolution: keepDbResult ? dbMatch.resolution : draftMatch.resolution
                };
            }
        }
        return dbMatch;
    });

    const currentScheduled = mergedMatches.filter(m => {
        if (m.date) return true;
        if (m.status === 'Finalizado') return true;
        if (m.resolution && m.resolution.type === 'default') return true;
        return false;
    });

    const currentPending = mergedMatches.filter(m => {
        if (m.date || m.status === 'Finalizado' || (m.resolution && m.resolution.type === 'default')) return false;
        if (isPlayoffJornada) {
            if (!m.originJornada) return true;
            return isSamePlayoffJornadaScope(m.originJornada, currentJornadaName);
        }
        if (isRepositionJornada) return true;
        if (!m.originJornada) return true; 
        const mNum = getJornadaNum(m.originJornada);
        const cNum = currentJornadaNumber;
        return mNum <= cNum;
    });

    let currentSuggestions = [];
    if (!isRepositionJornada && !isPlayoffJornada && teams.length % 2 !== 0) {
        const teamsPlaying = new Set();
        currentScheduled.forEach(m => {
             if (m.local?.id) teamsPlaying.add(m.local.id);
             if (m.visitante?.id && !m.isByeMatch) teamsPlaying.add(m.visitante.id);
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
    setLoadedContextKey(dataContextKey);

  }, [
      teams, matchesDB, globalPendingMatches, 
      isConfirmed, storageKey, formatMatch, 
      currentJornadaName, jornadaIndex, byeTeam,
      targetJornadaIndex, currentJornadaNumber, isRepositionJornada, isPlayoffJornada,
      dataContextKey
  ]); 

  useEffect(() => {
    if (isPlanningDataReady && storageKey && !isConfirmed) {
        const draftData = { scheduledMatches, allPendingMatches };
        localStorage.setItem(storageKey, JSON.stringify(draftData));
    }
  }, [scheduledMatches, allPendingMatches, storageKey, isPlanningDataReady, isConfirmed]);

  const sidebarMatches = useMemo(() => {
    const scheduledIds = new Set(scheduledMatches.map(m => String(m.id)));
    return allPendingMatches.filter(m => !scheduledIds.has(String(m.id)));
  }, [allPendingMatches, scheduledMatches]);

  return {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    sidebarMatches,
    weekStartDate, setWeekStartDate: handleSetWeekStartDate,
    durationMatch, autoAdjustTimes, currentJornadaName, currentJornadaNumber,
    clearDraft,
    isPlanningDataReady,
    showExternalMatches, toggleExternalMatches, 
    externalMatches, loadingExternal,
    fetchExternalMatches
  };
};
