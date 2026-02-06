import { supabase } from '../supabase/supabase.config';
import { TOURNAMENT_STATUS } from '../utils/constants';
import { addDaysToDate } from '../utils/dateUtils'; 

// --- SERVICIOS DE LECTURA (Queries) ---

export const getJornadas = async (tournamentId) => {
  const { data, error } = await supabase
    .from('jornadas')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('id', { ascending: true });

  if (error) throw error;
  return data;
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

// --- FUNCIÓN CORREGIDA Y BLINDADA ---
export const getPartidosExternosRango = async (startDate, endDate, currentTournamentId, leagueId) => {
    try {
        if (!startDate || !endDate || !currentTournamentId || !leagueId) return [];

        const { data, error } = await supabase
            .from('matches')
            .select(`
                id,
                date,
                status,
                team1:teams!team1_id ( name, logo_url ),
                team2:teams!team2_id ( name, logo_url ),
                jornadas!inner (
                    tournament_id,
                    tournaments!inner (
                        status, 
                        config, 
                        divisions!inner ( name, league_id )
                    )
                )
            `)
            .gte('date', `${startDate} 00:00:00`)
            .lte('date', `${endDate} 23:59:59`)
            .eq('jornadas.tournaments.divisions.league_id', leagueId)
            .neq('status', 'Pendiente') 
            .neq('status', 'Finalizado') 
            .neq('status', 'Cancelado')
            .order('date', { ascending: true });

        if (error) throw error;

        // FILTRO JS: Seguridad extra para eliminar partidos del mismo torneo si se colaron
        const matchesFiltrados = data.filter(m => {
            if (String(m.jornadas.tournament_id) === String(currentTournamentId)) return false;
            
            const statusTorneo = m.jornadas.tournaments.status;
            if (statusTorneo === 'Finalizado' || statusTorneo === 'Cancelado') return false;

            return true;
        });

        return matchesFiltrados.map(m => {
            // LECTURA DE FECHA/HORA EXACTA (Sin restar zona horaria)
            let datePart = "";
            let timePart = "00:00";

            if (m.date && typeof m.date === 'string') {
                const cleanDate = m.date.replace('Z', '').split('+')[0];
                if (cleanDate.includes('T')) {
                    const parts = cleanDate.split('T');
                    datePart = parts[0]; 
                    timePart = parts[1] ? parts[1].substring(0, 5) : '00:00';
                } else if (cleanDate.includes(' ')) {
                    const parts = cleanDate.split(' ');
                    datePart = parts[0];
                    timePart = parts[1] ? parts[1].substring(0, 5) : '00:00';
                } else {
                    datePart = cleanDate;
                }
            }

            return {
                id: `ext-${m.id}`,
                original_id: m.id, // <--- ESTO ES LO VITAL. EL ID REAL DE LA DB.
                rawDate: datePart,
                date: datePart, 
                time: timePart, 
                
                local: m.team1?.name || 'Por definir',
                visitante: m.team2?.name || 'Por definir',
                
                local_name: m.team1?.name || 'Por definir',
                visitante_name: m.team2?.name || 'Por definir',
                
                local_logo: m.team1?.logo_url,
                visitante_logo: m.team2?.logo_url,
                
                divisionName: m.jornadas?.tournaments?.divisions?.name || 'Otra División',
                division_name: m.jornadas?.tournaments?.divisions?.name || 'Otra División',
                config: m.jornadas?.tournaments?.config,
                status: m.status,
                isExternal: true
            };
        });

    } catch (error) {
        console.error("Error obteniendo partidos externos:", error);
        return [];
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
  const updates = { config: newConfig };
  if (newConfig.startDate) {
      updates.start_date = newConfig.startDate;
  }

  const { error: updateError } = await supabase
    .from('tournaments')
    .update(updates) 
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
}, fixtureGenerado) => {
  try {
    const { data: divisionData } = await supabase.from('divisions').select('id').eq('name', divisionName).single();
    if (!divisionData) throw new Error("División no encontrada");

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

    const jornadasToInsert = fixtureGenerado 
        ? fixtureGenerado.map((f, index) => {
            const fechaInicio = addDaysToDate(startDate, index * 7); 
            const fechaFin = addDaysToDate(fechaInicio, 6); 

            return { 
                tournament_id: torneo.id, 
                name: f.name, 
                status: 'Pendiente',
                start_date: fechaInicio,
                end_date: fechaFin 
            };
        })
        : jornadas.map((j, index) => {
            const fechaInicio = addDaysToDate(startDate, index * 7);
            const fechaFin = addDaysToDate(fechaInicio, 6);
            return { 
                tournament_id: torneo.id, 
                name: j.name, 
                status: 'Pendiente',
                start_date: fechaInicio,
                end_date: fechaFin 
            };
        });

    const { data: jornadasCreadas, error: jError } = await supabase
        .from('jornadas')
        .insert(jornadasToInsert)
        .select();

    if (jError) throw jError;

    if (fixtureGenerado && fixtureGenerado.length > 0) {
        let matchesToInsert = [];

        fixtureGenerado.forEach(jornadaData => {
            const jornadaDB = jornadasCreadas.find(j => j.name === jornadaData.name);
            if (!jornadaDB) return;

            jornadaData.matches.forEach(match => {
                if(match.local.id && match.local.id !== 'BYE') {
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

    const isTempIdHoy = String(matchHoy.id).includes('suggested') || String(matchHoy.id).includes('swap') || String(matchHoy.id).includes('generated');
    const isTempIdFuturo = String(matchFuturo.id).includes('suggested') || String(matchFuturo.id).includes('swap') || String(matchFuturo.id).includes('generated');

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

    const matchesToInsert = [];
    const matchesToUpdate = [];

    if (isTempIdFuturo) {
       matchesToInsert.push(payloadHoy);
    } else {
       payloadHoy.id = Number(matchFuturo.id);
       matchesToUpdate.push(payloadHoy);
    }

    if (isTempIdHoy) {
       matchesToInsert.push(payloadFuturo);
    } else {
       payloadFuturo.id = Number(matchHoy.id);
       matchesToUpdate.push(payloadFuturo);
    }

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

    const allMatchesToProcess = [
        ...jornadaData.matches.map(m => ({ ...m, finalStatus: 'Programado' })),
        ...(jornadaData.allPendingMatches || [])
            .filter(m => {
                const isTempId = !m.id || isNaN(Number(m.id));
                return m.isModified || isTempId;
            })
            .map(m => ({ ...m, finalStatus: 'Pendiente' }))
    ];

    allMatchesToProcess.forEach(m => {
        const payload = createMatchObject(m, m.finalStatus);
        const numericId = Number(m.id);
        const isRealId = m.id && !isNaN(numericId) && numericId > 0;

        if (isRealId) {
            payload.id = numericId;
            matchesToUpdate.push(payload);
        } else {
            delete payload.id; 
            matchesToInsert.push(payload);
        }
    });

    if (matchesToInsert.length > 0) {
        const { error: insertError } = await supabase.from('matches').insert(matchesToInsert);
        if (insertError) throw insertError;
    }

    if (matchesToUpdate.length > 0) {
        const { error: updateError } = await supabase.from('matches').upsert(matchesToUpdate);
        if (updateError) throw updateError;
    }

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

        const { data: jornadas, error: jError } = await supabase
            .from('jornadas')
            .select('id')
            .eq('tournament_id', tournamentId);
        
        if (jError) throw jError;

        const jornadaIds = jornadas.map(j => j.id);

        if (jornadaIds.length > 0) {
            const { data: matches, error: mError } = await supabase
                .from('matches')
                .select('id')
                .in('jornada_id', jornadaIds);

            if (mError) throw mError;
            
            const matchIds = matches.map(m => m.id);

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
        console.error("Error crítico eliminando torneo:", error);
        throw error;
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

export const updateMatchResultService = async (matchId, payload) => {
    const { error } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', matchId);
    
    if (error) throw error;
    return { success: true };
};