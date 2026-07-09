import { supabase } from '../supabase/supabase.config';
import { TOURNAMENT_STATUS } from '../utils/constants';
import { addDaysToDate } from '../utils/dateUtils';

export const iniciarTorneoService = async (
  { divisionId, divisionName, season, startDate, config, jornadas },
  fixtureGenerado
) => {
  try {
    let resolvedDivisionId = divisionId ?? null;
    let divisionData = resolvedDivisionId ? { id: resolvedDivisionId } : null;

    if (!divisionData && divisionName) {
      const { data, error: divisionError } = await supabase
        .from('divisions')
        .select('id')
        .eq('name', divisionName)
        .maybeSingle();

      if (divisionError) throw divisionError;

      divisionData = data;
      resolvedDivisionId = data?.id ?? null;
    }
    if (!divisionData) throw new Error('DivisiÃ³n no encontrada');

    const { data: torneo, error: tError } = await supabase
      .from('tournaments')
      .insert({
        division_id: divisionData.id,
        season,
        start_date: startDate,
        config,
        status: TOURNAMENT_STATUS.ACTIVE,
      })
      .select()
      .single();

    if (tError) throw tError;

    const jornadaDurationDays = Math.max(1, parseInt(config?.jornadaDurationDays, 10) || 7);
    const jornadasToInsert = fixtureGenerado
      ? fixtureGenerado.map((f, index) => {
          const fechaInicio = addDaysToDate(startDate, index * jornadaDurationDays);
          const fechaFin = addDaysToDate(fechaInicio, jornadaDurationDays - 1);

          return {
            tournament_id: torneo.id,
            name: f.name,
            status: 'Pendiente',
            start_date: fechaInicio,
            end_date: fechaFin,
          };
        })
      : jornadas.map((j, index) => {
          const fechaInicio = addDaysToDate(startDate, index * jornadaDurationDays);
          const fechaFin = addDaysToDate(fechaInicio, jornadaDurationDays - 1);
          return {
            tournament_id: torneo.id,
            name: j.name,
            status: 'Pendiente',
            start_date: fechaInicio,
            end_date: fechaFin,
          };
        });

    const { data: jornadasCreadas, error: jError } = await supabase
      .from('jornadas')
      .insert(jornadasToInsert)
      .select();

    if (jError) throw jError;

    if (fixtureGenerado && fixtureGenerado.length > 0) {
      const matchesToInsert = [];

      fixtureGenerado.forEach((jornadaData) => {
        const jornadaDB = jornadasCreadas.find((j) => j.name === jornadaData.name);
        if (!jornadaDB) return;

        jornadaData.matches.forEach((match) => {
          if (match.local.id && match.local.id !== 'BYE') {
            const team2Id =
              match.visitante.id && match.visitante.id !== 'BYE'
                ? match.visitante.id
                : null;
            matchesToInsert.push({
              jornada_id: jornadaDB.id,
              team1_id: match.local.id,
              team2_id: team2Id,
              status: 'Programado',
              date: null,
            });
          }
        });
      });

      if (matchesToInsert.length > 0) {
        const { error: mError } = await supabase.from('matches').insert(matchesToInsert);
        if (mError) throw mError;
      }
    }

    return torneo;
  } catch (error) {
    console.error('Error en iniciarTorneoService:', error);
    throw error;
  }
};

export const eliminarTorneoService = async (tournamentId) => {
  try {
    if (!tournamentId) throw new Error('ID de torneo invÃ¡lido');

    const { data: jornadas, error: jError } = await supabase
      .from('jornadas')
      .select('id')
      .eq('tournament_id', tournamentId);

    if (jError) throw jError;

    const jornadaIds = jornadas.map((j) => j.id);

    if (jornadaIds.length > 0) {
      const { data: matches, error: mError } = await supabase
        .from('matches')
        .select('id')
        .in('jornada_id', jornadaIds);

      if (mError) throw mError;

      const matchIds = matches.map((m) => m.id);

      if (matchIds.length > 0) {
        const { error: meError } = await supabase
          .from('match_events')
          .delete()
          .in('match_id', matchIds);
        if (meError) throw meError;

        const { error: delMatchesErr } = await supabase
          .from('matches')
          .delete()
          .in('jornada_id', jornadaIds);
        if (delMatchesErr) throw delMatchesErr;
      }

      const { error: delJornadasErr } = await supabase
        .from('jornadas')
        .delete()
        .eq('tournament_id', tournamentId);
      if (delJornadasErr) throw delJornadasErr;
    }

    const { error: tError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (tError) throw tError;

    return { success: true };
  } catch (error) {
    console.error('Error crÃ­tico eliminando torneo:', error);
    throw error;
  }
};
