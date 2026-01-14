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

    const baseRounds = generarFixture(teams);
    let fixtureMaster = [...baseRounds];
    if (activeTournament?.config?.vueltas === "2") {
      const roundsVuelta = baseRounds.map(r => r.map(m => ({ home: m.away, away: m.home })));
      fixtureMaster = [...baseRounds, ...roundsVuelta];
    }

    const formatMatch = (m) => {
      const localId = m.team1_id ?? m.local?.id;
      const visitId = m.team2_id ?? m.visitante?.id;
      const localTeam = teams.find(t => t.id == localId);
      const visitTeam = teams.find(t => t.id == visitId);

      if (!localTeam || !visitTeam) return null;

      const isPending = m.status === 'Pendiente';
      const hasT = typeof m.date === 'string' && m.date.includes('T');

      return {
        id: m.id,
        local: localTeam,
        visitante: visitTeam,
        date: isPending ? null : (m.date ? (hasT ? m.date.split('T')[0] : m.date) : weekStartDate),
        time: isPending ? null : (hasT ? m.date.split('T')[1].substring(0, 5) : (m.time || "10:00")),
        status: m.status,
        goals1: m.goals1,
        goals2: m.goals2,
        jornada_id: m.jornada_id,
        originJornada: m.jornadas?.name || m.originJornada || currentJornadaName,
        isModified: Boolean(m.isModified) || false
      };
    };

    // Unificamos todos los partidos conocidos para evitar duplicar sugerencias
    const allMatchesRaw = [...(matchesDB || []), ...(globalPendingMatches || [])];
    const uniqueMap = new Map();
    allMatchesRaw.forEach(m => {
        if (m?.id) uniqueMap.set(String(m.id), m);
    });

    const formattedMatches = Array.from(uniqueMap.values()).map(formatMatch).filter(Boolean);

    // Generar sugerencias para TODAS las jornadas que falten en la DB
    let allSuggestions = [];
    fixtureMaster.forEach((round, rIndex) => {
      const jName = `Jornada ${rIndex + 1}`;
      round.forEach(cruce => {
        const t1 = teams.find(t => t.id === cruce.home);
        const t2 = teams.find(t => t.id === cruce.away);
        if (!t1 || !t2) return;

        // Si este cruce ya existe en la DB (en cualquier jornada), no sugerimos
        const existsAnywhere = formattedMatches.some(m =>
          (m.local.id === t1.id && m.visitante.id === t2.id) ||
          (m.local.id === t2.id && m.visitante.id === t1.id)
        );

        if (!existsAnywhere) {
          allSuggestions.push({
            id: `suggested-${rIndex}-${t1.id}-${t2.id}`,
            local: t1, visitante: t2, status: 'Pendiente',
            originJornada: jName, isModified: false,
            date: null, time: null
          });
        }
      });
    });

    // Filtramos para la vista actual
    const currentScheduled = formattedMatches.filter(m => m.originJornada === currentJornadaName && m.status !== 'Pendiente');
    const currentPending = formattedMatches.filter(m => m.originJornada === currentJornadaName && m.status === 'Pendiente');
    const currentSuggestions = allSuggestions.filter(s => s.originJornada === currentJornadaName);

    setScheduledMatches(currentScheduled);
    setAllPendingMatches([...currentPending, ...currentSuggestions]);
    
    // Guardamos todas las sugerencias globales para que el modal las vea
    lastJornadaRef.current = {
        jornadaIndex,
        allKnownSuggestions: allSuggestions,
        allFormattedMatches: formattedMatches
    };
  }, [matchesDB, globalPendingMatches, teams, jornadaIndex, weekStartDate, activeTournament, currentJornadaName]);

  const pendingCurrentJornada = useMemo(() => allPendingMatches.filter(m => m.originJornada === currentJornadaName), [allPendingMatches, currentJornadaName]);

  // CORRECCIÓN: futureMatches ahora incluye sugerencias futuras Y partidos pendientes de la DB
  const futureMatches = useMemo(() => {
    if (!lastJornadaRef.current) return [];
    
    const { allKnownSuggestions, allFormattedMatches } = lastJornadaRef.current;
    
    // Combinamos partidos pendientes reales de otras jornadas + sugerencias de otras jornadas
    const pool = [
        ...allFormattedMatches.filter(m => m.status === 'Pendiente'),
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