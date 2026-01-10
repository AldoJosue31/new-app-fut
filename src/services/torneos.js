import { supabase } from '../supabase/supabase.config';
import { TOURNAMENT_STATUS } from '../utils/constants';

// --- SERVICIOS DE LECTURA (Queries) ---

export const getTorneoActivo = async (divisionId) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('division_id', divisionId)
      .in('status', [TOURNAMENT_STATUS.ACTIVE, TOURNAMENT_STATUS.ONGOING])
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en getTorneoActivo:", error.message);
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
    console.error("Error en getEquiposDivision:", error.message);
    throw error;
  }
};

// --- SERVICIOS DE ESCRITURA ---

export const generarFixture = (equipos) => {
  const list = [...equipos];
  if (list.length % 2 !== 0) list.push({ id: null }); // Bye
  const rounds = [];
  const totalRounds = list.length - 1;

  for (let i = 0; i < totalRounds; i++) {
    const round = [];
    for (let j = 0; j < list.length / 2; j++) {
      const t1 = list[j];
      const t2 = list[list.length - 1 - j];
      if (t1.id && t2.id) {
        round.push({ home: t1.id, away: t2.id });
      }
    }
    rounds.push(round);
    list.splice(1, 0, list.pop());
  }
  return rounds;
};

export const actualizarConfigTorneoService = async (tournamentId, newConfig, baseJornadasCount) => {
  // 1. Actualizar configuración en la tabla tournaments
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ config: newConfig })
    .eq('id', tournamentId);

  if (updateError) throw updateError;

  // 2. Manejo de Jornadas según las vueltas
  if (newConfig.vueltas === "2") {
    // Agregar jornadas si se cambia a Ida y Vuelta
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
                status: 'Pendiente'
            });
        }
        if (nuevasJornadas.length > 0) {
            const { error: jError } = await supabase.from('jornadas').insert(nuevasJornadas);
            if (jError) throw jError;
        }
    }
  } else if (newConfig.vueltas === "1") {
    // ELIMINAR jornadas excedentes si se regresa a Solo Ida
    // Buscamos jornadas cuyo número en el nombre sea mayor al total de la primera vuelta
    const { data: jornadasParaBorrar, error: fetchErr } = await supabase
      .from('jornadas')
      .select('id, name')
      .eq('tournament_id', tournamentId);

    if (!fetchErr && jornadasParaBorrar) {
      const idsABorrar = jornadasParaBorrar
        .filter(j => {
          const numeroJornada = parseInt(j.name.replace('Jornada ', ''));
          return numeroJornada > baseJornadasCount;
        })
        .map(j => j.id);

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

export const iniciarTorneoService = async ({ 
  divisionName, season, startDate, config, jornadas 
}) => {
  try {
    const { data, error } = await supabase.rpc("crear_torneo_completo", {
      p_division: divisionName,
      p_season: season,
      p_start_date: startDate,
      p_config: config,
      p_jornadas: jornadas 
    });
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

export const guardarJornadaService = async (torneoId, jornadaData) => {
  try {
    if (!torneoId) throw new Error("ID de torneo no proporcionado");

    const { data: existingJornada, error: fetchError } = await supabase
      .from('jornadas')
      .select('id, status')
      .eq('tournament_id', torneoId)
      .eq('name', `Jornada ${jornadaData.id}`)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let jornadaId;
    if (existingJornada) {
      jornadaId = existingJornada.id;
    } else {
      const { data: newJornada, error: insertError } = await supabase
        .from('jornadas')
        .insert({
          tournament_id: torneoId,
          name: `Jornada ${jornadaData.id}`,
          status: 'Pendiente'
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      jornadaId = newJornada.id;
    }

    const formatMatchForDB = (m, status) => {
       const isRealId = m.id && !String(m.id).includes('-') && !isNaN(Number(m.id));
       const payload = {
          jornada_id: status === 'Programado' ? jornadaId : (m.jornada_id || jornadaId),
          team1_id: m.local.id,
          team2_id: m.visitante.id,
          status: status
       };

       if (status === 'Programado') {
          const fullDate = new Date(`${m.date}T${m.time}:00`);
          payload.date = fullDate.toISOString();
       } else {
          payload.date = m.date ? new Date(m.date).toISOString() : null; 
       }

       if (isRealId) payload.id = Number(m.id);
       return payload;
    };

    const scheduledPayloads = jornadaData.matches.map(m => formatMatchForDB(m, 'Programado'));
    const pendingPayloads = (jornadaData.pendingMatches || []).map(m => formatMatchForDB(m, 'Pendiente'));
    const allMatches = [...scheduledPayloads, ...pendingPayloads];

    const toUpdate = allMatches.filter(m => m.id);
    const toInsert = allMatches.filter(m => !m.id);

    if (toUpdate.length > 0) {
        const { error: upError } = await supabase.from('matches').upsert(toUpdate, { onConflict: 'id' });
        if (upError) throw upError;
    }

    if (toInsert.length > 0) {
        const { error: inError } = await supabase.from('matches').insert(toInsert);
        if (inError) throw inError;
    }

    const { error: confirmError } = await supabase
      .from('jornadas')
      .update({ status: 'Confirmada' })
      .eq('id', jornadaId);

    if (confirmError) throw confirmError;

    return { jornadaId };

  } catch (error) {
    console.error("Error en guardarJornadaService:", error.message);
    throw error; 
  }
};