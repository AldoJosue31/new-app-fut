import {
  addDaysToDate,
  buildRepositionJornadaName,
  supabase,
  TOURNAMENT_STATUS,
} from './shared';

export const generarFixture = (equipos) => {
  const list = [...equipos];
  if (list.length % 2 !== 0) {
    list.push({ id: null });
  }

  const rounds = [];
  const totalRounds = list.length - 1;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const round = [];

    for (let index = 0; index < list.length / 2; index += 1) {
      const homeTeam = list[index];
      const awayTeam = list[list.length - 1 - index];

      if (homeTeam.id || awayTeam.id) {
        round.push({ home: homeTeam.id, away: awayTeam.id });
      }
    }

    rounds.push(round);
    list.splice(1, 0, list.pop());
  }

  return rounds;
};

const hasStoredScoreValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

const hasStoredMatchResult = (match) =>
  match?.status === 'Finalizado' ||
  (hasStoredScoreValue(match?.goals1) && hasStoredScoreValue(match?.goals2));

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

    if (!divisionData) throw new Error('Division no encontrada');

    const { data: torneo, error: tournamentError } = await supabase
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

    if (tournamentError) throw tournamentError;

    const jornadaDurationDays = Math.max(1, parseInt(config?.jornadaDurationDays, 10) || 7);
    const jornadasToInsert = fixtureGenerado
      ? fixtureGenerado.map((fixtureItem, index) => {
          const fechaInicio = addDaysToDate(startDate, index * jornadaDurationDays);
          const fechaFin = addDaysToDate(fechaInicio, jornadaDurationDays - 1);

          return {
            tournament_id: torneo.id,
            name: fixtureItem.name,
            status: 'Pendiente',
            start_date: fechaInicio,
            end_date: fechaFin,
          };
        })
      : (jornadas || []).map((jornada, index) => {
          const fechaInicio = addDaysToDate(startDate, index * jornadaDurationDays);
          const fechaFin = addDaysToDate(fechaInicio, jornadaDurationDays - 1);

          return {
            tournament_id: torneo.id,
            name: jornada.name,
            status: 'Pendiente',
            start_date: fechaInicio,
            end_date: fechaFin,
          };
        });

    const { data: jornadasCreadas, error: jornadasError } = await supabase
      .from('jornadas')
      .insert(jornadasToInsert)
      .select();

    if (jornadasError) throw jornadasError;

    if (fixtureGenerado && fixtureGenerado.length > 0) {
      const matchesToInsert = [];

      fixtureGenerado.forEach((jornadaData) => {
        const jornadaDB = (jornadasCreadas || []).find(
          (jornada) => jornada.name === jornadaData.name
        );
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
        const { error: matchesError } = await supabase
          .from('matches')
          .insert(matchesToInsert);
        if (matchesError) throw matchesError;
      }
    }

    return torneo;
  } catch (error) {
    console.error('Error en iniciarTorneoService:', error);
    throw error;
  }
};

