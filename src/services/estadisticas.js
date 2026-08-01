import { supabase } from "../lib/supabase/browserClient.js";
import { resolveRepositionMappings } from '../utils/jornadaUtils';
import { isAbortError } from '../utils/errorUtils';

const withAbortSignal = (query, signal) =>
  signal ? query.abortSignal(signal) : query;

const QUERY_ID_BATCH_SIZE = 50;
const QUERY_PAGE_SIZE = 1000;

const uniqueIds = (values = []) => [
  ...new Set(values.filter((value) => value !== null && value !== undefined)),
];

const getRows = async (query, signal) => {
  const { data, error } = await withAbortSignal(query, signal);
  if (error) throw error;
  return data || [];
};

const getRowsInBatches = async ({
  table,
  select,
  column,
  ids,
  signal,
  configureQuery = (query) => query,
}) => {
  const rows = [];

  for (let index = 0; index < ids.length; index += QUERY_ID_BATCH_SIZE) {
    const batch = ids.slice(index, index + QUERY_ID_BATCH_SIZE);
    let from = 0;

    while (true) {
      const query = configureQuery(
        supabase
          .from(table)
          .select(select)
          .in(column, batch)
          .order('id', { ascending: true })
          .range(from, from + QUERY_PAGE_SIZE - 1),
      );
      const page = await getRows(query, signal);
      rows.push(...page);

      if (page.length < QUERY_PAGE_SIZE) break;
      from += QUERY_PAGE_SIZE;
    }
  }

  return rows;
};

