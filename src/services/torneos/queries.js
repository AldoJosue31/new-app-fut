import { supabase, ACTIVE_TOURNAMENT_STATUSES } from './shared';
import { createRequestCache } from '../../utils/requestCache.js';

const externalContextCache = createRequestCache({ ttlMs: 30_000, maxEntries: 8 });
const externalMatchesCache = createRequestCache({ ttlMs: 15_000 });
const externalTeamsCache = createRequestCache({ ttlMs: 30_000 });

const withAbortSignal = (query, signal) =>
  signal ? query.abortSignal(signal) : query;

const uniqueIds = (values = []) => [
  ...new Set(values.filter((value) => value !== null && value !== undefined)),
];

const getRows = async (query, signal) => {
  const { data, error } = await withAbortSignal(query, signal);
  if (error) throw error;
  return data || [];
};

export const getJornadas = async (tournamentId) => {
  const { data, error } = await supabase
    .from('jornadas')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getTorneoActivo = async (divisionId) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, jornadas(name, status), divisions(name, id, league_id)')
      .eq('division_id', divisionId)
      .in('status', ACTIVE_TOURNAMENT_STATUSES)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data?.divisions) {
      data.division = data.divisions;
    }
    return data;
  } catch (error) {
    console.error('Error en getTorneoActivo:', error.message);
    throw error;
  }
};

export const getEquiposDivision = async (divisionId) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(id)')
      .eq('division_id', divisionId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en getEquiposDivision:', error.message);
    throw error;
  }
};

export const getAllMatchesByTournament = async (tournamentId) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, jornadas!inner(id, name, tournament_id)')
    .eq('jornadas.tournament_id', tournamentId);

  if (error) throw error;
  return data || [];
};

const loadExternalContext = async (currentTournamentId, leagueId, signal) => {
  // Scope each step before reading matches. Besides reducing the result set,
  // this prevents PostgREST from building one very large RLS plan spanning
  // matches, jornadas, tournaments, divisions and teams twice.
  const divisions = await getRows(
    supabase
      .from('divisions')
      .select('id, name')
      .eq('league_id', leagueId),
    signal,
  );
  const divisionIds = uniqueIds(divisions.map((division) => division.id));
  if (divisionIds.length === 0) return { divisions, tournaments: [], jornadas: [] };

  let tournamentsQuery = supabase
    .from('tournaments')
    .select('id, division_id, status')
    .in('division_id', divisionIds);

  if (currentTournamentId) {
    tournamentsQuery = tournamentsQuery.neq('id', currentTournamentId);
  }

  const tournaments = await getRows(tournamentsQuery, signal);
  const tournamentIds = uniqueIds(
    tournaments.map((tournament) => tournament.id),
  );
  if (tournamentIds.length === 0) return { divisions, tournaments, jornadas: [] };

  const jornadas = await getRows(
    supabase
      .from('jornadas')
      .select('id, name, tournament_id')
      .in('tournament_id', tournamentIds),
    signal,
  );
  return { divisions, tournaments, jornadas };
};

const getExternalSessionScope = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.access_token || null;
};

const getExternalContext = (scope, currentTournamentId, leagueId, signal) =>
  externalContextCache.read(
    JSON.stringify([scope, leagueId, currentTournamentId]),
    (requestSignal) => loadExternalContext(currentTournamentId, leagueId, requestSignal),
    { signal },
  );

export const prefetchPartidosExternosContext = async (
  currentTournamentId, leagueId, { signal } = {},
) => {
  if (!leagueId) return;
  const scope = await getExternalSessionScope();
  if (scope) await getExternalContext(scope, currentTournamentId, leagueId, signal);
};

