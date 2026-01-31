import { supabase } from '../supabase/supabase.config';
import { TOURNAMENT_STATUS } from '../utils/constants';

// --- SERVICIOS DE LECTURA (Queries) ---

export const getTorneoActivo = async (divisionId) => {
  try {
    // MODIFICADO: Agregamos 'jornadas(name, status)' al select.
    // Esto permite al frontend saber si la Jornada 1 está confirmada.
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, jornadas(name, status)')
      .eq('division_id', divisionId)
      .in('status', [TOURNAMENT_STATUS.ACTIVE, TOURNAMENT_STATUS.ONGOING])
      .order('id', { ascending: false }) 
      .limit(1)
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
  if (list.length % 2 !== 0) list.push({ id: null }); 
  
  const rounds = [];
  const totalRounds = list.length - 1;

  for (let i = 0; i < totalRounds; i++) {
    const round = [];
    for (let j = 0; j < list.length / 2; j++) {
      const t1 = list[j];
      const t2 = list[list.length - 1 - j];
      
      // Permitimos cruces con placeholder
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
  
  // Preparamos el objeto de actualización
  const updates = {
      config: newConfig
  };

  // Si viene la fecha en la config, actualizamos TAMBIÉN la columna raíz 'start_date'
  if (newConfig.startDate) {
      updates.start_date = newConfig.startDate;
  }

  const { error: updateError } = await supabase
    .from('tournaments')
    .update(updates) // Enviamos start_date y config
    .eq('id', tournamentId);

  if (updateError) throw updateError;

  // Lógica de Vueltas (Mantenemos igual)
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

    // 2. Determinar Jornadas
    const jornadasToInsert = fixtureGenerado 
        ? fixtureGenerado.map(f => ({ tournament_id: torneo.id, name: f.name, status: 'Pendiente' }))
        : jornadas.map(j => ({ tournament_id: torneo.id, name: j.name, status: 'Pendiente' }));

    const { data: jornadasCreadas, error: jError } = await supabase
        .from('jornadas')
        .insert(jornadasToInsert)
        .select();

    if (jError) throw jError;

    // 3. Insertar Partidos (Sólo inserts aquí, no hay updates)
    if (fixtureGenerado && fixtureGenerado.length > 0) {
        let matchesToInsert = [];

        fixtureGenerado.forEach(jornadaData => {
            const jornadaDB = jornadasCreadas.find(j => j.name === jornadaData.name);
            if (!jornadaDB) return;

            jornadaData.matches.forEach(match => {
                // Verificar IDs validos
                if(match.local.id && match.local.id !== 'BYE') {
                    // Si el visitante es 'BYE', guardamos null
                    const team2Id = (match.visitante.id && match.visitante.id !== 'BYE') ? match.visitante.id : null;
                    
                    matchesToInsert.push({
                        jornada_id: jornadaDB.id,
                        team1_id: match.local.id,
                        team2_id: team2Id,
                        status: 'Programado', 
                        date: null 
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

    const getTeamId = (team) => (team && team.id && team.id !== 'BYE') ? team.id : null;

    // Detectar si son IDs reales o temporales
    const isTempIdHoy = String(matchHoy.id).includes('suggested') || String(matchHoy.id).includes('swap') || String(matchHoy.id).includes('generated');
    const isTempIdFuturo = String(matchFuturo.id).includes('suggested') || String(matchFuturo.id).includes('swap') || String(matchFuturo.id).includes('generated');

    // Preparar payloads
    const payloadHoy = {
      jornada_id: idJornadaHoy,
      team1_id: getTeamId(matchFuturo.local),
      team2_id: getTeamId(matchFuturo.visitante),
      status: matchHoy.status, 
    };

    if (matchHoy.status === 'Programado' && matchHoy.date) {
      payloadHoy.date = `${matchHoy.date} ${matchHoy.time || '10:00'}:00`;
    } else {
      payloadHoy.date = null;
    }

    const payloadFuturo = {
      jornada_id: idJornadaFutura,
      team1_id: getTeamId(matchHoy.local),
      team2_id: getTeamId(matchHoy.visitante),
      status: 'Pendiente',
      date: null 
    };

    // Estrategia de Guardado Separado
    const matchesToInsert = [];
    const matchesToUpdate = [];

    // Lógica para Match Futuro -> Hoy
    if (isTempIdFuturo) {
       matchesToInsert.push(payloadHoy);
    } else {
       payloadHoy.id = Number(matchFuturo.id);
       matchesToUpdate.push(payloadHoy);
    }

    // Lógica para Match Hoy -> Futuro
    if (isTempIdHoy) {
       matchesToInsert.push(payloadFuturo);
    } else {
       payloadFuturo.id = Number(matchHoy.id);
       matchesToUpdate.push(payloadFuturo);
    }

    // Ejecutar operaciones
    if (matchesToInsert.length > 0) {
        const { error: iError } = await supabase.from('matches').insert(matchesToInsert);
        if (iError) throw iError;
    }
    if (matchesToUpdate.length > 0) {
        const { error: uError } = await supabase.from('matches').upsert(matchesToUpdate);
        if (uError) throw uError;
    }
    
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
    if (!currentJornadaId) throw new Error("Jornada no encontrada en la BD");

    const createMatchObject = (m, status) => {
       const targetJornadaId = m.jornada_id || jornadasMap[m.originJornada] || currentJornadaId;
       const t2Id = (m.visitante && m.visitante.id && m.visitante.id !== 'BYE') ? Number(m.visitante.id) : null;
       const t1Id = (m.local && m.local.id) ? Number(m.local.id) : null;

       const payload = {
          jornada_id: targetJornadaId,
          team1_id: t1Id,
          team2_id: t2Id,
          status: status
       };

       if (status === 'Programado') {
          const safeDate = (m.date && m.date.trim() !== "") ? m.date : new Date().toISOString().split('T')[0];
          payload.date = `${safeDate} ${m.time || "10:00"}:00`;
       } else {
          payload.date = null; 
       }
       return payload;
    };

    const matchesToInsert = [];
    const matchesToUpdate = [];

    // Combinamos y aseguramos que 'allPendingMatches' sea un array
    const allMatchesToProcess = [
        ...jornadaData.matches.map(m => ({ ...m, finalStatus: 'Programado' })),
        ...(jornadaData.allPendingMatches || [])
            .filter(m => {
                // Filtramos pendientes que han sido modificados o son nuevos (temporales)
                const isTempId = !m.id || isNaN(Number(m.id));
                return m.isModified || isTempId;
            })
            .map(m => ({ ...m, finalStatus: 'Pendiente' }))
    ];

    allMatchesToProcess.forEach(m => {
        const payload = createMatchObject(m, m.finalStatus);

        // VERIFICACIÓN ROBUSTA DE ID
        // Si tiene ID y es un número válido, es una ACTUALIZACIÓN.
        // Si el ID es string (ej: "temp_1", "bye-0-2") o null, es una INSERCIÓN.
        const numericId = Number(m.id);
        const isRealId = m.id && !isNaN(numericId) && numericId > 0;

        if (isRealId) {
            payload.id = numericId;
            matchesToUpdate.push(payload);
        } else {
            // Aseguramos que NO vaya el campo ID para que Postgres genere uno nuevo
            delete payload.id; 
            matchesToInsert.push(payload);
        }
    });

    console.log("Guardando Jornada -> Insertar:", matchesToInsert.length, "Actualizar:", matchesToUpdate.length);

    // 1. Ejecutar Inserts
    if (matchesToInsert.length > 0) {
        const { error: insertError } = await supabase.from('matches').insert(matchesToInsert);
        if (insertError) throw insertError;
    }

    // 2. Ejecutar Upserts
    if (matchesToUpdate.length > 0) {
        const { error: updateError } = await supabase.from('matches').upsert(matchesToUpdate);
        if (updateError) throw updateError;
    }

    // 3. Confirmar jornada
    await supabase.from('jornadas').update({ status: 'Confirmada' }).eq('id', currentJornadaId);

    return { success: true };
  } catch (error) {
    console.error("Error detallado en guardarJornadaService:", error);
    throw error; 
  }
};

export const eliminarTorneoService = async (tournamentId) => {
    try {
        if (!tournamentId) throw new Error("ID de torneo inválido");

        // 1. Obtener todas las jornadas del torneo
        const { data: jornadas, error: jError } = await supabase
            .from('jornadas')
            .select('id')
            .eq('tournament_id', tournamentId);
        
        if (jError) throw jError;

        const jornadaIds = jornadas.map(j => j.id);

        if (jornadaIds.length > 0) {
            // 2. Obtener todos los partidos de esas jornadas
            const { data: matches, error: mError } = await supabase
                .from('matches')
                .select('id')
                .in('jornada_id', jornadaIds);

            if (mError) throw mError;
            
            const matchIds = matches.map(m => m.id);

            // 3. Borrar Eventos de Partido (Match Events)
            if (matchIds.length > 0) {
                const { error: meError } = await supabase
                    .from('match_events')
                    .delete()
                    .in('match_id', matchIds);
                if (meError) throw meError;

                // 4. Borrar Partidos (Matches)
                const { error: delMatchesErr } = await supabase
                    .from('matches')
                    .delete()
                    .in('jornada_id', jornadaIds);
                if (delMatchesErr) throw delMatchesErr;
            }

            // 5. Borrar Jornadas
            const { error: delJornadasErr } = await supabase
                .from('jornadas')
                .delete()
                .eq('tournament_id', tournamentId); // Más seguro usar el ID del torneo directo o los IDs
            if (delJornadasErr) throw delJornadasErr;
        }

        // 6. Finalmente, borrar el Torneo
        const { error: tError } = await supabase
            .from('tournaments')
            .delete()
            .eq('id', tournamentId);
            
        if (tError) throw tError;

        return { success: true };

    } catch (error) {
        console.error("Error crítico eliminando torneo:", error);
        throw error;
    }
};