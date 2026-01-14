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
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ config: newConfig })
    .eq('id', tournamentId);

  if (updateError) throw updateError;

  if (newConfig.vueltas === "2") {
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

// NUEVA FUNCIÓN: Intercambio Inmediato
export const intercambiarPartidosService = async (torneoId, matchHoy, matchFuturo) => {
  try {
    const { data: jornadas } = await supabase
      .from('jornadas')
      .select('id, name')
      .eq('tournament_id', torneoId)
      .in('name', [matchHoy.originJornada, matchFuturo.originJornada]);

    const idJornadaHoy = jornadas.find(j => j.name === matchHoy.originJornada)?.id;
    const idJornadaFutura = jornadas.find(j => j.name === matchFuturo.originJornada)?.id;

    if (!idJornadaHoy || !idJornadaFutura) throw new Error("No se encontraron las jornadas");

    // 1. Preparamos el partido que viene del futuro hacia HOY
    const payloadHoy = {
      jornada_id: idJornadaHoy,
      team1_id: matchFuturo.local.id,
      team2_id: matchFuturo.visitante.id,
      status: matchHoy.status, // Hereda 'Programado' o 'Pendiente'
    };

    // Si el espacio de hoy estaba programado, asignamos esa fecha/hora exacta al nuevo partido
    if (matchHoy.status === 'Programado' && matchHoy.date) {
      payloadHoy.date = `${matchHoy.date} ${matchHoy.time || '10:00'}:00`;
    } else {
      payloadHoy.date = null;
    }

    // 2. Preparamos el partido que se va al FUTURO (queda pendiente y sin fecha para evitar colisiones)
    const payloadFuturo = {
      jornada_id: idJornadaFutura,
      team1_id: matchHoy.local.id,
      team2_id: matchHoy.visitante.id,
      status: 'Pendiente',
      date: null // Crucial: limpiar la fecha para liberar el horario en la DB
    };

    // 3. Mantenimiento de IDs para Upsert
    if (!String(matchHoy.id).includes('suggested') && !String(matchHoy.id).includes('swap')) {
      payloadFuturo.id = Number(matchHoy.id);
    }
    if (!String(matchFuturo.id).includes('suggested') && !String(matchFuturo.id).includes('swap')) {
      payloadHoy.id = Number(matchFuturo.id);
    }

    // Ejecutamos el intercambio en una sola instrucción upsert
    const { error } = await supabase.from('matches').upsert([payloadFuturo, payloadHoy]);
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error en intercambio:", error);
    throw error;
  }
};

export const guardarJornadaService = async (torneoId, jornadaData) => {
  try {
    if (!torneoId) throw new Error("ID de torneo no proporcionado");

    const { data: todasLasJornadas } = await supabase
      .from('jornadas')
      .select('id, name')
      .eq('tournament_id', torneoId);

    const jornadasMap = {};
    todasLasJornadas.forEach(j => { jornadasMap[j.name] = j.id; });

    const currentJornadaId = jornadasMap[`Jornada ${jornadaData.jornada_numero}`];
    if (!currentJornadaId) throw new Error("Jornada no encontrada");

    const formatMatchForDB = (m, status) => {
       const targetJornadaId = m.jornada_id || jornadasMap[m.originJornada] || currentJornadaId;
       const isRealId = m.id && !String(m.id).includes('suggested') && !String(m.id).includes('swap');
       
       const payload = {
          jornada_id: targetJornadaId,
          team1_id: Number(m.local.id),
          team2_id: Number(m.visitante.id),
          status: status
       };

       if (status === 'Programado') {
          const safeDate = (m.date && m.date.trim() !== "") ? m.date : new Date().toISOString().split('T')[0];
          payload.date = `${safeDate} ${m.time || "10:00"}:00`;
       } else {
          payload.date = null; // Pendientes siempre null
       }

       if (isRealId) payload.id = Number(m.id);
       return payload;
    };

    const scheduledPayloads = jornadaData.matches.map(m => formatMatchForDB(m, 'Programado'));
    const pendingPayloads = (jornadaData.allPendingMatches || [])
      .filter(m => m.isModified || (!String(m.id).includes('suggested') && !String(m.id).includes('swap')))
      .map(m => formatMatchForDB(m, 'Pendiente'));

    const allMatches = [...scheduledPayloads, ...pendingPayloads];

    if (allMatches.length > 0) {
        const { error: matchError } = await supabase.from('matches').upsert(allMatches);
        if (matchError) throw matchError;
    }

    await supabase.from('jornadas').update({ status: 'Confirmada' }).eq('id', currentJornadaId);

    return { success: true };
  } catch (error) {
    console.error("Error detallado en guardarJornadaService:", error);
    throw error; 
  }
};