export const intercambiarPartidosService = async (
  torneoId,
  matchHoy,
  matchFuturo
) => {
  try {
    const { data: jornadas, error: jornadasError } = await supabase
      .from('jornadas')
      .select('id, name')
      .eq('tournament_id', torneoId)
      .in('name', [matchHoy.originJornada, matchFuturo.originJornada]);

    if (jornadasError) throw jornadasError;

    const idJornadaHoy = (jornadas || []).find(
      (jornada) => jornada.name === matchHoy.originJornada
    )?.id;
    const idJornadaFutura = (jornadas || []).find(
      (jornada) => jornada.name === matchFuturo.originJornada
    )?.id;

    if (!idJornadaHoy || !idJornadaFutura) {
      throw new Error('No se encontraron las jornadas');
    }

    const getTeamId = (team) =>
      team && team.id && team.id !== 'BYE' ? team.id : null;

    const isTempIdHoy =
      String(matchHoy.id).includes('suggested') ||
      String(matchHoy.id).includes('swap') ||
      String(matchHoy.id).includes('generated');
    const isTempIdFuturo =
      String(matchFuturo.id).includes('suggested') ||
      String(matchFuturo.id).includes('swap') ||
      String(matchFuturo.id).includes('generated');

    const payloadHoy = {
      jornada_id: idJornadaHoy,
      team1_id: getTeamId(matchFuturo.local),
      team2_id: getTeamId(matchFuturo.visitante),
      status: matchHoy.status,
      date:
        matchHoy.status === 'Programado' && matchHoy.date
          ? `${matchHoy.date} ${matchHoy.time || '10:00'}:00`
          : null,
    };

    const payloadFuturo = {
      jornada_id: idJornadaFutura,
      team1_id: getTeamId(matchHoy.local),
      team2_id: getTeamId(matchHoy.visitante),
      status: 'Programado',
      date: null,
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
      const { error: insertError } = await supabase
        .from('matches')
        .insert(matchesToInsert);
      if (insertError) throw insertError;
    }

    if (matchesToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('matches')
        .upsert(matchesToUpdate);
      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error en intercambio:', error);
    throw error;
  }
};

export const guardarJornadaService = async (torneoId, jornadaData) => {
  try {
    if (!torneoId) throw new Error('ID de torneo no proporcionado');

    const { data: todasLasJornadas, error: jornadasError } = await supabase
      .from('jornadas')
      .select('id, name, status, start_date, end_date')
      .eq('tournament_id', torneoId)
      .order('id', { ascending: true });

    if (jornadasError) throw jornadasError;

    const jornadasMap = {};
    (todasLasJornadas || []).forEach((jornada) => {
      jornadasMap[jornada.name] = jornada.id;
    });

    const repositionConfig = jornadaData.repositionConfig;
    const originalCurrentJornadaId =
      jornadaData.jornada_id ||
      jornadasMap[jornadaData.jornada_name] ||
      jornadasMap[`Jornada ${jornadaData.jornada_numero}`];

    if (!originalCurrentJornadaId) {
      throw new Error('Jornada no encontrada en la BD');
    }

    let confirmationJornadaId = originalCurrentJornadaId;
    let repositionJornadaData = null;
    let tournamentConfigCache = {};

    if (repositionConfig?.enabled) {
      const currentJornada = (todasLasJornadas || []).find(
        (jornada) => jornada.id === originalCurrentJornadaId
      );
      const repositionName = buildRepositionJornadaName({
        existingJornadas: todasLasJornadas,
      });

      const { data: insertedReposition, error: insertRepositionError } =
        await supabase
          .from('jornadas')
          .insert({
            tournament_id: torneoId,
            name: repositionName,
            status: 'Confirmada',
            start_date: repositionConfig.startDate,
            end_date: repositionConfig.endDate,
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

    const procesarPartido = (match, forcedJornadaId = null) => {
      const originName = match.jornadas?.name || match.originJornada;
      const originJornadaId =
        match.originJornadaId || jornadasMap[originName] || null;
      const targetJornadaId =
        forcedJornadaId ||
        match.jornada_id ||
        jornadasMap[originName] ||
        confirmationJornadaId;
      const team2Id =
        match.visitante && match.visitante.id && match.visitante.id !== 'BYE'
          ? Number(match.visitante.id)
          : null;
      const team1Id =
        match.local && match.local.id ? Number(match.local.id) : null;

      let finalStatus = match.status || 'Programado';
      let finalDate = null;
      let finalGoals1 = match.goals1;
      let finalGoals2 = match.goals2;
      let finalObservations = match.observations;

      if (match.resolution?.type === 'default') {
        finalStatus = 'Finalizado';
        finalGoals1 = match.resolution.goals1;
        finalGoals2 = match.resolution.goals2;
        finalObservations = 'Victoria por default';
      } else if (match.resolution?.type === 'pendiente') {
        finalStatus = 'Pendiente';
      } else if (match.date && match.date.trim() !== '') {
        finalDate = `${match.date} ${match.time || '10:00'}:00`;
      } else if (
        finalStatus === 'Finalizado' &&
        finalObservations === 'Victoria por default'
      ) {
        finalDate = null;
      } else if (finalStatus === 'Programado') {
        const safeDate = new Date().toISOString().split('T')[0];
        finalDate = `${safeDate} ${match.time || '10:00'}:00`;
      }

      const hasCompleteScore =
        hasStoredScoreValue(finalGoals1) && hasStoredScoreValue(finalGoals2);
      const hasDefaultResolution = match.resolution?.type === 'default';

      // Evita volver a guardar como finalizado un estado local obsoleto
      // despues de deshacer el resultado del partido.
      if (finalStatus === 'Finalizado' && !hasCompleteScore && !hasDefaultResolution) {
        finalStatus = match.date && match.date.trim() !== '' ? 'Programado' : 'Pendiente';
      }

      const payload = {
        jornada_id: targetJornadaId,
        team1_id: team1Id,
        team2_id: team2Id,
        status: finalStatus,
        date: finalDate,
      };

      if (finalGoals1 !== undefined) payload.goals1 = finalGoals1;
      if (finalGoals2 !== undefined) payload.goals2 = finalGoals2;
      if (finalObservations !== undefined) {
        payload.observations = finalObservations;
      }

      const numericId = Number(match.id);
      if (
        match.id &&
        !Number.isNaN(numericId) &&
        numericId > 0 &&
        !String(match.id).startsWith('temp')
      ) {
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

    (jornadaData.matches || []).forEach((match) =>
      procesarPartido(match, confirmationJornadaId)
    );

    (jornadaData.allPendingMatches || []).forEach((match) => {
      const originName = match.jornadas?.name || match.originJornada;
      const targetJornadaId =
        match.jornada_id || jornadasMap[originName] || originalCurrentJornadaId;

      if (targetJornadaId === originalCurrentJornadaId && !repositionConfig?.enabled) {
        procesarPartido(match);
      }
    });

    if (matchesToInsert.length > 0) {
      const { data: insertedMatches, error: insertError } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select('id');
      if (insertError) throw insertError;

      if (repositionConfig?.enabled && repositionInsertMetas.length > 0) {
        (insertedMatches || []).forEach((insertedMatch, index) => {
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
      const { error: updateError } = await supabase
        .from('matches')
        .upsert(matchesToUpdate);
      if (updateError) throw updateError;
    }

    if (!repositionConfig?.enabled) {
      const { error: jornadaError } = await supabase
        .from('jornadas')
        .update({ status: 'Confirmada' })
        .eq('id', originalCurrentJornadaId);

      if (jornadaError) throw jornadaError;
    }

    if (
      repositionConfig?.enabled &&
      Array.isArray(repositionConfig.futureJornadaPreview)
    ) {
      const futureDateUpdates = repositionConfig.futureJornadaPreview
        .filter((jornada) => jornada?.id)
        .map((jornada) => ({
          id: jornada.id,
          tournament_id: torneoId,
          name: jornada.name,
          start_date: jornada.start_date,
          end_date: jornada.end_date,
        }));

      if (futureDateUpdates.length > 0) {
        const { error: futureDatesError } = await supabase
          .from('jornadas')
          .upsert(futureDateUpdates, { onConflict: 'id' });

        if (futureDatesError) throw futureDatesError;
      }
    }

    if (
      repositionConfig?.enabled &&
      repositionJornadaData &&
      repositionMatchMappings.length > 0
    ) {
      const previousMatchMappings = Array.isArray(
        tournamentConfigCache.repositionMatchMappings
      )
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
    console.error('Error detallado en guardarJornadaService:', error);
    throw error;
  }
};

export const desconfirmarJornadaService = async (torneoId, jornadaId) => {
  if (!torneoId) throw new Error('ID de torneo no proporcionado');
  if (!jornadaId) throw new Error('ID de jornada no proporcionado');

  const { data: jornada, error: jornadaError } = await supabase
    .from('jornadas')
    .select('id, status')
    .eq('id', jornadaId)
    .eq('tournament_id', torneoId)
    .single();

  if (jornadaError) throw jornadaError;
  if (!jornada) throw new Error('Jornada no encontrada en la BD');
  if (jornada.status !== 'Confirmada') {
    throw new Error('Solo se puede deshacer una jornada confirmada');
  }

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, status, goals1, goals2')
    .eq('jornada_id', jornadaId);

  if (matchesError) throw matchesError;

  const hasFinishedMatch = (matches || []).some(hasStoredMatchResult);

  if (hasFinishedMatch) {
    throw new Error('No se puede deshacer: la jornada ya tiene resultados');
  }

  const { error: updateError } = await supabase
    .from('jornadas')
    .update({ status: 'Pendiente' })
    .eq('id', jornadaId)
    .eq('tournament_id', torneoId);

  if (updateError) throw updateError;

  return { success: true };
};

export const eliminarTorneoService = async (tournamentId) => {
  try {
    if (!tournamentId) throw new Error('ID de torneo invalido');

    const { data: jornadas, error: jornadasError } = await supabase
      .from('jornadas')
      .select('id')
      .eq('tournament_id', tournamentId);

    if (jornadasError) throw jornadasError;

    const jornadaIds = (jornadas || []).map((jornada) => jornada.id);

    if (jornadaIds.length > 0) {
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id')
        .in('jornada_id', jornadaIds);

      if (matchesError) throw matchesError;

      const matchIds = (matches || []).map((match) => match.id);

      if (matchIds.length > 0) {
        const { error: eventsError } = await supabase
          .from('match_events')
          .delete()
          .in('match_id', matchIds);
        if (eventsError) throw eventsError;

        const { error: deleteMatchesError } = await supabase
          .from('matches')
          .delete()
          .in('jornada_id', jornadaIds);
        if (deleteMatchesError) throw deleteMatchesError;
      }

      const { error: deleteJornadasError } = await supabase
        .from('jornadas')
        .delete()
        .eq('tournament_id', tournamentId);
      if (deleteJornadasError) throw deleteJornadasError;
    }

    const { error: tournamentError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (tournamentError) throw tournamentError;

    return { success: true };
  } catch (error) {
    console.error('Error critico eliminando torneo:', error);
    throw error;
  }
};

export const bulkUpsertMatchesService = async (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'id' })
    .select();

  if (error) throw error;
  return data || [];
};

export const bulkInsertMatchesService = async (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('matches')
    .insert(matches)
    .select();

  if (error) throw error;
  return data || [];
};

export const createJornadasService = async (jornadas) => {
  if (!Array.isArray(jornadas) || jornadas.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('jornadas')
    .insert(jornadas)
    .select();

  if (error) throw error;
  return data || [];
};

export const updateMatchResultService = async (matchId, payload) => {
  const { error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId);

  if (error) throw error;
  return { success: true };
};

export const resetMatchResultService = async (torneoId, matchId) => {
  if (!torneoId) throw new Error('ID de torneo no proporcionado');
  if (!matchId) throw new Error('ID de partido no proporcionado');

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, status, date, goals1, goals2, jornadas!inner(tournament_id)')
    .eq('id', matchId)
    .eq('jornadas.tournament_id', torneoId)
    .single();

  if (matchError) throw matchError;
  if (!match) throw new Error('Partido no encontrado en la BD');
  if (!hasStoredMatchResult(match)) {
    throw new Error('Solo se puede deshacer un partido con resultado');
  }

  const { error: eventsError } = await supabase
    .from('match_events')
    .delete()
    .eq('match_id', matchId);

  if (eventsError) throw eventsError;

  const { data: updatedMatch, error: updateError } = await supabase
    .from('matches')
    .update({
      goals1: null,
      goals2: null,
      puntos1: null,
      puntos2: null,
      referee_id: null,
      observations: null,
      status: match.date ? 'Programado' : 'Pendiente',
    })
    .eq('id', matchId)
    .select('id, status, date, goals1, goals2, puntos1, puntos2, referee_id, observations')
    .single();

  if (updateError) throw updateError;

  return { success: true, match: updatedMatch };
};
