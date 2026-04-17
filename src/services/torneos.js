// src/services/torneos.js
import { supabase } from '../supabase/supabase.config';
import { TOURNAMENT_STATUS } from '../utils/constants';
import { addDaysToDate } from '../utils/dateUtils'; 
import { buildRepositionJornadaName } from '../utils/jornadaUtils';

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

export const getAllMatchesByTournament = async (tournamentId) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*, jornadas!inner(id, name, tournament_id)')
      .eq('jornadas.tournament_id', tournamentId);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error en getAllMatchesByTournament:", error);
    return [];
  }
};

export const getPartidosExternosRango = async (startDate, endDate, currentTournamentId, leagueId) => {
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

        const matchesFiltrados = data.filter(m => {
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

        return matchesFiltrados.map(m => {
            let datePart = "";
            let timePart = "00:00";

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
                rawDate: datePart, 
                date: datePart, 
                time: timePart, 
                
                local_name: m.team1?.name || 'Equipo Local',
                visitante_name: m.team2?.name || 'Equipo Visita',
                local_logo: m.team1?.logo_url,
                visitante_logo: m.team2?.logo_url,
                
                division_name: m.jornadas?.tournaments?.divisions?.name || 'Otra División',
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
  divisionId, divisionName, season, startDate, config, jornadas
}, fixtureGenerado) => {
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
      status: 'Programado', 
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
      .select('id, name, status, start_date, end_date')
      .eq('tournament_id', torneoId)
      .order('id', { ascending: true });

    const jornadasMap = {};
    todasLasJornadas.forEach(j => { jornadasMap[j.name] = j.id; });

    const repositionConfig = jornadaData.repositionConfig;
    const originalCurrentJornadaId =
      jornadaData.jornada_id ||
      jornadasMap[jornadaData.jornada_name] ||
      jornadasMap[`Jornada ${jornadaData.jornada_numero}`];

    if (!originalCurrentJornadaId) throw new Error("Jornada no encontrada en la BD");

    let confirmationJornadaId = originalCurrentJornadaId;
    let repositionJornadaData = null;
    let tournamentConfigCache = {};

    if (repositionConfig?.enabled) {
        const currentJornada = todasLasJornadas.find((jornada) => jornada.id === originalCurrentJornadaId);
        const repositionName = buildRepositionJornadaName({
            existingJornadas: todasLasJornadas,
        });

        const { data: insertedReposition, error: insertRepositionError } = await supabase
          .from('jornadas')
          .insert({
              tournament_id: torneoId,
              name: repositionName,
              status: 'Confirmada',
              start_date: repositionConfig.startDate,
              end_date: repositionConfig.endDate
          })
          .select()
          .single();

        if (insertRepositionError) throw insertRepositionError;
        confirmationJornadaId = insertedReposition.id;
        repositionJornadaData = insertedReposition;

        const { data: tournamentRow, error: tournamentError } = await supabase
          .from('tournaments')
          .select('config')
          .eq('id', torneoId)
          .single();

        if (tournamentError) throw tournamentError;

        const previousConfig =
          tournamentRow?.config && typeof tournamentRow.config === 'object'
            ? tournamentRow.config
            : {};
        tournamentConfigCache = previousConfig;

        const previousMappings = Array.isArray(previousConfig.repositionMappings)
          ? previousConfig.repositionMappings
          : [];

        const nextMappings = [
          ...previousMappings.filter(
            (mapping) =>
              String(mapping?.repositionJornadaId) !== String(insertedReposition.id)
          ),
          {
            repositionJornadaId: insertedReposition.id,
            repositionJornadaName: insertedReposition.name,
            originalJornadaId: originalCurrentJornadaId,
            originalJornadaName:
              currentJornada?.name ||
              jornadaData.jornada_name ||
              `Jornada ${jornadaData.jornada_numero}`,
          },
        ];

        const { error: configUpdateError } = await supabase
          .from('tournaments')
          .update({
            config: {
              ...previousConfig,
              repositionMappings: nextMappings,
            },
          })
          .eq('id', torneoId);

        if (configUpdateError) throw configUpdateError;
        tournamentConfigCache = {
          ...previousConfig,
          repositionMappings: nextMappings,
        };
    }

    const matchesToInsert = [];
    const matchesToUpdate = [];
    const repositionMatchMappings = [];
    const repositionInsertMetas = [];

    // --- FUNCIÓN UNIFICADA PARA PROCESAR PARTIDOS ---
    const procesarPartido = (m, forcedJornadaId = null) => {
        const originName = m.jornadas?.name || m.originJornada;
        const originJornadaId = m.originJornadaId || jornadasMap[originName] || null;
        const targetJornadaId = forcedJornadaId || m.jornada_id || jornadasMap[originName] || confirmationJornadaId;
        const t2Id = (m.visitante && m.visitante.id && m.visitante.id !== 'BYE') ? Number(m.visitante.id) : null;
        const t1Id = (m.local && m.local.id) ? Number(m.local.id) : null;

        let finalStatus = m.status || 'Programado';
        let finalDate = null;
        let finalGoals1 = m.goals1;
        let finalGoals2 = m.goals2;
        let finalObs = m.observations;

        // Procesamos la resolución primero (tiene prioridad si existe y se definió desde el modal)
        if (m.resolution && m.resolution.type === 'default') {
            finalStatus = 'Finalizado';
            finalGoals1 = m.resolution.goals1;
            finalGoals2 = m.resolution.goals2;
            finalObs = 'Victoria por default';
            finalDate = null; // AQUI ASEGURAMOS QUE SEA NULL SIEMPRE
        } else if (m.resolution && m.resolution.type === 'pendiente') {
            finalStatus = 'Pendiente';
            finalDate = null;
        } else {
            // Comportamiento normal si no hay resolución pendiente
            if (m.date && m.date.trim() !== "") {
                finalDate = `${m.date} ${m.time || "10:00"}:00`;
            } else if (finalStatus === 'Finalizado' && finalObs === 'Victoria por default') {
                finalDate = null; // Si ya estaba guardado como default, se mantiene null
            } else if (finalStatus === 'Programado') {
                const safeDate = new Date().toISOString().split('T')[0];
                finalDate = `${safeDate} ${m.time || "10:00"}:00`;
            }
        }

        const payload = {
            jornada_id: targetJornadaId,
            team1_id: t1Id,
            team2_id: t2Id,
            status: finalStatus,
            date: finalDate
        };
        
        if (finalGoals1 !== undefined) payload.goals1 = finalGoals1;
        if (finalGoals2 !== undefined) payload.goals2 = finalGoals2;
        if (finalObs !== undefined) payload.observations = finalObs;

        const numericId = Number(m.id);
        if (m.id && !isNaN(numericId) && numericId > 0 && !String(m.id).startsWith('temp')) {
            payload.id = numericId;
            matchesToUpdate.push(payload);
            if (repositionConfig?.enabled && targetJornadaId === confirmationJornadaId) {
                repositionMatchMappings.push({
                    matchId: numericId,
                    originalJornadaId: originJornadaId || originalCurrentJornadaId,
                    originalJornadaName:
                      originName ||
                      jornadaData.jornada_name ||
                      `Jornada ${jornadaData.jornada_numero}`,
                });
            }
        } else {
            matchesToInsert.push(payload);
            if (repositionConfig?.enabled && targetJornadaId === confirmationJornadaId) {
                repositionInsertMetas.push({
                    originalJornadaId: originJornadaId || originalCurrentJornadaId,
                    originalJornadaName:
                      originName ||
                      jornadaData.jornada_name ||
                      `Jornada ${jornadaData.jornada_numero}`,
                });
            }
        }
    };

    // Aplicar la función a ambos grupos para que sigan las mismas reglas
    (jornadaData.matches || []).forEach((match) => procesarPartido(match, confirmationJornadaId));

    (jornadaData.allPendingMatches || []).forEach(m => {
         const originName = m.jornadas?.name || m.originJornada;
         const targetJornadaId = m.jornada_id || jornadasMap[originName] || originalCurrentJornadaId;
         // Solo guardamos los pendientes que pertenezcan a la jornada que se está confirmando
         if (targetJornadaId === originalCurrentJornadaId && !repositionConfig?.enabled) {
             procesarPartido(m);
         }
    });

    if (matchesToInsert.length > 0) {
        const { data: insertedMatches, error: insertError } = await supabase
          .from('matches')
          .insert(matchesToInsert)
          .select('id');
        if (insertError) throw insertError;

        if (repositionConfig?.enabled && repositionInsertMetas.length > 0) {
            insertedMatches?.forEach((insertedMatch, index) => {
                const meta = repositionInsertMetas[index];
                if (!meta?.originalJornadaId) return;

                repositionMatchMappings.push({
                    matchId: insertedMatch.id,
                    originalJornadaId: meta.originalJornadaId,
                    originalJornadaName: meta.originalJornadaName,
                });
            });
        }
    }

    if (matchesToUpdate.length > 0) {
        const { error: updateError } = await supabase.from('matches').upsert(matchesToUpdate);
        if (updateError) throw updateError;
    }

    if (!repositionConfig?.enabled) {
        const { error: jornadaError } = await supabase
          .from('jornadas')
          .update({ status: 'Confirmada' })
          .eq('id', originalCurrentJornadaId);

        if (jornadaError) throw jornadaError;
    }

    if (repositionConfig?.enabled && Array.isArray(repositionConfig.futureJornadaPreview)) {
        const futureDateUpdates = repositionConfig.futureJornadaPreview
          .filter(j => j?.id)
          .map(j => ({
              id: j.id,
              tournament_id: torneoId,
              name: j.name,
              start_date: j.start_date,
              end_date: j.end_date
          }));

        if (futureDateUpdates.length > 0) {
            const { error: futureDatesError } = await supabase
              .from('jornadas')
              .upsert(futureDateUpdates, { onConflict: 'id' });

            if (futureDatesError) throw futureDatesError;
        }
    }

    if (repositionConfig?.enabled && repositionJornadaData && repositionMatchMappings.length > 0) {
        const previousMatchMappings = Array.isArray(tournamentConfigCache.repositionMatchMappings)
          ? tournamentConfigCache.repositionMatchMappings
          : [];

        const nextMatchMappings = [
          ...previousMatchMappings.filter(
            (mapping) =>
              !repositionMatchMappings.some(
                (newMapping) => String(newMapping.matchId) === String(mapping?.matchId)
              )
          ),
          ...repositionMatchMappings.map((mapping) => ({
            matchId: mapping.matchId,
            repositionJornadaId: repositionJornadaData.id,
            repositionJornadaName: repositionJornadaData.name,
            originalJornadaId: mapping.originalJornadaId,
            originalJornadaName: mapping.originalJornadaName,
          })),
        ];

        const { error: matchMappingsError } = await supabase
          .from('tournaments')
          .update({
            config: {
              ...tournamentConfigCache,
              repositionMappings: Array.isArray(tournamentConfigCache.repositionMappings)
                ? tournamentConfigCache.repositionMappings
                : [],
              repositionMatchMappings: nextMatchMappings,
            },
          })
          .eq('id', torneoId);

        if (matchMappingsError) throw matchMappingsError;
    }

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
