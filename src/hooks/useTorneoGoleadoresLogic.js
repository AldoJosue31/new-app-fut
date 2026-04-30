import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabase.config';
import {
  getOfficialJornadaNumberForMatch,
  useTorneoStandingsLogic,
} from './useTorneoStandingsLogic';

const normalizeGoalEventType = (eventType = '') =>
  String(eventType || '').trim().toLowerCase();

const isGoalEventType = (eventType = '') => {
  const normalized = normalizeGoalEventType(eventType);
  return (
    (normalized.includes('gol') || normalized.includes('goal')) &&
    !normalized.includes('auto') &&
    !normalized.includes('own')
  );
};

const buildFullName = (player = {}) =>
  [player?.first_name, player?.last_name].filter(Boolean).join(' ').trim();

const normalizeScorerRow = (row = {}, equiposById = new Map()) => {
  const playerId = row?.player_id ?? row?.id ?? null;
  const teamId = row?.team_id ?? null;
  const teamData =
    equiposById.get(String(teamId)) ||
    equiposById.get(Number(teamId)) ||
    null;

  return {
    player_id: playerId,
    first_name: row?.first_name || '',
    last_name: row?.last_name || '',
    dorsal: row?.dorsal ?? null,
    photo_url: row?.photo_url || null,
    team_id: teamId,
    team_name: row?.team_name || teamData?.name || 'Sin equipo',
    team_logo: row?.team_logo || teamData?.logo_url || null,
    team_color: row?.team_color || teamData?.color || null,
    goals: Number(row?.goals ?? 0),
  };
};

const sortScorers = (a, b) => {
  if (b.goals !== a.goals) return b.goals - a.goals;

  const fullNameA = buildFullName(a) || 'Jugador';
  const fullNameB = buildFullName(b) || 'Jugador';

  return fullNameA.localeCompare(fullNameB, 'es', { sensitivity: 'base' });
};

const GOAL_EVENTS_PAGE_SIZE = 1000;

const fetchGoalEventsByTournament = async (torneoId) => {
  const allRows = [];
  let from = 0;

  while (true) {
    const to = from + GOAL_EVENTS_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('match_events')
      .select(`
        id,
        match_id,
        player_id,
        event_type,
        players!inner (
          id,
          first_name,
          last_name,
          dorsal,
          photo_url,
          team_id
        ),
        matches!inner (
          id,
          status,
          team1_id,
          team2_id,
          jornadas!inner (
            id,
            name,
            tournament_id
          )
        )
      `)
      .eq('matches.jornadas.tournament_id', torneoId)
      .or('event_type.ilike.%gol%,event_type.ilike.%goal%')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    allRows.push(...rows);

    if (rows.length < GOAL_EVENTS_PAGE_SIZE) break;
    from += GOAL_EVENTS_PAGE_SIZE;
  }

  return allRows;
};

