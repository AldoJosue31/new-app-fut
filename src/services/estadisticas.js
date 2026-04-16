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
  return data || [];
};

export const getTopScorerEventsService = async ({ tournamentId = null } = {}) => {
  if (!tournamentId) return [];

  const tid = Number(tournamentId);
  const { data, error } = await supabase
    .from('match_events')
    .select(`
      event_type,
      player_id,
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
        jornada_id,
        status,
        jornadas!inner (
          id,
          name,
          tournament_id
        )
      )
    `)
    .eq('matches.jornadas.tournament_id', tid);

  if (error) {
    console.error("getTopScorerEventsService error:", error);
    throw error;
  }

  return data || [];
};

export const getTeamTournamentStats = async (teamId, divisionId) => {
  try {
    // 1. Obtener ID del torneo ACTIVO
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

    const configuredRepositionMappings = Array.isArray(tournamentConfig.repositionMappings)
      ? tournamentConfig.repositionMappings
      : [];
    const repositionMatchMappings = Array.isArray(tournamentConfig.repositionMatchMappings)
      ? tournamentConfig.repositionMatchMappings
      : [];

    // 2. Obtener Historial de Partidos (Solo FINALIZADOS)
    // Se pide 'observations' en lugar de columnas de penales inexistentes
    const { data: matches, error: mError } = await supabase
      .from('matches')
      .select(`
        id, goals1, goals2, date, status, observations,
        team1:teams!team1_id(id, name, logo_url),
        team2:teams!team2_id(id, name, logo_url),
        jornadas!inner(id, name, tournament_id)
      `)
      .eq('jornadas.tournament_id', tournamentId)
      .eq('status', 'Finalizado')
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .order('date', { ascending: false });

    if (mError) throw mError;

    const { data: jornadas, error: jornadasError } = await supabase
      .from('jornadas')
      .select('id, name, start_date, end_date')
      .eq('tournament_id', tournamentId);

    if (jornadasError) throw jornadasError;

    const repositionMappings = resolveRepositionMappings({
      jornadas: jornadas || [],
      configuredMappings: configuredRepositionMappings,
    });

    const matchHistory = matches.map(m => {
      const isLocal = m.team1.id === teamId;
      const myGoals = isLocal ? m.goals1 : m.goals2;
      const rivalGoals = isLocal ? m.goals2 : m.goals1;
      const rival = isLocal ? m.team2 : m.team1;
      const matchMapping = repositionMatchMappings.find(
        mapping => String(mapping?.matchId) === String(m.id)
      );
      const jornadaMapping = repositionMappings.find(
        mapping => String(mapping?.repositionJornadaId) === String(m.jornadas?.id)
      );
      const displayJornada =
        matchMapping?.originalJornadaName ||
        jornadaMapping?.originalJornadaName ||
        m.jornadas?.name;
      
      // EXTRAER PENALES DE LAS OBSERVACIONES (Ej. "Pen: 4-3")
      let myPenalties = null;
      let rivalPenalties = null;

      if (m.observations && /Pen/i.test(m.observations)) {
        const matchPen = m.observations.match(/Pen.*:\s*(\d+)\s*-\s*(\d+)/i);
        if (matchPen) {
            const penLocal = parseInt(matchPen[1]);
            const penVisit = parseInt(matchPen[2]);
            myPenalties = isLocal ? penLocal : penVisit;
            rivalPenalties = isLocal ? penVisit : penLocal;
        }
      }

      let result = 'E';
      if (myGoals > rivalGoals) result = 'V';
      if (myGoals < rivalGoals) result = 'D';

      // Reevaluar resultado final si hubo tanda de penales
      if (myGoals === rivalGoals && myPenalties !== null && rivalPenalties !== null) {
          if (myPenalties > rivalPenalties) result = 'V';
          if (myPenalties < rivalPenalties) result = 'D';
      }

      return {
        id: m.id,
        jornada: displayJornada,
        date: m.date,
        rival,
        myGoals,
        rivalGoals,
        myPenalties,
        rivalPenalties,
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