export const getTopScorersService = async ({
  division = null,
  tournamentId = null,
  limit = 10,
  signal = null,
} = {}) => {
  try {
    const requestedTournamentId = tournamentId === null || tournamentId === ''
      ? null
      : Number(tournamentId);
    const requestedLimit = Math.max(0, Number(limit) || 0);

    if (
      requestedTournamentId !== null &&
      !Number.isFinite(requestedTournamentId)
    ) {
      return [];
    }

    let divisions = [];
    if (division) {
      divisions = await getRows(
        supabase
          .from('divisions')
          .select('id, name')
          .eq('name', division),
        signal,
      );
      if (divisions.length === 0) return [];
    }

    let tournamentsQuery = supabase
      .from('tournaments')
      .select('id, division_id');

    if (requestedTournamentId !== null) {
      tournamentsQuery = tournamentsQuery.eq('id', requestedTournamentId);
    } else if (divisions.length > 0) {
      tournamentsQuery = tournamentsQuery.in(
        'division_id',
        uniqueIds(divisions.map((item) => item.id)),
      );
    }

    let tournaments = await getRows(tournamentsQuery, signal);
    if (divisions.length > 0 && requestedTournamentId !== null) {
      const allowedDivisionIds = new Set(
        divisions.map((item) => String(item.id)),
      );
      tournaments = tournaments.filter((tournament) =>
        allowedDivisionIds.has(String(tournament.division_id)),
      );
    }
    if (tournaments.length === 0 || requestedLimit === 0) return [];

    const tournamentIds = uniqueIds(
      tournaments.map((tournament) => tournament.id),
    );
    const divisionIds = uniqueIds(
      tournaments.map((tournament) => tournament.division_id),
    );

    if (divisions.length === 0) {
      divisions = await getRowsInBatches({
        table: 'divisions',
        select: 'id, name',
        column: 'id',
        ids: divisionIds,
        signal,
      });
    }

    const jornadas = await getRowsInBatches({
      table: 'jornadas',
      select: 'id, tournament_id',
      column: 'tournament_id',
      ids: tournamentIds,
      signal,
    });
    const jornadaIds = uniqueIds(jornadas.map((jornada) => jornada.id));
    if (jornadaIds.length === 0) return [];

    const matches = await getRowsInBatches({
      table: 'matches',
      select: 'id, jornada_id',
      column: 'jornada_id',
      ids: jornadaIds,
      signal,
    });
    const matchIds = uniqueIds(matches.map((match) => match.id));
    if (matchIds.length === 0) return [];

    const events = await getRowsInBatches({
      table: 'match_events',
      select: 'id, match_id, player_id',
      column: 'match_id',
      ids: matchIds,
      signal,
      configureQuery: (query) => query.eq('event_type', 'goal'),
    });
    if (events.length === 0) return [];

    const jornadasById = new Map(
      jornadas.map((jornada) => [String(jornada.id), jornada]),
    );
    const tournamentIdByMatchId = new Map(
      matches.map((match) => [
        String(match.id),
        jornadasById.get(String(match.jornada_id))?.tournament_id,
      ]),
    );
    const goalsByPlayerAndTournament = new Map();

    events.forEach((event) => {
      const eventTournamentId = tournamentIdByMatchId.get(String(event.match_id));
      if (event.player_id == null || eventTournamentId == null) return;

      const key = `${event.player_id}:${eventTournamentId}`;
      const current = goalsByPlayerAndTournament.get(key) || {
        playerId: event.player_id,
        tournamentId: eventTournamentId,
        goals: 0,
      };
      current.goals += 1;
      goalsByPlayerAndTournament.set(key, current);
    });

    const scorerGroups = [...goalsByPlayerAndTournament.values()];
    const playerIds = uniqueIds(scorerGroups.map((group) => group.playerId));
    const players = await getRowsInBatches({
      table: 'players',
      select: 'id, first_name, last_name, dorsal, photo_url, team_id',
      column: 'id',
      ids: playerIds,
      signal,
    });
    const teamIds = uniqueIds(players.map((player) => player.team_id));
    const teams = await getRowsInBatches({
      table: 'teams',
      select: 'id, name, logo_url, color',
      column: 'id',
      ids: teamIds,
      signal,
    });

    const playersById = new Map(
      players.map((player) => [String(player.id), player]),
    );
    const teamsById = new Map(
      teams.map((team) => [String(team.id), team]),
    );
    const tournamentsById = new Map(
      tournaments.map((tournament) => [String(tournament.id), tournament]),
    );
    const divisionsById = new Map(
      divisions.map((item) => [String(item.id), item]),
    );

    return scorerGroups
      .map((group) => {
        const player = playersById.get(String(group.playerId));
        const team = teamsById.get(String(player?.team_id));
        const tournament = tournamentsById.get(String(group.tournamentId));
        const tournamentDivision = divisionsById.get(
          String(tournament?.division_id),
        );

        if (!player || !team || !tournament || !tournamentDivision) return null;

        return {
          player_id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          dorsal: player.dorsal,
          photo_url: player.photo_url,
          team_id: team.id,
          team_name: team.name,
          team_logo: team.logo_url,
          team_color: team.color,
          tournament_id: tournament.id,
          division_id: tournamentDivision.id,
          division_name: tournamentDivision.name,
          goals: group.goals,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, requestedLimit);
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) return [];
    throw error;
  }
};

export const getGoalEventsByTournamentService = async (
  tournamentId,
  { signal = null } = {},
) => {
  try {
    const requestedTournamentId = Number(tournamentId);
    if (!Number.isFinite(requestedTournamentId)) return [];

    const jornadas = await getRows(
      supabase
        .from('jornadas')
        .select('id, name, tournament_id')
        .eq('tournament_id', requestedTournamentId)
        .order('id', { ascending: true }),
      signal,
    );
    const jornadaIds = uniqueIds(jornadas.map((jornada) => jornada.id));
    if (jornadaIds.length === 0) return [];

    const matches = await getRowsInBatches({
      table: 'matches',
      select: 'id, status, team1_id, team2_id, jornada_id',
      column: 'jornada_id',
      ids: jornadaIds,
      signal,
    });
    const matchIds = uniqueIds(matches.map((match) => match.id));
    if (matchIds.length === 0) return [];

    const events = await getRowsInBatches({
      table: 'match_events',
      select: 'id, match_id, player_id, event_type',
      column: 'match_id',
      ids: matchIds,
      signal,
      configureQuery: (query) =>
        query.or('event_type.ilike.%gol%,event_type.ilike.%goal%'),
    });
    if (events.length === 0) return [];

    const playerIds = uniqueIds(events.map((event) => event.player_id));
    const players = await getRowsInBatches({
      table: 'players',
      select: 'id, first_name, last_name, dorsal, photo_url, team_id',
      column: 'id',
      ids: playerIds,
      signal,
    });

    const jornadasById = new Map(
      jornadas.map((jornada) => [String(jornada.id), jornada]),
    );
    const matchesById = new Map(
      matches.map((match) => [String(match.id), match]),
    );
    const playersById = new Map(
      players.map((player) => [String(player.id), player]),
    );

    return events
      .map((event) => {
        const match = matchesById.get(String(event.match_id));
        const jornada = jornadasById.get(String(match?.jornada_id));
        const player = playersById.get(String(event.player_id));
        if (!match || !jornada || !player) return null;

        return {
          id: event.id,
          match_id: event.match_id,
          player_id: event.player_id,
          event_type: event.event_type,
          players: player,
          matches: {
            id: match.id,
            status: match.status,
            team1_id: match.team1_id,
            team2_id: match.team2_id,
            jornadas: jornada,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.id) - Number(b.id));
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) return [];
    throw error;
  }
};

export const getTeamTournamentStats = async (
  teamId,
  divisionId,
  { tournament = null, signal = null } = {},
) => {
  try {
    let torneo = tournament;

    if (!torneo) {
      const { data, error } = await withAbortSignal(
        supabase
          .from('tournaments')
          .select('id, config')
          .eq('division_id', divisionId)
          .eq('status', 'Activo')
          .maybeSingle(),
        signal,
      );

      if (error || !data) return null;
      torneo = data;
    }

    const tournamentId = torneo.id;
    const tournamentConfig =
      torneo?.config && typeof torneo.config === 'object' ? torneo.config : {};

    const configuredRepositionMappings = Array.isArray(
      tournamentConfig.repositionMappings
    )
      ? tournamentConfig.repositionMappings
      : [];
    const repositionMatchMappings = Array.isArray(
      tournamentConfig.repositionMatchMappings
    )
      ? tournamentConfig.repositionMatchMappings
      : [];

    const [
      { data: allMatches, error: matchesError },
      { data: jornadas, error: jornadasError },
      { data: teamPlayers, error: playersError },
      { data: goleadoresView, error: goleadoresError },
      { data: events, error: eventsError },
    ] = await Promise.all([
      withAbortSignal(
        supabase
          .from('matches')
          .select(`
            id, goals1, goals2, date, status, observations,
            team1:teams!team1_id(id, name, logo_url, color),
            team2:teams!team2_id(id, name, logo_url, color),
            jornadas!inner(id, name, tournament_id)
          `)
          .eq('jornadas.tournament_id', tournamentId)
          .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
          .order('date', { ascending: true, nullsFirst: false }),
        signal,
      ),
      withAbortSignal(
        supabase
          .from('jornadas')
          .select('id, name, start_date, end_date')
          .eq('tournament_id', tournamentId),
        signal,
      ),
      withAbortSignal(
        supabase
          .from('players')
          .select('id, first_name, last_name, dorsal, photo_url')
          .eq('team_id', teamId)
          .order('dorsal', { ascending: true, nullsFirst: false }),
        signal,
      ),
      withAbortSignal(
        supabase
          .from('view_goleadores')
          .select('player_id, first_name, last_name, dorsal, photo_url, goals')
          .eq('tournament_id', Number(tournamentId))
          .eq('team_id', Number(teamId)),
        signal,
      ),
      withAbortSignal(
        supabase
          .from('match_events')
          .select(`
            match_id,
            event_type,
            player_id,
            players!inner (
              id, first_name, last_name, dorsal, team_id, photo_url
            ),
            matches!inner (
              jornadas!inner ( tournament_id )
            )
          `)
          .eq('matches.jornadas.tournament_id', tournamentId)
          .eq('players.team_id', teamId),
        signal,
      ),
    ]);

    if (matchesError) throw matchesError;
    if (jornadasError) throw jornadasError;
    if (playersError) throw playersError;
    if (eventsError) throw eventsError;
    if (goleadoresError) {
      console.warn('getTeamTournamentStats goleadores fallback error:', goleadoresError);
    }

    const repositionMappings = resolveRepositionMappings({
      jornadas: jornadas || [],
      configuredMappings: configuredRepositionMappings,
    });

    const resolveDisplayJornada = (match) => {
      const matchMapping = repositionMatchMappings.find(
        (mapping) => String(mapping?.matchId) === String(match?.id)
      );
      const jornadaMapping = repositionMappings.find(
        (mapping) =>
          String(mapping?.repositionJornadaId) === String(match?.jornadas?.id)
      );

      return (
        matchMapping?.originalJornadaName ||
        jornadaMapping?.originalJornadaName ||
        match?.jornadas?.name ||
        ''
      );
    };

    const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

    const isCompletedMatch = (match) => {
      const status = normalizeStatus(match?.status);
      const hasResult = match?.goals1 != null && match?.goals2 != null;

      return (
        hasResult ||
        ['finalizado', 'completado', 'jugado', 'terminado', 'cerrado'].includes(
          status
        )
      );
    };

    const extractMatchTime = (dateValue) => {
      if (!dateValue) return '';

      const rawValue = String(dateValue);
      const timeMatch = rawValue.match(/[T\s](\d{2}):(\d{2})/);
      if (!timeMatch) return '';

      const [, hours, minutes] = timeMatch;
      const localDate = new Date(2000, 0, 1, Number(hours), Number(minutes));
      if (Number.isNaN(localDate.getTime())) return '';

      return localDate.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    const normalizedMatches = (allMatches || [])
      .filter((match) => match?.team1?.id && match?.team2?.id)
      .map((match) => {
        const isLocal = String(match.team1.id) === String(teamId);
        const myGoals = isLocal ? match.goals1 : match.goals2;
        const rivalGoals = isLocal ? match.goals2 : match.goals1;
        const rival = isLocal ? match.team2 : match.team1;

        let myPenalties = null;
        let rivalPenalties = null;

        if (match.observations && /Pen/i.test(match.observations)) {
          const matchPen = match.observations.match(/Pen.*:\s*(\d+)\s*-\s*(\d+)/i);
          if (matchPen) {
            const penLocal = parseInt(matchPen[1], 10);
            const penVisit = parseInt(matchPen[2], 10);
            myPenalties = isLocal ? penLocal : penVisit;
            rivalPenalties = isLocal ? penVisit : penLocal;
          }
        }

        let result = 'E';
        if (myGoals > rivalGoals) result = 'V';
        if (myGoals < rivalGoals) result = 'D';

        if (myGoals === rivalGoals && myPenalties !== null && rivalPenalties !== null) {
          if (myPenalties > rivalPenalties) result = 'V';
          if (myPenalties < rivalPenalties) result = 'D';
        }

        return {
          id: match.id,
          jornada: resolveDisplayJornada(match),
          date: match.date,
          rival,
          myGoals: myGoals ?? 0,
          rivalGoals: rivalGoals ?? 0,
          myPenalties,
          rivalPenalties,
          result,
          time: extractMatchTime(match.date),
          isCompleted: isCompletedMatch(match),
        };
      });

    const matchHistory = normalizedMatches
      .filter((match) => match.isCompleted)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      })
      .map((match) => {
        const publicMatch = { ...match };
        delete publicMatch.isCompleted;
        delete publicMatch.time;
        return publicMatch;
      });

    const upcomingRivals = normalizedMatches
      .filter((match) => !match.isCompleted)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      })
      .map((match) => {
        const publicMatch = { ...match };
        delete publicMatch.isCompleted;
        return publicMatch;
      });

    const statsMap = {};
    const appearancesByPlayer = {};

    const ensurePlayerEntry = (playerData = {}, playerId = null) => {
      const resolvedPlayerId = String(
        playerId ?? playerData.id ?? playerData.player_id ?? ''
      );
      if (!resolvedPlayerId) return null;

      if (!statsMap[resolvedPlayerId]) {
        const fullName = [playerData.first_name, playerData.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();

        statsMap[resolvedPlayerId] = {
          id: resolvedPlayerId,
          name: fullName || playerData.name || 'Jugador',
          dorsal: playerData.dorsal ?? '?',
          photo: playerData.photo_url || playerData.photo || null,
          goals: 0,
          yellow: 0,
          red: 0,
          matches: 0,
        };
      }

      return statsMap[resolvedPlayerId];
    };

    (teamPlayers || []).forEach((player) => {
      ensurePlayerEntry(player, player.id);
    });

    (events || []).forEach((evt) => {
      const playerId = String(evt.player_id);
      const type = (evt.event_type || '').toLowerCase().trim();
      const playerEntry = ensurePlayerEntry(evt.players, playerId);

      if (!playerEntry) return;

      if (!appearancesByPlayer[playerId]) {
        appearancesByPlayer[playerId] = new Set();
      }
      if (evt.match_id != null) {
        appearancesByPlayer[playerId].add(String(evt.match_id));
      }

      const isGoalEvent =
        (type.includes('gol') || type.includes('goal')) &&
        !type.includes('auto') &&
        !type.includes('own');

      if (isGoalEvent) playerEntry.goals++;
      if (type.includes('amarilla') || type.includes('yellow')) playerEntry.yellow++;
      if (type.includes('roja') || type.includes('red')) playerEntry.red++;
    });

    ((goleadoresError ? [] : goleadoresView) || []).forEach((row) => {
      const playerEntry = ensurePlayerEntry(row, row.player_id);
      if (playerEntry) {
        playerEntry.goals = Math.max(playerEntry.goals, Number(row.goals ?? 0));
      }
    });

    Object.entries(statsMap).forEach(([playerId, playerEntry]) => {
      playerEntry.matches = appearancesByPlayer[playerId]?.size || 0;
    });

    const playerStats = Object.values(statsMap).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.matches !== a.matches) return b.matches - a.matches;
      if (a.yellow !== b.yellow) return a.yellow - b.yellow;
      return a.name.localeCompare(b.name, 'es');
    });

    return {
      hasTournament: true,
      matchHistory,
      upcomingRivals,
      playerStats,
    };
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) return null;
    console.error('Error obteniendo stats:', error);
    return null;
  }
};
