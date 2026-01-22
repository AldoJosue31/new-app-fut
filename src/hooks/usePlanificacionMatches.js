import { useState, useEffect, useMemo, useCallback, useRef } from "react";

export const usePlanificacionMatches = (activeTournament, jornadaIndex, teams, matchesDB, globalPendingMatches) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [allPendingMatches, setAllPendingMatches] = useState([]); 
  
  // Estado para la fecha de visualización (Semana), iniciamos con hoy
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Referencias para evitar re-calculos innecesarios al editar
  const loadedRef = useRef(false);

  const currentJornadaName = `Jornada ${jornadaIndex + 1}`;
  const configHoraInicio = activeTournament?.config?.horaInicio || "08:00";
  
  // Objeto estático para el descanso (memoizado)
  const byeTeam = useMemo(() => ({ id: 'BYE', name: 'DESCANSA', img: null, isBye: true }), []);

  const getJornadaNum = (str) => {
    if (!str) return 999;
    const parts = str.split(' ');
    return parts.length > 1 ? parseInt(parts[1], 10) : 999;
  };

  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45, 10);
    const minDescanso = parseInt(activeTournament?.config?.minutosDescanso || 15, 10);
    return (minPorTiempo * 2) + minDescanso;
  }, [activeTournament]);

  // Algoritmo para ajustar horas automáticamente y evitar superposiciones
  const autoAdjustTimes = useCallback((matches, dateToFix) => {
    // Solo ajustamos los partidos de la fecha que se tocó
    let matchesOfDay = matches.filter(m => m.date === dateToFix);
    const otherMatches = matches.filter(m => m.date !== dateToFix);

    if (matchesOfDay.length <= 1) return matches;

    // Ordenar por hora actual
    matchesOfDay.sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));

    for (let i = 1; i < matchesOfDay.length; i++) {
      const prev = matchesOfDay[i - 1];
      const curr = matchesOfDay[i];

      const [ph, pm] = (prev.time || "00:00").split(':').map(Number);
      const prevEndMinutes = (ph * 60) + pm + durationMatch;

      const [ch, cm] = (curr.time || "00:00").split(':').map(Number);
      const currStartMinutes = (ch * 60) + cm;

      // Solo empujamos la hora si se solapan
      if (currStartMinutes < prevEndMinutes) {
        const newH = Math.floor(prevEndMinutes / 60);
        const newM = prevEndMinutes % 60;
        // Marcamos como modificado para guardar después
        curr.time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        curr.isModified = true; 
      }
    }

    return [...otherMatches, ...matchesOfDay];
  }, [durationMatch]);

  // EFECTO PRINCIPAL DE CARGA DE DATOS
  // NOTA: Quitamos weekStartDate de las dependencias para evitar reseteos al navegar el calendario
  useEffect(() => {
    if (!teams || teams.length < 2) return;

    const formatMatch = (m) => {
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
         finalTime = hasT ? m.date.split('T')[1].substring(0, 5) : (m.time || configHoraInicio);
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
        jornada_id: m.jornada_id,
        originJornada: m.jornadas?.name || m.originJornada || currentJornadaName,
        isModified: Boolean(m.isModified) || false,
        isByeMatch: isByeMatch
      };
    };

    const allMatchesRaw = [...(matchesDB || []), ...(globalPendingMatches || [])];
    const uniqueMap = new Map();
    allMatchesRaw.forEach(m => {
        if (m?.id) uniqueMap.set(String(m.id), m);
    });

    const formattedMatches = Array.from(uniqueMap.values()).map(formatMatch).filter(Boolean);

    // Generar Sugerencias de Descanso (Exclusión Lógica)
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
            const alreadyHasByeCard = formattedMatches.some(m => 
                m.originJornada === currentJornadaName && 
                m.local.id === team.id && 
                m.isByeMatch
            );

            if (!alreadyHasByeCard) {
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
            }
        });
    }

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
    
    // Si tenemos partidos programados, sincronizamos la semana de vista con el primer partido
    if (currentScheduled.length > 0 && !loadedRef.current) {
         setWeekStartDate(currentScheduled[0].date);
         loadedRef.current = true;
    }

  }, [matchesDB, globalPendingMatches, teams, jornadaIndex, activeTournament, currentJornadaName, byeTeam]); 
  // ^^^ ELIMINADO: weekStartDate y configHoraInicio para evitar reseteos en edición

  // Sidebar Matches (Lógica derivada)
  const sidebarMatches = useMemo(() => {
    const scheduledIds = new Set(scheduledMatches.map(m => String(m.id)));
    const currentNum = jornadaIndex + 1;
    
    return allPendingMatches
        .filter(m => !scheduledIds.has(String(m.id)))
        .filter(m => {
            const mNum = getJornadaNum(m.originJornada);
            return m.originJornada === currentJornadaName || mNum < currentNum;
        })
        .sort((a, b) => {
            const numA = getJornadaNum(a.originJornada);
            const numB = getJornadaNum(b.originJornada);
            if (numA !== numB) return numA - numB;
            
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
    durationMatch, autoAdjustTimes, currentJornadaName
  };
};