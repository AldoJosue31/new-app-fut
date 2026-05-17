import { supabase } from '../supabase/supabase.config';
import { TOURNAMENT_STATUS } from '../utils/constants';

export const getJornadas = async (tournamentId) => {
  const { data, error } = await supabase
    .from('jornadas')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('id', { ascending: true });

  if (error) throw error;
  return data;
};

export const getTournamentConfig = async (tournamentId) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('config')
    .eq('id', tournamentId)
    .single();

  if (error) throw error;
  return data?.config && typeof data.config === 'object' ? data.config : {};
};

export const getTorneoActivo = async (divisionId) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, jornadas(name, status), divisions(name, id, league_id)')
      .eq('division_id', divisionId)
      .in('status', [TOURNAMENT_STATUS.ACTIVE, TOURNAMENT_STATUS.ONGOING])
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data && data.divisions) {
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
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*, jornadas!inner(id, name, tournament_id)')
      .eq('jornadas.tournament_id', tournamentId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en getAllMatchesByTournament:', error);
    return [];
  }
};

export const getMatchesByJornada = async (jornadaId) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, jornadas(id, name)')
    .eq('jornada_id', jornadaId);

  if (error) throw error;
  return data || [];
};

export const getMatchesByIds = async (matchIds) => {
  if (!Array.isArray(matchIds) || matchIds.length === 0) return [];

  const { data, error } = await supabase
    .from('matches')
    .select('*, jornadas(id, name)')
    .in('id', matchIds);

  if (error) throw error;
  return data || [];
};

export const getPendingMatchesByTournament = async (tournamentId) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, jornadas!inner(id, name, tournament_id)')
    .eq('jornadas.tournament_id', tournamentId)
    .in('status', ['Pendiente', 'Programado']);

  if (error) throw error;
  return data || [];
};

export const getPartidosExternosRango = async (
  startDate,
  endDate,
  currentTournamentId,
  leagueId
) => {
  try {
    if (!startDate || !endDate || !leagueId) return [];

    const { data, error } = await supabase
      .from('matches')
      .select(`
                id,
                date,
                status,
                team1:teams!team1_id ( name, logo_url ),
                team2:teams!team2_id ( name, logo_url ),
                jornadas!inner (
                    id,
                    name,
                    tournament_id,
                    tournaments!inner (
                        status, 
                        divisions!inner ( name, league_id, id )
                    )
                )
            `)
      .gte('date', `${startDate} 00:00:00`)
      .lte('date', `${endDate} 23:59:59`)
      .neq('status', 'Pendiente')
      .neq('status', 'Cancelado')
      .order('date', { ascending: true });

    if (error) throw error;

    const matchesFiltrados = data.filter((m) => {
      const matchTournId = m.jornadas?.tournament_id;
      const matchLeagueId = m.jornadas?.tournaments?.divisions?.league_id;

      if (currentTournamentId && String(matchTournId) === String(currentTournamentId)) {
        return false;
      }

      if (String(matchLeagueId) !== String(leagueId)) {
        return false;
      }

      return true;
    });

    return matchesFiltrados.map((m) => {
      let datePart = '';
      let timePart = '00:00';

      if (m.date) {
        const raw = m.date.toString();
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
        id: `ext-${m.id}`,
        original_id: m.id,
        jornada_id: m.jornadas?.id,
        jornada_name: m.jornadas?.name,
        rawDate: datePart,
        date: datePart,
        time: timePart,

        local_name: m.team1?.name || 'Equipo Local',
        visitante_name: m.team2?.name || 'Equipo Visita',
        local_logo: m.team1?.logo_url,
        visitante_logo: m.team2?.logo_url,

        division_name: m.jornadas?.tournaments?.divisions?.name || 'Otra DivisiÃ³n',
        status: m.status,
        isExternal: true,
      };
    });
  } catch (error) {
    console.error('Error obteniendo partidos externos:', error);
    return [];
  }
};
