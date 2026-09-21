import {
  addDaysToDate,
  buildRepositionJornadaName,
  supabase,
  TOURNAMENT_STATUS,
} from './shared';
import { buildScannedMatchTimestamp } from '../../utils/scannedScheduleUtils';
import {
  createMatchResultConflictError,
  MATCH_RESULT_CONFLICT_CODE,
  normalizeMatchResultRevision,
} from '../../utils/matchResultConcurrency';

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

const hasStoredMatchResultDetails = (match) =>
  !['Pendiente', 'Programado'].includes(match?.status || 'Programado') ||
  hasStoredScoreValue(match?.goals1) ||
  hasStoredScoreValue(match?.goals2) ||
  Number(match?.puntos1 ?? 0) !== 0 ||
  Number(match?.puntos2 ?? 0) !== 0 ||
  (match?.mvp_player_id !== null &&
    match?.mvp_player_id !== undefined) ||
  (match?.match_events || []).length > 0;

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

            const scannedTimestamp = match.scanScheduleAccepted
              ? buildScannedMatchTimestamp(match)
              : null;

            matchesToInsert.push({
              jornada_id: jornadaDB.id,
              team1_id: match.local.id,
              team2_id: team2Id,
              status: 'Programado',
              date: scannedTimestamp,
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
    const jornadasById = new Map(
      (todasLasJornadas || []).map((jornada) => [String(jornada.id), jornada])
    );

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
    const matchSchedulesToSave = new Map();
    // Este mapping tambien conserva los partidos pendientes jugados en otra
    // jornada oficial, no solo los de una jornada de reposicion.
    const repositionMatchMappings = [];
    const insertMatchMetas = [];
    const insertedMatchInitialResults = [];
    const processedMatchIds = new Set();

    const getTargetJornadaName = (jornadaId) => {
      if (
        repositionJornadaData &&
        String(repositionJornadaData.id) === String(jornadaId)
      ) {
        return repositionJornadaData.name || '';
      }

      return jornadasById.get(String(jornadaId))?.name || '';
    };

    const registerMovedMatchMapping = ({
      matchId,
      targetJornadaId,
      originJornadaId,
      originJornadaName,
    }) => {
      if (
        !matchId ||
        !originJornadaId ||
        !targetJornadaId ||
        String(targetJornadaId) === String(originJornadaId)
      ) {
        return;
      }

      repositionMatchMappings.push({
        matchId,
        repositionJornadaId: targetJornadaId,
        repositionJornadaName: getTargetJornadaName(targetJornadaId),
        originalJornadaId: originJornadaId,
        originalJornadaName: originJornadaName || '',
      });
    };

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

      const resultUpdates =
        finalStatus === 'Finalizado' && hasCompleteScore
          ? {
              goals1: finalGoals1,
              goals2: finalGoals2,
              observations: finalObservations,
            }
          : {};

      const payload = {
        jornada_id: targetJornadaId,
        team1_id: team1Id,
        team2_id: team2Id,
      };

      const numericId = Number(match.id);
      if (
        match.id &&
        !Number.isNaN(numericId) &&
        numericId > 0 &&
        !String(match.id).startsWith('temp')
      ) {
        processedMatchIds.add(String(numericId));
        matchSchedulesToSave.set(String(numericId), {
          matchId: numericId,
          expectedRevision: normalizeMatchResultRevision(match.result_revision),
          updates: {
            ...payload,
            status: finalStatus,
            date: finalDate,
            ...resultUpdates,
          },
        });

        registerMovedMatchMapping({
          matchId: numericId,
          targetJornadaId,
          originJornadaId: originJornadaId || originalCurrentJornadaId,
          originJornadaName:
            originName ||
            jornadaData.jornada_name ||
            `Jornada ${jornadaData.jornada_numero}`,
        });
      } else {
        const initialResult =
          finalStatus === 'Finalizado' && hasCompleteScore
          ? {
              ...resultUpdates,
              status: finalStatus,
            }
          : null;
        const insertPayload = {
          ...payload,
          // La insercion directa se restringe a fixtures sin resultado. La
          // victoria por default o cualquier resultado inicial se completa
          // inmediatamente mediante el RPC atomico una vez que la fila ya
          // tiene un identificador.
          status: initialResult ? 'Pendiente' : finalStatus,
          date: finalDate,
        };
        matchesToInsert.push(insertPayload);
        insertedMatchInitialResults.push(initialResult);

        const resolvedOriginJornadaId = originJornadaId || originalCurrentJornadaId;
        insertMatchMetas.push(
          resolvedOriginJornadaId && String(targetJornadaId) !== String(resolvedOriginJornadaId)
            ? {
                targetJornadaId,
                originalJornadaId: resolvedOriginJornadaId,
                originalJornadaName:
                  originName ||
                  jornadaData.jornada_name ||
                  `Jornada ${jornadaData.jornada_numero}`,
              }
            : null
        );
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

    let insertedMatches = [];

    if (matchesToInsert.length > 0) {
      const { data, error: insertError } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select('id');
      if (insertError) throw insertError;

      insertedMatches = data || [];

      if (insertedMatches.length !== matchesToInsert.length) {
        throw new Error('No se pudieron confirmar todos los partidos creados.');
      }

      if (insertMatchMetas.length > 0) {
        insertedMatches.forEach((insertedMatch, index) => {
          const meta = insertMatchMetas[index];
          if (!meta) return;

          registerMovedMatchMapping({
            matchId: insertedMatch.id,
            targetJornadaId: meta.targetJornadaId,
            originalJornadaId: meta.originalJornadaId,
            originalJornadaName: meta.originalJornadaName,
          });
        });
      }
    }

    const resultSaves = [
      ...Array.from(matchSchedulesToSave.values()).map(
        ({ matchId, expectedRevision, updates }) =>
          saveMatchResultAtomicService({
            matchId,
            expectedRevision,
            updates,
            events: null,
          }),
      ),
      ...insertedMatches.flatMap((insertedMatch, index) => {
        const initialResult = insertedMatchInitialResults[index];
        if (!initialResult) return [];

        return [
          saveMatchResultAtomicService({
            matchId: insertedMatch.id,
            expectedRevision: 0,
            updates: initialResult,
            events: [],
          }),
        ];
      }),
    ];

    if (resultSaves.length > 0) {
      await Promise.all(
        resultSaves,
      );
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

    if (repositionMatchMappings.length > 0) {
      if (!repositionConfig?.enabled) {
        const { data: tournamentRow, error: tournamentError } = await supabase
          .from('tournaments')
          .select('config')
          .eq('id', torneoId)
          .single();

        if (tournamentError) throw tournamentError;

        tournamentConfigCache =
          tournamentRow?.config && typeof tournamentRow.config === 'object'
            ? tournamentRow.config
            : {};
      }

      const previousMatchMappings = Array.isArray(
        tournamentConfigCache.repositionMatchMappings
      )
        ? tournamentConfigCache.repositionMatchMappings
        : [];
      const newMatchMappings = Array.from(
        new Map(
          repositionMatchMappings.map((mapping) => [String(mapping.matchId), mapping])
        ).values()
      );

      const nextMatchMappings = [
        ...previousMatchMappings.filter(
          (mapping) =>
            !processedMatchIds.has(String(mapping?.matchId)) &&
            !newMatchMappings.some(
              (newMapping) => String(newMapping.matchId) === String(mapping?.matchId)
            )
        ),
        ...newMatchMappings,
      ];

      const nextConfig = {
        ...tournamentConfigCache,
        repositionMatchMappings: nextMatchMappings,
      };

      if (repositionConfig?.enabled) {
        nextConfig.repositionMappings = Array.isArray(tournamentConfigCache.repositionMappings)
          ? tournamentConfigCache.repositionMappings
          : [];
      }

      const { error: matchMappingsError } = await supabase
        .from('tournaments')
        .update({
          config: nextConfig,
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

export const limpiarResultadosTorneoService = async (tournamentId) => {
  if (!tournamentId) throw new Error('ID de torneo invalido');

  const { data, error } = await supabase.rpc('clear_tournament_results_atomic', {
    p_tournament_id: Number(tournamentId),
  });

  if (error) throw error;

  return {
    success: true,
    matchCount: Number(data?.match_count || 0),
    jornadaCount: Number(data?.jornada_count || 0),
  };
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

/**
 * Elimina partidos excedentes de una restauracion de fixture. La lectura y el
 * borrado se acotan a las jornadas editables entregadas por el editor para
 * impedir que una jornada confirmada pueda ser afectada por error.
 */
export const deleteMatchesForFixtureRestoreService = async (
  matchIds,
  editableJornadaIds,
) => {
  const uniqueMatchIds = [...new Map(
    (matchIds || [])
      .filter((id) => id !== null && id !== undefined)
      .map((id) => [String(id), id]),
  ).values()];
  const uniqueJornadaIds = [...new Map(
    (editableJornadaIds || [])
      .filter((id) => id !== null && id !== undefined)
      .map((id) => [String(id), id]),
  ).values()];

  if (uniqueMatchIds.length === 0) return [];
  if (uniqueJornadaIds.length === 0) {
    throw new Error('No hay jornadas editables autorizadas para eliminar partidos.');
  }

  const { data: currentJornadas, error: jornadasError } = await supabase
    .from('jornadas')
    .select('id, status')
    .in('id', uniqueJornadaIds);

  if (jornadasError) throw jornadasError;
  if (
    (currentJornadas || []).length !== uniqueJornadaIds.length ||
    (currentJornadas || []).some((jornada) =>
      ['Confirmada', 'Finalizada'].includes(jornada.status)
    )
  ) {
    throw new Error('No se pueden eliminar partidos de jornadas confirmadas.');
  }

  const { data: eligibleMatches, error: eligibleMatchesError } = await supabase
    .from('matches')
    .select(
      'id, jornada_id, status, goals1, goals2, puntos1, puntos2, mvp_player_id, match_events(id)',
    )
    .in('id', uniqueMatchIds)
    .in('jornada_id', uniqueJornadaIds);

  if (eligibleMatchesError) throw eligibleMatchesError;
  if ((eligibleMatches || []).length !== uniqueMatchIds.length) {
    throw new Error('Uno o más partidos excedentes ya no pertenecen a jornadas editables.');
  }

  if ((eligibleMatches || []).some(hasStoredMatchResultDetails)) {
    throw new Error('No se pueden eliminar partidos con resultado, estadísticas o eventos.');
  }

  const idsToDelete = eligibleMatches.map((match) => match.id);
  const { data: deletedMatches, error: deleteMatchesError } = await supabase
    .from('matches')
    .delete()
    .in('id', idsToDelete)
    .in('jornada_id', uniqueJornadaIds)
    .select('id');

  if (deleteMatchesError) throw deleteMatchesError;

  const deletedIds = new Set((deletedMatches || []).map((match) => String(match.id)));
  if (
    deletedIds.size !== idsToDelete.length ||
    idsToDelete.some((id) => !deletedIds.has(String(id)))
  ) {
    throw new Error('Los partidos cambiaron mientras se restauraba el fixture. Recarga e inténtalo de nuevo.');
  }

  return deletedMatches || [];
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

/**
 * Persiste cambios protegidos de un partido con control optimista de versión.
 * Cuando se entregan eventos, el RPC los reemplaza junto con el partido dentro
 * de una sola transacción; `events: null` conserva los eventos existentes.
 */
export const saveMatchResultAtomicService = async ({
  matchId,
  expectedRevision,
  updates,
  events = null,
}) => {
  const numericMatchId = Number(matchId);
  if (!Number.isSafeInteger(numericMatchId) || numericMatchId <= 0) {
    throw new Error('ID de partido no proporcionado');
  }

  const revision = normalizeMatchResultRevision(expectedRevision);
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new Error('Datos de resultado no proporcionados');
  }
  if (events !== null && !Array.isArray(events)) {
    throw new Error('Los eventos del partido no son válidos');
  }

  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  );
  const safeEvents = events === null
    ? null
    : events.map((event) => ({
      event_type: event?.event_type,
      player_id: event?.player_id,
    }));

  const { data, error } = await supabase.rpc('save_match_result_atomic', {
    p_match_id: numericMatchId,
    p_expected_revision: revision,
    p_updates: safeUpdates,
    p_events: safeEvents,
  });

  if (error) {
    if (error.message === MATCH_RESULT_CONFLICT_CODE) {
      throw createMatchResultConflictError(error);
    }
    throw error;
  }

  if (!data?.match?.id) {
    throw new Error('El guardado del resultado no devolvió el partido actualizado.');
  }

  return {
    success: true,
    match: data.match,
  };
};

export const resetMatchResultService = async (
  torneoId,
  matchId,
  expectedRevision,
) => {
  if (!torneoId) throw new Error('ID de torneo no proporcionado');
  if (!matchId) throw new Error('ID de partido no proporcionado');

  // La revisión pertenece a la versión que el usuario confirmó que quería
  // deshacer; nunca se debe sustituir por una lectura posterior.
  const revision = normalizeMatchResultRevision(expectedRevision);

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, status, date, goals1, goals2, result_revision, jornadas!inner(tournament_id)')
    .eq('id', matchId)
    .eq('jornadas.tournament_id', torneoId)
    .single();

  if (matchError) throw matchError;
  if (!match) throw new Error('Partido no encontrado en la BD');
  if (normalizeMatchResultRevision(match.result_revision) !== revision) {
    throw createMatchResultConflictError(new Error(MATCH_RESULT_CONFLICT_CODE));
  }
  if (!hasStoredMatchResult(match)) {
    throw new Error('Solo se puede deshacer un partido con resultado');
  }

  const { match: updatedMatch } = await saveMatchResultAtomicService({
    matchId,
    expectedRevision: revision,
    updates: {
      goals1: null,
      goals2: null,
      puntos1: null,
      puntos2: null,
      referee_id: null,
      observations: null,
      status: match.date ? 'Programado' : 'Pendiente',
    },
    events: [],
  });

  return { success: true, match: updatedMatch };
};
