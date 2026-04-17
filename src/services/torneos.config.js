import { supabase } from '../supabase/supabase.config';

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
    const { data: jornadasActuales } = await supabase
      .from('jornadas')
      .select('id')
      .eq('tournament_id', tournamentId);

    if (jornadasActuales.length === baseJornadasCount) {
      const nuevasJornadas = [];
      for (let i = baseJornadasCount; i < baseJornadasCount * 2; i++) {
        nuevasJornadas.push({
          tournament_id: tournamentId,
          name: `Jornada ${i + 1}`,
          status: 'Pendiente',
        });
      }
      if (nuevasJornadas.length > 0) {
        const { error: jError } = await supabase.from('jornadas').insert(nuevasJornadas);
        if (jError) throw jError;
      }
    }
  } else if (newConfig.vueltas === '1') {
    const { data: jornadasParaBorrar, error: fetchErr } = await supabase
      .from('jornadas')
      .select('id, name')
      .eq('tournament_id', tournamentId);

    if (!fetchErr && jornadasParaBorrar) {
      const idsABorrar = jornadasParaBorrar
        .filter((j) => {
          const numeroJornada = parseInt(j.name.replace('Jornada ', ''));
          return numeroJornada > baseJornadasCount;
        })
        .map((j) => j.id);

      if (idsABorrar.length > 0) {
        const { error: delError } = await supabase
          .from('jornadas')
          .delete()
          .in('id', idsABorrar);
        if (delError) throw delError;
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
  return data[0];
};

export const bulkUpdateJornadaFechas = async (jornadasConFechas) => {
  const { data, error } = await supabase
    .from('jornadas')
    .upsert(jornadasConFechas, { onConflict: 'id' })
    .select();

  if (error) throw error;
  return data;
};