const loadExternalMatches = async (
  startDate, endDate, currentTournamentId, leagueId, scope, signal, forceRefresh,
) => {
  const context = forceRefresh
    ? await loadExternalContext(currentTournamentId, leagueId, signal)
    : await getExternalContext(scope, currentTournamentId, leagueId, signal);
  if (forceRefresh) {
    externalContextCache.set(JSON.stringify([scope, leagueId, currentTournamentId]), context);
  }
  const { divisions, tournaments, jornadas } = context;
  const jornadaIds = uniqueIds(jornadas.map((jornada) => jornada.id));
  if (jornadaIds.length === 0) return [];

  const matches = await getRows(
    supabase
      .from('matches')
      .select('id, date, status, jornada_id, team1_id, team2_id, goals1, goals2')
      .in('jornada_id', jornadaIds)
      .gte('date', `${startDate} 00:00:00`)
      .lte('date', `${endDate} 23:59:59`)
      .neq('status', 'Pendiente')
      .neq('status', 'Cancelado')
      .order('date', { ascending: true }),
    signal,
  );
  if (matches.length === 0) return [];

  const teamIds = uniqueIds(
    matches.flatMap((match) => [match.team1_id, match.team2_id]),
  );
  const loadTeams = (requestSignal) => getRows(
    supabase.from('teams').select('id, name, logo_url').in('id', teamIds),
    requestSignal,
  );
  const teamsCacheKey = JSON.stringify([scope, leagueId, [...teamIds].sort()]);
  const teams = teamIds.length > 0
    ? await (forceRefresh
      ? loadTeams(signal)
      : externalTeamsCache.read(
        teamsCacheKey, loadTeams, { signal },
      ))
    : [];
  if (forceRefresh && teamIds.length > 0) externalTeamsCache.set(teamsCacheKey, teams);

  const divisionsById = new Map(
    divisions.map((division) => [String(division.id), division]),
  );
  const tournamentsById = new Map(
    tournaments.map((tournament) => [String(tournament.id), tournament]),
  );
  const jornadasById = new Map(
    jornadas.map((jornada) => [String(jornada.id), jornada]),
  );
  const teamsById = new Map(
    teams.map((team) => [String(team.id), team]),
  );

  return matches.map((match) => {
      const jornada = jornadasById.get(String(match.jornada_id));
      const tournament = tournamentsById.get(String(jornada?.tournament_id));
      const division = divisionsById.get(String(tournament?.division_id));
      const team1 = teamsById.get(String(match.team1_id));
      const team2 = teamsById.get(String(match.team2_id));
      let datePart = '';
      let timePart = '00:00';

      if (match.date) {
        const raw = match.date.toString();
        if (raw.includes('T')) {
          const parts = raw.split('T');
          datePart = parts[0];
          if (parts[1]) timePart = parts[1].substring(0, 5);
        } else if (raw.includes(' ')) {
          const parts = raw.split(' ');
          datePart = parts[0];
          if (parts[1]) timePart = parts[1].substring(0, 5);
        } else {
          datePart = raw;
        }
      }

      return {
        id: `ext-${match.id}`,
        original_id: match.id,
        jornada_id: jornada?.id,
        jornada_name: jornada?.name,
        rawDate: datePart,
        date: datePart,
        time: timePart,
        local_name: team1?.name || 'Equipo Local',
        visitante_name: team2?.name || 'Equipo Visita',
        local_logo: team1?.logo_url,
        visitante_logo: team2?.logo_url,
        division_name: division?.name || 'Otra Division',
        status: match.status,
        goals1: match.goals1,
        goals2: match.goals2,
        isExternal: true,
      };
    });
};

export const getPartidosExternosRango = async (
  startDate, endDate, currentTournamentId, leagueId,
  { signal, forceRefresh = false, onCachedData } = {},
) => {
  if (!startDate || !endDate || !leagueId) return [];
  const scope = await getExternalSessionScope();
  if (!scope) return [];
  const load = (requestSignal) => loadExternalMatches(
    startDate, endDate, currentTournamentId, leagueId, scope, requestSignal, forceRefresh,
  );
  const cacheKey = JSON.stringify([scope, leagueId, currentTournamentId, startDate, endDate]);
  // Conflict checks always read current schedules, including new rounds/divisions.
  if (forceRefresh) {
    const data = await load(signal);
    externalMatchesCache.set(cacheKey, data);
    return data;
  }
  return externalMatchesCache.read(
    cacheKey,
    load,
    { signal, onCachedData },
  );
};

export const getTournamentConfigService = async (tournamentId) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('config')
    .eq('id', tournamentId)
    .single();

  if (error) throw error;
  return data?.config && typeof data.config === 'object' ? data.config : {};
};

export const getMatchesByJornadaService = async (jornadaId) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, jornadas(id, name)')
    .eq('jornada_id', jornadaId);

  if (error) throw error;
  return data || [];
};

export const getMatchesByIdsService = async (matchIds) => {
  if (!Array.isArray(matchIds) || matchIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('matches')
    .select('*, jornadas(id, name)')
    .in('id', matchIds);

  if (error) throw error;
  return data || [];
};

export const getPendingMatchesByTournamentService = async (tournamentId) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, jornadas!inner(id, name, tournament_id)')
    .eq('jornadas.tournament_id', tournamentId)
    .in('status', ['Pendiente', 'Programado']);

  if (error) throw error;
  return data || [];
};
