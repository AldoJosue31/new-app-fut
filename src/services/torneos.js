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
  // Si es impar, añadimos un placeholder (null o objeto dummy) para control interno
  if (list.length % 2 !== 0) list.push({ id: null }); 
  
  const rounds = [];
  const totalRounds = list.length - 1;

  for (let i = 0; i < totalRounds; i++) {
    const round = [];
    for (let j = 0; j < list.length / 2; j++) {
      const t1 = list[j];
      const t2 = list[list.length - 1 - j];
      // Nota: Si t1 o t2 es el placeholder, se genera el partido igualmente aquí
      // para que el Modal pueda mostrar "Descansa". El modal filtrará 'BYE' antes de guardar.
      if (t1.id || t2.id) { 
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

/**
 * Crea el torneo, las jornadas y los partidos generados en el preview.
 */
export const iniciarTorneoService = async ({ 
  divisionName, season, startDate, config, jornadas 
}, fixtureGenerado) => {
  try {
    const { data: divisionData } = await supabase.from('divisions').select('id').eq('name', divisionName).single();
    if (!divisionData) throw new Error("División no encontrada");

    // 1. Crear Torneo
    const { data: torneo, error: tError } = await supabase
        .from('tournaments')
        .insert({
            division_id: divisionData.id,
            season: season,
            start_date: startDate,
            config: config,
            status: TOURNAMENT_STATUS.ACTIVE
        })
        .select()
        .single();
    
    if (tError) throw tError;

    // 2. Determinar Jornadas a insertar
    // Si viene fixtureGenerado (manual), usamos sus nombres. Si no, los genéricos.
    const jornadasToInsert = fixtureGenerado 
        ? fixtureGenerado.map(f => ({ tournament_id: torneo.id, name: f.name, status: 'Pendiente' }))
        : jornadas.map(j => ({ tournament_id: torneo.id, name: j.name, status: 'Pendiente' }));

    const { data: jornadasCreadas, error: jError } = await supabase
        .from('jornadas')
        .insert(jornadasToInsert)
        .select();

    if (jError) throw jError;

    // 3. Insertar Partidos
    if (fixtureGenerado && fixtureGenerado.length > 0) {
        let matchesToInsert = [];

        fixtureGenerado.forEach(jornadaData => {
            const jornadaDB = jornadasCreadas.find(j => j.name === jornadaData.name);
            if (!jornadaDB) return;

            jornadaData.matches.forEach(match => {
                // Verificar IDs validos (que no sean BYE ni undefined)
                if(match.local.id && match.visitante.id && match.local.id !== 'BYE' && match.visitante.id !== 'BYE') {
                    matchesToInsert.push({
                        jornada_id: jornadaDB.id,
                        team1_id: match.local.id,
                        team2_id: match.visitante.id,
                        status: 'Programado', 
                        date: null // Sin fecha = Pendiente en UI (Sidebar)
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
    console.error("Error en iniciarTorneoService:", error);
    throw error;
  }
};

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

    // 1. Partido Futuro -> Hoy
    const payloadHoy = {
      jornada_id: idJornadaHoy,
      team1_id: matchFuturo.local.id,
      team2_id: matchFuturo.visitante.id,
      status: matchHoy.status, 
    };

    if (matchHoy.status === 'Programado' && matchHoy.date) {
      payloadHoy.date = `${matchHoy.date} ${matchHoy.time || '10:00'}:00`;
    } else {
      payloadHoy.date = null;
    }

    // 2. Partido Hoy -> Futuro
    const payloadFuturo = {
      jornada_id: idJornadaFutura,
      team1_id: matchHoy.local.id,
      team2_id: matchHoy.visitante.id,
      status: 'Pendiente',
      date: null 
    };

    // Mantenimiento de IDs
    if (!String(matchHoy.id).includes('suggested') && !String(matchHoy.id).includes('swap')) {
      payloadFuturo.id = Number(matchHoy.id);
    }
    if (!String(matchFuturo.id).includes('suggested') && !String(matchFuturo.id).includes('swap')) {
      payloadHoy.id = Number(matchFuturo.id);
    }

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
          payload.date = null; 
       }

       if (isRealId) payload.id = Number(m.id);
       return payload;
    };

    const scheduledPayloads = jornadaData.matches.map(m => formatMatchForDB(m, 'Programado'));
    
    // AQUÍ: Si están en la lista de pendientes (Sidebar), los guardamos como Pendientes (o como Programado sin fecha si prefieres)
    // El comportamiento estándar es que si está en Sidebar -> es Pendiente. 
    // Si quieres que siga siendo Programado, cámbialo aquí, pero la UI lo detecta por "sin fecha".
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