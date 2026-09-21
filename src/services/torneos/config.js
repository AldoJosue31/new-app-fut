import { supabase } from './shared';
import { serializeFixtureCriteria } from '../../utils/fixtureValidation.js';

const parseTournamentConfig = (config) => {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return config;
  }

  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const hasStoredScoreValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

const hasProtectedMatchResult = (match) =>
  !['Pendiente', 'Programado'].includes(match?.status || 'Programado') ||
  hasStoredScoreValue(match?.goals1) ||
  hasStoredScoreValue(match?.goals2) ||
  Number(match?.puntos1 ?? 0) !== 0 ||
  Number(match?.puntos2 ?? 0) !== 0 ||
  (match?.mvp_player_id !== null &&
    match?.mvp_player_id !== undefined) ||
  (match?.match_events || []).length > 0;

export const actualizarConfigTorneoService = async (
  tournamentId,
  newConfig,
  baseJornadasCount
) => {
  let jornadasABorrar = [];

  // Validar antes de cambiar la configuración evita dejar el torneo marcado
  // como una sola vuelta cuando la reducción no puede borrar jornadas con
  // resultados. La política RLS equivalente cierra la ventana de carrera
  // entre esta lectura y el DELETE.
  if (newConfig.vueltas === '1') {
    const { data: jornadasParaBorrar, error: fetchError } = await supabase
      .from('jornadas')
      .select('id, name, status')
      .eq('tournament_id', tournamentId);

    if (fetchError) throw fetchError;

    jornadasABorrar = (jornadasParaBorrar || [])
      .filter((jornada) => {
        const numeroJornada = parseInt(
          String(jornada.name || '').replace('Jornada ', ''),
          10
        );
        return numeroJornada > baseJornadasCount;
      });

    if (
      jornadasABorrar.some((jornada) =>
        ['Confirmada', 'Finalizada'].includes(jornada.status)
      )
    ) {
      throw new Error('No se pueden eliminar jornadas confirmadas o finalizadas.');
    }

    const idsABorrar = jornadasABorrar.map((jornada) => jornada.id);
    if (idsABorrar.length > 0) {
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(
          'id, status, goals1, goals2, puntos1, puntos2, mvp_player_id, match_events(id)',
        )
        .in('jornada_id', idsABorrar);

      if (matchesError) throw matchesError;
      if ((matches || []).some(hasProtectedMatchResult)) {
        throw new Error('No se pueden eliminar jornadas con resultados, estadísticas o eventos.');
      }

      // La política RLS vuelve a validar estas condiciones al borrar. Pedir
      // las filas eliminadas evita marcar la configuración como reducida si
      // otra pestaña registró un resultado entre la lectura y el DELETE.
      const { data: jornadasEliminadas, error: deleteError } = await supabase
        .from('jornadas')
        .delete()
        .in('id', idsABorrar)
        .select('id');

      if (deleteError) throw deleteError;

      const deletedIds = new Set((jornadasEliminadas || []).map((jornada) => String(jornada.id)));
      if (
        deletedIds.size !== idsABorrar.length ||
        idsABorrar.some((id) => !deletedIds.has(String(id)))
      ) {
        throw new Error('Las jornadas cambiaron mientras se reducían las vueltas. Recarga e inténtalo de nuevo.');
      }
    }
  }

  const updates = { config: newConfig };
  if (newConfig.startDate) {
    updates.start_date = newConfig.startDate;
  }

  const { error: updateError } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', tournamentId);

  if (updateError) throw updateError;

  if (newConfig.vueltas === '2') {
    const { data: jornadasActuales, error: jornadasError } = await supabase
      .from('jornadas')
      .select('id')
      .eq('tournament_id', tournamentId);

    if (jornadasError) throw jornadasError;

    if ((jornadasActuales || []).length === baseJornadasCount) {
      const nuevasJornadas = [];
      for (let index = baseJornadasCount; index < baseJornadasCount * 2; index += 1) {
        nuevasJornadas.push({
          tournament_id: tournamentId,
          name: `Jornada ${index + 1}`,
          status: 'Pendiente',
        });
      }

      if (nuevasJornadas.length > 0) {
        const { error: insertError } = await supabase
          .from('jornadas')
          .insert(nuevasJornadas);
        if (insertError) throw insertError;
      }
    }
  }
};

export const updateJornadaFechas = async (jornadaId, startDate, endDate) => {
  const { data, error } = await supabase
    .from('jornadas')
    .update({ start_date: startDate, end_date: endDate })
    .eq('id', jornadaId)
    .select();

  if (error) throw error;
  return data?.[0] || null;
};

export const bulkUpdateJornadaFechas = async (jornadasConFechas) => {
  const { data, error } = await supabase
    .from('jornadas')
    .upsert(jornadasConFechas, { onConflict: 'id' })
    .select();

  if (error) throw error;
  return data || [];
};

export const updateTournamentFieldsService = async (tournamentId, updates) => {
  const { error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', tournamentId);

  if (error) throw error;
  return { success: true };
};

export const updateTournamentFixtureCriteriaService = async (
  tournamentId,
  fixtureCriteria,
) => {
  const { data: currentTournament, error: fetchError } = await supabase
    .from('tournaments')
    .select('config')
    .eq('id', tournamentId)
    .single();

  if (fetchError) throw fetchError;

  const nextConfig = {
    ...parseTournamentConfig(currentTournament?.config),
    fixtureCriteria: serializeFixtureCriteria(fixtureCriteria),
  };

  const { data: updatedTournament, error: updateError } = await supabase
    .from('tournaments')
    .update({ config: nextConfig })
    .eq('id', tournamentId)
    .select('config')
    .single();

  if (updateError) throw updateError;
  return parseTournamentConfig(updatedTournament?.config);
};
