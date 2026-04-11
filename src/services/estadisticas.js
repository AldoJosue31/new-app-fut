import { supabase } from '../supabase/supabase.config';
import { resolveRepositionMappings } from '../utils/jornadaUtils';

export const getTablaPosicionesService = async (division) => {
  const { data, error } = await supabase
    .from('view_clasificacion')
    .select('*')
    .eq('division', division)
    .order('pts', { ascending: false })
    .order('pj', { ascending: false })
    .order('dg', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getTopScorersService = async ({
  division = null,
  tournamentId = null,
  limit = 10,
} = {}) => {
  let query = supabase
    .from('view_goleadores')
    .select('*')
    .order('goals', { ascending: false })
    .limit(limit);

  if (division) query = query.eq('division_name', division);

  if (tournamentId) {
    const tid = Number(tournamentId);
    query = query.eq('tournament_id', tid);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getTopScorersService error:', error);
    throw error;
  }
  return data || [];
};

export const getTeamTournamentStats = async (teamId, divisionId) => {
  try {
    const { data: torneo, error: tError } = await supabase
      .from('tournaments')
      .select('id, config')
      .eq('division_id', divisionId)
      .eq('status', 'Activo')
      .single();

    if (tError || !torneo) return null;

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
      supabase
        .from('jornadas')
        .select('id, name, start_date, end_date')
        .eq('tournament_id', tournamentId),
      supabase
        .from('players')
        .select('id, first_name, last_name, dorsal, photo_url')
        .eq('team_id', teamId)
        .order('dorsal', { ascending: true, nullsFirst: false }),
      supabase
        .from('view_goleadores')
        .select('player_id, first_name, last_name, dorsal, photo_url, goals')
        .eq('tournament_id', Number(tournamentId))
        .eq('team_id', Number(teamId)),
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
      .map(({ isCompleted, time, ...match }) => match);

    const upcomingRivals = normalizedMatches
      .filter((match) => !match.isCompleted)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      })
      .map(({ isCompleted, ...match }) => match);

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
    console.error('Error obteniendo stats:', error);
    return null;
  }
};