export const useTorneoGoleadoresLogic = ({
  torneo,
  equipos = [],
  partidos = [],
  jornadasProp = [],
  reglas = {},
  selectedJornadaView = 'recent',
  goleadoresFallback = [],
}) => {
  const [goalEvents, setGoalEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsReady, setEventsReady] = useState(false);

  const {
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    activeJornadaName,
    isCalculating,
    mergedJornadas,
    repositionMappings,
    repositionMatchMappings,
    relevantMatches,
  } = useTorneoStandingsLogic({
    torneo,
    equipos: [],
    partidos,
    jornadasProp,
    reglas,
    selectedJornadaView,
  });

  useEffect(() => {
    let mounted = true;

    const loadGoalEvents = async () => {
      if (!torneo?.id) {
        if (mounted) {
          setGoalEvents([]);
          setEventsReady(false);
        }
        return;
      }

      try {
        setIsLoadingEvents(true);

        const data = await fetchGoalEventsByTournament(torneo.id);

        if (mounted) {
          setGoalEvents(Array.isArray(data) ? data : []);
          setEventsReady(true);
        }
      } catch (error) {
        console.error('Error fetching goleadores by jornada:', error);
        if (mounted) {
          setGoalEvents([]);
          setEventsReady(true);
        }
      } finally {
        if (mounted) setIsLoadingEvents(false);
      }
    };

    loadGoalEvents();

    return () => {
      mounted = false;
    };
  }, [torneo?.id]);

  const equiposById = useMemo(() => {
    const nextMap = new Map();

    (Array.isArray(equipos) ? equipos : []).forEach((equipo) => {
      nextMap.set(String(equipo?.id), equipo);
      nextMap.set(Number(equipo?.id), equipo);
    });

    return nextMap;
  }, [equipos]);

  const fallbackRows = useMemo(() => {
    return (Array.isArray(goleadoresFallback) ? goleadoresFallback : [])
      .map((row) => normalizeScorerRow(row, equiposById))
      .sort(sortScorers);
  }, [goleadoresFallback, equiposById]);

  const currentLimitJornada = useMemo(() => {
    if (selectedJornadaView === 'recent') return effectiveJornada;

    const parsed = Number.parseInt(selectedJornadaView, 10);
    return Number.isNaN(parsed) ? effectiveJornada : parsed;
  }, [selectedJornadaView, effectiveJornada]);

  const goleadores = useMemo(() => {
    if (!eventsReady) return fallbackRows;

    if (!Array.isArray(goalEvents) || goalEvents.length === 0 || currentLimitJornada <= 0) {
      return selectedJornadaView === 'recent' ? fallbackRows : [];
    }

    const allowedMatchIds = new Set(
      (Array.isArray(relevantMatches) ? relevantMatches : [])
        .filter((match) => {
          const jornadaNumber = getOfficialJornadaNumberForMatch(
            match,
            mergedJornadas,
            repositionMappings,
            repositionMatchMappings
          );

          return jornadaNumber > 0 && jornadaNumber <= currentLimitJornada;
        })
        .map((match) => String(match?.id))
    );

    const scorerMap = new Map();

    goalEvents.forEach((eventRow) => {
      if (!isGoalEventType(eventRow?.event_type)) return;
      if (!allowedMatchIds.has(String(eventRow?.match_id))) return;

      const player = eventRow?.players || {};
      const playerId = String(eventRow?.player_id ?? player?.id ?? '');
      if (!playerId) return;

      const teamData =
        equiposById.get(String(player?.team_id)) ||
        equiposById.get(Number(player?.team_id)) ||
        {};

      const fallbackRow = fallbackRows.find(
        (row) => String(row?.player_id) === playerId
      );

      if (!scorerMap.has(playerId)) {
        scorerMap.set(playerId, {
          player_id: playerId,
          first_name: player?.first_name || fallbackRow?.first_name || '',
          last_name: player?.last_name || fallbackRow?.last_name || '',
          dorsal: player?.dorsal ?? fallbackRow?.dorsal ?? null,
          photo_url: player?.photo_url || fallbackRow?.photo_url || null,
          team_id: player?.team_id ?? fallbackRow?.team_id ?? null,
          team_name: fallbackRow?.team_name || teamData?.name || 'Sin equipo',
          team_logo: fallbackRow?.team_logo || teamData?.logo_url || null,
          team_color: fallbackRow?.team_color || teamData?.color || null,
          goals: 0,
        });
      }

      scorerMap.get(playerId).goals += 1;
    });

    const rows = Array.from(scorerMap.values()).sort(sortScorers);

    if (rows.length === 0 && selectedJornadaView === 'recent') {
      return fallbackRows;
    }

    return rows;
  }, [
    currentLimitJornada,
    equiposById,
    eventsReady,
    fallbackRows,
    goalEvents,
    mergedJornadas,
    relevantMatches,
    repositionMappings,
    repositionMatchMappings,
    selectedJornadaView,
  ]);

  const activeJornadaSummary = useMemo(() => {
    if (!currentLimitJornada || currentLimitJornada <= 0) return 'Torneo sin iniciar';
    return `Hasta la Jornada ${currentLimitJornada}`;
  }, [currentLimitJornada]);

  return {
    goleadores,
    effectiveJornada,
    jornadasConfirmadasForDropdown,
    activeJornadaName,
    activeJornadaSummary,
    isLoading: isCalculating || isLoadingEvents,
  };
};
