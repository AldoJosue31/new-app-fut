import { supabase } from './shared';

export const actualizarConfigTorneoService = async (
  tournamentId,
  newConfig,
  baseJornadasCount
) => {
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
  } else if (newConfig.vueltas === '1') {
    const { data: jornadasParaBorrar, error: fetchError } = await supabase
      .from('jornadas')
      .select('id, name')
      .eq('tournament_id', tournamentId);

    if (fetchError) throw fetchError;

    const idsABorrar = (jornadasParaBorrar || [])
      .filter((jornada) => {
        const numeroJornada = parseInt(
          String(jornada.name || '').replace('Jornada ', ''),
          10
        );
        return numeroJornada > baseJornadasCount;
      })
      .map((jornada) => jornada.id);

    if (idsABorrar.length > 0) {
      const { error: deleteError } = await supabase
        .from('jornadas')
        .delete()
        .in('id', idsABorrar);
      if (deleteError) throw deleteError;
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
