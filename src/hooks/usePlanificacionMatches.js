import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { generarFixture } from "../services/torneos";

export const usePlanificacionMatches = (activeTournament, jornadaIndex, teams, matchesDB, globalPendingMatches) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [allPendingMatches, setAllPendingMatches] = useState([]);
  // Inicializamos con la fecha de hoy por si el torneo no tiene fecha de inicio aún
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);
  const lastJornadaRef = useRef(null);

  const currentJornadaName = `Jornada ${jornadaIndex + 1}`;

  const durationMatch = useMemo(() => {
    const minPorTiempo = parseInt(activeTournament?.config?.minutosPorTiempo || 45);
    const minDescanso = parseInt(activeTournament?.config?.minutosDescanso || 15);
    return (minPorTiempo * 2) + minDescanso;
  }, [activeTournament]);

  const autoAdjustTimes = useCallback((matches, dateToFix) => {
    let matchesOfDay = [...matches].filter(m => m.date === dateToFix).sort((a, b) => a.time.localeCompare(b.time));
    if (matchesOfDay.length <= 1) return matches;
    for (let i = 1; i < matchesOfDay.length; i++) {
      const prev = matchesOfDay[i - 1]; const curr = matchesOfDay[i];
      const [ph, pm] = prev.time.split(':').map(Number);
      const prevEndMinutes = (ph * 60) + pm + durationMatch;
      const [ch, cm] = curr.time.split(':').map(Number);
      const currStartMinutes = (ch * 60) + cm;
      if (currStartMinutes < prevEndMinutes) {
        const newH = Math.floor(prevEndMinutes / 60); const newM = prevEndMinutes % 60;
        curr.time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      }
    }
    return [...matches.filter(m => m.date !== dateToFix), ...matchesOfDay];
  }, [durationMatch]);

useEffect(() => {
    if (!teams || teams.length < 2 || lastJornadaRef.current === jornadaIndex) return;

    const baseRounds = generarFixture(teams);
    let fixtureMaster = [...baseRounds];
    if (activeTournament?.config?.vueltas === "2") {
      const roundsVuelta = baseRounds.map(r => r.map(m => ({ home: m.away, away: m.home })));
      fixtureMaster = [...baseRounds, ...roundsVuelta];
    }

    const dbScheduled = [];
    const dbPendingFromDB = [];

    const formatMatch = (m) => {
      const localTeam = teams.find(t => t.id == m.team1_id);
      const visitTeam = teams.find(t => t.id == m.team2_id);
      if (!localTeam || !visitTeam) return null;

      // CORRECCIÓN: Si es pendiente, no forzamos fecha/hora
      const isPending = m.status === 'Pendiente';
      
      return {
        id: m.id, 
        local: localTeam, 
        visitante: visitTeam,
        date: isPending ? null : (m.date ? m.date.split('T')[0] : weekStartDate),
        time: isPending ? null : (m.date?.includes('T') ? m.date.split('T')[1].substring(0, 5) : "10:00"),
        status: m.status, 
        goals1: m.goals1, 
        goals2: m.goals2,
        jornada_id: m.jornada_id, 
        originJornada: m.jornadas?.name || currentJornadaName,
        isModified: false 
      };
    };

    matchesDB.forEach(m => {
      const matchObj = formatMatch(m);
      if (matchObj) {
        if (m.status === 'Programado' || m.status === 'Finalizado') dbScheduled.push(matchObj);
        else dbPendingFromDB.push(matchObj);
      }
    });

    const formattedGlobalPending = globalPendingMatches.map(formatMatch).filter(m => m);
    const allKnownMatches = [...dbScheduled, ...dbPendingFromDB, ...formattedGlobalPending];

    let suggestions = [];
    fixtureMaster.forEach((round, rIndex) => {
      const jName = `Jornada ${rIndex + 1}`;
      round.forEach(cruce => {
        const t1 = teams.find(t => t.id === cruce.home);
        const t2 = teams.find(t => t.id === cruce.away);
        if (!t1 || !t2) return;
        const exists = allKnownMatches.some(m => (m.local.id === t1.id && m.visitante.id === t2.id) || (m.local.id === t2.id && m.visitante.id === t1.id));
        if (!exists) {
          suggestions.push({ 
            id: `suggested-${rIndex}-${t1.id}-${t2.id}`, 
            local: t1, visitante: t2, status: 'Pendiente', 
            originJornada: jName, isModified: false,
            date: null, time: null
          });
        }
      });
    });

    setScheduledMatches(dbScheduled);
    setAllPendingMatches([...dbPendingFromDB, ...formattedGlobalPending, ...suggestions]);
    lastJornadaRef.current = jornadaIndex;
  }, [matchesDB, globalPendingMatches, teams, jornadaIndex, weekStartDate, activeTournament]);

  const pendingCurrentJornada = useMemo(() => allPendingMatches.filter(m => m.originJornada === currentJornadaName), [allPendingMatches, currentJornadaName]);
  const futureMatches = useMemo(() => allPendingMatches.filter(m => m.originJornada !== currentJornadaName), [allPendingMatches, currentJornadaName]);

  return {
    scheduledMatches, setScheduledMatches,
    allPendingMatches, setAllPendingMatches,
    pendingCurrentJornada, futureMatches,
    weekStartDate, setWeekStartDate,
    durationMatch, autoAdjustTimes, currentJornadaName
  };
};