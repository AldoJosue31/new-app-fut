import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { generarFixture } from "../services/torneos";

export const usePlanificacionMatches = (activeTournament, jornadaIndex, teams, matchesDB, globalPendingMatches) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [allPendingMatches, setAllPendingMatches] = useState([]);
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);
  const lastJornadaRef = useRef(null);

  const currentJornadaName = `Jornada ${jornadaIndex + 1}`;

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

      const isPending = m.status === 'Pendiente';
      const hasT = typeof m.date === 'string' && m.date.includes('T');

      // CORRECCIÓN: Si no hay fecha en DB, se queda null (incluso si es Programado)
      // Esto permite que 'Programado' sin fecha vaya al Sidebar
      let finalDate = null;
      let finalTime = null;

      if (m.date) {
         finalDate = hasT ? m.date.split('T')[0] : m.date;
         finalTime = hasT ? m.date.split('T')[1].substring(0, 5) : (m.time || "10:00");
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

    // 3. Generar Sugerencias (sin conflictos)
    let allSuggestions = [];
    
    fixtureMaster.forEach((round, rIndex) => {
      const jName = `Jornada ${rIndex + 1}`;
      const teamsOccupiedInJornada = new Set();
      formattedMatches
        .filter(m => m.originJornada === jName)
        .forEach(m => {
            if(m.local?.id) teamsOccupiedInJornada.add(m.local.id);
            if(m.visitante?.id) teamsOccupiedInJornada.add(m.visitante.id);
        });

      round.forEach(cruce => {
        const t1 = teams.find(t => t.id === cruce.home);
        const t2 = teams.find(t => t.id === cruce.away);
        if (!t1 || !t2) return;

        const existsAnywhere = formattedMatches.some(m =>
          (m.local.id === t1.id && m.visitante.id === t2.id) ||
          (m.local.id === t2.id && m.visitante.id === t1.id)
        );

        const isConflict = teamsOccupiedInJornada.has(t1.id) || teamsOccupiedInJornada.has(t2.id);

        if (!existsAnywhere && !isConflict) {
          allSuggestions.push({
            id: `suggested-${rIndex}-${t1.id}-${t2.id}`,
            local: t1, visitante: t2, status: 'Pendiente',
            originJornada: jName, isModified: false,
            date: null, time: null
          });
        }
      });
    });

    // FILTROS PRINCIPALES
    // Scheduled: Tiene Fecha definida
    const currentScheduled = formattedMatches.filter(m => m.originJornada === currentJornadaName && m.date);
    
    // Pending: NO tiene Fecha (o es sugerencia)
    const currentPending = formattedMatches.filter(m => m.originJornada === currentJornadaName && !m.date);
    const currentSuggestions = allSuggestions.filter(s => s.originJornada === currentJornadaName);

    setScheduledMatches(currentScheduled);
    setAllPendingMatches([...currentPending, ...currentSuggestions]);
    
    lastJornadaRef.current = {
        jornadaIndex,
        allKnownSuggestions: allSuggestions,
        allFormattedMatches: formattedMatches
    };
  }, [matchesDB, globalPendingMatches, teams, jornadaIndex, weekStartDate, activeTournament, currentJornadaName]);

  const pendingCurrentJornada = useMemo(() => allPendingMatches.filter(m => m.originJornada === currentJornadaName), [allPendingMatches, currentJornadaName]);

  const futureMatches = useMemo(() => {
    if (!lastJornadaRef.current) return [];
    const { allKnownSuggestions, allFormattedMatches } = lastJornadaRef.current;
    
    // Future pool: Todos los que no tienen fecha
    const pool = [
        ...allFormattedMatches.filter(m => !m.date),
        ...allKnownSuggestions
    ];

    return pool.filter(m => m.originJornada !== currentJornadaName);
  }, [allPendingMatches, currentJornadaName, globalPendingMatches]);

  return {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    pendingCurrentJornada, futureMatches,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes, currentJornadaName
  };
};