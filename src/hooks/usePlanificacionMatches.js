import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { generarFixture } from "../services/torneos";

export const usePlanificacionMatches = (activeTournament, jornadaIndex, teams, matchesDB, globalPendingMatches) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [allPendingMatches, setAllPendingMatches] = useState([]); // Pool interno completo
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);
  const lastJornadaRef = useRef(null);

  const currentJornadaName = `Jornada ${jornadaIndex + 1}`;
  
  // Extraer configuración de horarios
  const configHoraInicio = activeTournament?.config?.horaInicio || "08:00";

  // Helper para obtener el número de la jornada desde el string "Jornada X"
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
      }
    }
    return [...matches.filter(m => m.date !== dateToFix), ...matchesOfDay];
  }, [durationMatch]);

  useEffect(() => {
    if (!teams || teams.length < 2) return;

    // 1. Fixture Base (Standard)
    const baseRounds = generarFixture(teams);
    let fixtureMaster = [...baseRounds];
    if (activeTournament?.config?.vueltas === "2") {
      const roundsVuelta = baseRounds.map(r => r.map(m => ({ home: m.away, away: m.home })));
      fixtureMaster = [...baseRounds, ...roundsVuelta];
    }

    // 2. Formatear Partidos Reales (DB)
    const formatMatch = (m) => {
      const localId = m.team1_id ?? m.local?.id;
      const visitId = m.team2_id ?? m.visitante?.id;
      const localTeam = teams.find(t => t.id == localId);
      const visitTeam = teams.find(t => t.id == visitId);

      if (!localTeam || !visitTeam) return null;

      const hasT = typeof m.date === 'string' && m.date.includes('T');
      let finalDate = null;
      let finalTime = null;

      if (m.date) {
         finalDate = hasT ? m.date.split('T')[0] : m.date;
         // Usar la hora configurada por defecto si no viene tiempo
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
        isModified: Boolean(m.isModified) || false
      };
    };

    const allMatchesRaw = [...(matchesDB || []), ...(globalPendingMatches || [])];
    const uniqueMap = new Map();
    allMatchesRaw.forEach(m => {
        if (m?.id) uniqueMap.set(String(m.id), m);
    });

    const formattedMatches = Array.from(uniqueMap.values()).map(formatMatch).filter(Boolean);

    // 3. Generar Sugerencias (para la jornada actual que no existan en DB)
    let currentSuggestions = [];
    
    // Solo generamos sugerencias para la jornada actual para no saturar
    const roundIndex = jornadaIndex;
    if (fixtureMaster[roundIndex]) {
        const jName = currentJornadaName;
        const teamsOccupiedInJornada = new Set();
        
        // Revisamos ocupación
        formattedMatches
            .filter(m => m.originJornada === jName || (m.date && m.date === weekStartDate)) 
            .forEach(m => {
                if(m.local?.id) teamsOccupiedInJornada.add(m.local.id);
                if(m.visitante?.id) teamsOccupiedInJornada.add(m.visitante.id);
            });

        fixtureMaster[roundIndex].forEach(cruce => {
            const t1 = teams.find(t => t.id === cruce.home);
            const t2 = teams.find(t => t.id === cruce.away);
            if (!t1 || !t2) return;

            const existsAnywhere = formattedMatches.some(m =>
            (m.local.id === t1.id && m.visitante.id === t2.id) ||
            (m.local.id === t2.id && m.visitante.id === t1.id)
            );

            const isConflict = teamsOccupiedInJornada.has(t1.id) || teamsOccupiedInJornada.has(t2.id);

            if (!existsAnywhere && !isConflict) {
                currentSuggestions.push({
                    id: `suggested-${roundIndex}-${t1.id}-${t2.id}`,
                    local: t1, visitante: t2, status: 'Pendiente',
                    originJornada: jName, isModified: false,
                    date: null, time: null
                });
            }
        });
    }

    // --- FILTRADO INTELIGENTE ---
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
    
    lastJornadaRef.current = {
        jornadaIndex,
        formattedMatches
    };
  }, [matchesDB, globalPendingMatches, teams, jornadaIndex, weekStartDate, activeTournament, currentJornadaName, configHoraInicio]);

  // Sidebar Matches
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
            return numA - numB; 
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