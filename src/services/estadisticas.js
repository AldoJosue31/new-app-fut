import { supabase } from '../supabase/supabase.config';

export const getTablaPosicionesService = async (division) => {
  // Nota: Asegúrate de que tu vista 'view_clasificacion' tenga la columna correcta para la división.
  // Si usas un esquema estándar, usualmente es 'division' o 'division_name'.
  // Asumiremos que para clasificacion usas 'division'.
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

export const getTopScorersService = async ({ division = null, tournamentId = null, limit = 10 } = {}) => {
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
    console.error("getTopScorersService error:", error);
    throw error;
  }
  console.log("getTopScorersService result count:", (data && data.length) || 0);
  return data || [];
};

export const getTeamTournamentStats = async (teamId, divisionId) => {
  try {
    // 1. Obtener ID del torneo ACTIVO
    const { data: torneo, error: tError } = await supabase
      .from('tournaments')
      .select('id')
      .eq('division_id', divisionId)
      .eq('status', 'Activo')
      .single();

    if (tError || !torneo) return null;

    const tournamentId = torneo.id;

    // 2. Obtener Historial de Partidos (Solo FINALIZADOS)
    const { data: matches, error: mError } = await supabase
      .from('matches')
      .select(`
        id, goals1, goals2, date, status,
        team1:teams!team1_id(id, name, logo_url),
        team2:teams!team2_id(id, name, logo_url),
        jornadas!inner(name, tournament_id)
      `)
      .eq('jornadas.tournament_id', tournamentId)
      .eq('status', 'Finalizado')
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .order('date', { ascending: false });

    if (mError) throw mError;

    const matchHistory = matches.map(m => {
      const isLocal = m.team1.id === teamId;
      const myGoals = isLocal ? m.goals1 : m.goals2;
      const rivalGoals = isLocal ? m.goals2 : m.goals1;
      const rival = isLocal ? m.team2 : m.team1;
      
      let result = 'E';
      if (myGoals > rivalGoals) result = 'V';
      if (myGoals < rivalGoals) result = 'D';

      return {
        id: m.id,
        jornada: m.jornadas.name,
        rival,
        myGoals,
        rivalGoals,
        result
      };
    });

    // 3. Obtener Estadísticas de Jugadores (Eventos)
    const { data: events, error: eError } = await supabase
      .from('match_events')
      .select(`
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
      .eq('players.team_id', teamId);

    if (eError) throw eError;

    const statsMap = {};

    events.forEach(evt => {
      const pid = evt.player_id;
      const type = (evt.event_type || '').toLowerCase().trim(); 

      if (!statsMap[pid]) {
        statsMap[pid] = {
          id: pid,
          name: `${evt.players.first_name} ${evt.players.last_name}`,
          dorsal: evt.players.dorsal || '?',
          photo: evt.players.photo_url, 
          goals: 0,
          yellow: 0,
          red: 0,
          matches: 0
        };
      }

      if (type.includes('gol') && !type.includes('auto')) statsMap[pid].goals++;
      if (type.includes('amarilla') || type.includes('yellow')) statsMap[pid].yellow++;
      if (type.includes('roja') || type.includes('red')) statsMap[pid].red++;
      if (type.includes('particip') || type.includes('asist')) statsMap[pid].matches++;
    });

    const playerStats = Object.values(statsMap).sort((a, b) => b.goals - a.goals);

    return {
      hasTournament: true,
      matchHistory,
      playerStats
    };

  } catch (error) {
    console.error("Error obteniendo stats:", error);
    return null;
  }
};