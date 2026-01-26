import { useState, useEffect, useMemo, useCallback } from "react";

export const usePlanificacionMatches = (
    activeTournament, 
    jornadaIndex, 
    teams, 
    matchesDB, 
    globalPendingMatches,
    jornadaStatus // NUEVO: Pasamos el status para decidir la fuente de verdad
) => {
  // --- ESTADOS ---
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [allPendingMatches, setAllPendingMatches] = useState([]); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);

  // --- CONSTANTES Y MEMOS ---
  const currentJornadaName = `Jornada ${jornadaIndex + 1}`;
  const isConfirmed = jornadaStatus === 'Confirmada' || jornadaStatus === 'Finalizada';
  
  // Clave única para el storage
  const storageKey = useMemo(() => {
    if (!activeTournament?.id) return null;
    return `planning_draft_${activeTournament.id}_J${jornadaIndex}`;
  }, [activeTournament?.id, jornadaIndex]);

  const byeTeam = useMemo(() => ({ id: 'BYE', name: 'DESCANSA', img: null, isBye: true }), []);

  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45, 10);
    const minDescanso = parseInt(activeTournament?.config?.minutosDescanso || 15, 10);
    return (minPorTiempo * 2) + minDescanso;
  }, [activeTournament]);

  // --- HELPERS ---
  const getJornadaNum = (str) => {
    if (!str) return 999;
    const parts = str.split(' ');
    return parts.length > 1 ? parseInt(parts[1], 10) : 999;
  };

  const clearDraft = useCallback(() => {
    if (storageKey) {
        localStorage.removeItem(storageKey);
    }
    // Reiniciamos estados locales para forzar una recarga limpia
    setIsLoaded(false); 
  }, [storageKey]);

  const autoAdjustTimes = useCallback((matches, dateToFix) => {
    let matchesOfDay = [...matches].filter(m => m.date === dateToFix).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    if (matchesOfDay.length <= 1) return matches;
    
    // Lógica de ajuste de horarios en cascada
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

  // --- FORMATEADOR DE DATOS ---
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
      let finalDate = null;
      let finalTime = null;

      if (m.date) {
         finalDate = hasT ? m.date.split('T')[0] : m.date;
         finalTime = hasT ? m.date.split('T')[1].substring(0, 5) : (m.time || activeTournament?.config?.horaInicio || "08:00");
      }

      return {
        id: m.id,
        local: localTeam,
        visitante: visitTeam,
        date: finalDate,
        time: finalTime,
        status: m.status,
        goals1: m.goals1,
        goals2: m.goals2,
        referee_id: m.referee_id,
        observations: m.observations,
        jornada_id: m.jornada_id,
        originJornada: m.jornadas?.name || m.originJornada || currentJornadaName,
        isModified: Boolean(m.isModified) || false,
        isByeMatch: isByeMatch
      };
  }, [teams, byeTeam, currentJornadaName, activeTournament]);

  // --- EFECTO PRINCIPAL DE CARGA DE DATOS ---
  useEffect(() => {
    if (!teams || teams.length < 2) return;

    // A) SI LA JORNADA YA ESTÁ CONFIRMADA: IGNORAR LOCALSTORAGE Y USAR DB
    if (isConfirmed) {
        if (storageKey) localStorage.removeItem(storageKey); // Limpieza de seguridad
        
        const formattedDB = (matchesDB || []).map(formatMatch).filter(Boolean);
        setScheduledMatches(formattedDB);
        setAllPendingMatches([]); // Si está confirmada, no mostramos pendientes en la zona de trabajo principal
        setIsLoaded(true);
        return;
    }

    // B) SI LA JORNADA ES PENDIENTE: INTENTAR CARGAR BORRADOR
    let hasDraft = false;
    if (storageKey) {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.scheduledMatches && parsed.allPendingMatches) {
                    setScheduledMatches(parsed.scheduledMatches);
                    setAllPendingMatches(parsed.allPendingMatches);
                    hasDraft = true;
                }
            } catch (error) {
                console.error("Error parseando borrador:", error);
            }
        }
    }

    if (hasDraft) {
        setIsLoaded(true);
        return; 
    }

    // C) SIN BORRADOR: CARGAR DESDE DB (Estado Inicial Limpio)
    const allMatchesRaw = [...(matchesDB || []), ...(globalPendingMatches || [])];
    const uniqueMap = new Map();
    allMatchesRaw.forEach(m => { if (m?.id) uniqueMap.set(String(m.id), m); });

    const formattedMatches = Array.from(uniqueMap.values()).map(formatMatch).filter(Boolean);

    // Generar descansos (BYE) si es impar
    let currentSuggestions = [];
    if (teams.length % 2 !== 0) {
        const teamsPlayingThisRound = new Set();
        formattedMatches.forEach(m => {
            if (m.originJornada === currentJornadaName) {
                if (m.local?.id) teamsPlayingThisRound.add(m.local.id);
                if (m.visitante?.id && !m.isByeMatch) teamsPlayingThisRound.add(m.visitante.id);
            }
        });
        const restingTeams = teams.filter(t => !teamsPlayingThisRound.has(t.id));
        restingTeams.forEach(team => {
            currentSuggestions.push({
                id: `generated-bye-${jornadaIndex}-${team.id}`,
                local: team,
                visitante: byeTeam,
                status: 'Pendiente',
                originJornada: currentJornadaName,
                isModified: false,
                date: null, 
                time: null,
                isByeMatch: true
            });
        });
    }

    // Clasificar
    const currentScheduled = formattedMatches.filter(m => 
        (m.originJornada === currentJornadaName && m.date)
    );
    const currentPending = formattedMatches.filter(m => 
        m.originJornada === currentJornadaName && !m.date
    );
    const currentJornadaNum = jornadaIndex + 1;
    const backlogPending = formattedMatches.filter(m => {
        const mNum = getJornadaNum(m.originJornada);
        return mNum < currentJornadaNum && !m.date && m.status !== 'Finalizado';
    });

    setScheduledMatches(currentScheduled);
    setAllPendingMatches([...backlogPending, ...currentPending, ...currentSuggestions]);
    setIsLoaded(true);

  }, [
      teams, matchesDB, globalPendingMatches, 
      isConfirmed, storageKey, formatMatch, 
      currentJornadaName, jornadaIndex, byeTeam
  ]); 

  // --- EFECTO DE GUARDADO EN LOCALSTORAGE ---
  useEffect(() => {
    // Solo guardar si NO estamos confirmados y ya cargamos la data inicial
    if (isLoaded && storageKey && !isConfirmed) {
        const draftData = { scheduledMatches, allPendingMatches };
        localStorage.setItem(storageKey, JSON.stringify(draftData));
    }
  }, [scheduledMatches, allPendingMatches, storageKey, isLoaded, isConfirmed]);

  // --- MEMO SIDEBAR ---
  const sidebarMatches = useMemo(() => {
    // Filtrar partidos que ya están en scheduledMatches para no duplicar visualmente
    const scheduledIds = new Set(scheduledMatches.map(m => String(m.id)));
    const currentNum = jornadaIndex + 1;
    
    return allPendingMatches
        .filter(m => !scheduledIds.has(String(m.id)))
        .filter(m => {
            // Mostrar solo si pertenece a esta jornada o es anterior (pendiente arrastrado)
            const mNum = getJornadaNum(m.originJornada);
            return m.originJornada === currentJornadaName || mNum < currentNum;
        })
        .sort((a, b) => {
            // Ordenar por antigüedad de jornada
            const numA = getJornadaNum(a.originJornada);
            const numB = getJornadaNum(b.originJornada);
            if (numA !== numB) return numA - numB;
            // Descansos al final
            if (a.isByeMatch && !b.isByeMatch) return -1;
            if (!a.isByeMatch && b.isByeMatch) return 1;
            return 0;
        });

  }, [allPendingMatches, scheduledMatches, currentJornadaName, jornadaIndex]);

  return {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    sidebarMatches,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes, currentJornadaName,
    clearDraft 
  };
};