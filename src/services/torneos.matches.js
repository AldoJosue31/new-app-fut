import { supabase } from '../supabase/supabase.config';
import { buildRepositionJornadaName } from '../utils/jornadaUtils';

export const intercambiarPartidosService = async (torneoId, matchHoy, matchFuturo) => {
  try {
    const { data: jornadas } = await supabase
      .from('jornadas')
      .select('id, name')
      .eq('tournament_id', torneoId)
      .in('name', [matchHoy.originJornada, matchFuturo.originJornada]);

    const idJornadaHoy = jornadas.find((j) => j.name === matchHoy.originJornada)?.id;
    const idJornadaFutura = jornadas.find((j) => j.name === matchFuturo.originJornada)?.id;

    if (!idJornadaHoy || !idJornadaFutura) throw new Error('No se encontraron las jornadas');

    const getTeamId = (team) => (team && team.id && team.id !== 'BYE' ? team.id : null);

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
      const { error: iError } = await supabase.from('matches').insert(matchesToInsert);
      if (iError) throw iError;
    }
    if (matchesToUpdate.length > 0) {
      const { error: uError } = await supabase.from('matches').upsert(matchesToUpdate);
      if (uError) throw uError;
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

    const { data: todasLasJornadas } = await supabase
      .from('jornadas')
      .select('id, name, status, start_date, end_date')
      .eq('tournament_id', torneoId)
      .order('id', { ascending: true });

    const jornadasMap = {};
    todasLasJornadas.forEach((j) => {
      jornadasMap[j.name] = j.id;
    });

    const repositionConfig = jornadaData.repositionConfig;
    const originalCurrentJornadaId =
      jornadaData.jornada_id ||
      jornadasMap[jornadaData.jornada_name] ||
      jornadasMap[`Jornada ${jornadaData.jornada_numero}`];

    if (!originalCurrentJornadaId) throw new Error('Jornada no encontrada en la BD');

    let confirmationJornadaId = originalCurrentJornadaId;
    let repositionJornadaData = null;
    let tournamentConfigCache = {};

    if (repositionConfig?.enabled) {
      const currentJornada = todasLasJornadas.find(
        (jornada) => jornada.id === originalCurrentJornadaId
      );
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
          (mapping) => String(mapping?.repositionJornadaId) !== String(insertedReposition.id)
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

    const procesarPartido = (m, forcedJornadaId = null) => {
      const originName = m.jornadas?.name || m.originJornada;
      const originJornadaId = m.originJornadaId || jornadasMap[originName] || null;
      const targetJornadaId =
        forcedJornadaId || m.jornada_id || jornadasMap[originName] || confirmationJornadaId;
      const t2Id =
        m.visitante && m.visitante.id && m.visitante.id !== 'BYE'
          ? Number(m.visitante.id)
          : null;
      const t1Id = m.local && m.local.id ? Number(m.local.id) : null;

      let finalStatus = m.status || 'Programado';
      let finalDate = null;
      let finalGoals1 = m.goals1;
      let finalGoals2 = m.goals2;
      let finalObs = m.observations;

      if (m.resolution && m.resolution.type === 'default') {
        finalStatus = 'Finalizado';
        finalGoals1 = m.resolution.goals1;
        finalGoals2 = m.resolution.goals2;
        finalObs = 'Victoria por default';
        finalDate = null;
      } else if (m.resolution && m.resolution.type === 'pendiente') {
        finalStatus = 'Pendiente';
        finalDate = null;
      } else if (m.date && m.date.trim() !== '') {
        finalDate = `${m.date} ${m.time || '10:00'}:00`;
      } else if (finalStatus === 'Finalizado' && finalObs === 'Victoria por default') {
        finalDate = null;
      } else if (finalStatus === 'Programado') {
        const safeDate = new Date().toISOString().split('T')[0];
        finalDate = `${safeDate} ${m.time || '10:00'}:00`;
      }

      const payload = {
        jornada_id: targetJornadaId,
        team1_id: t1Id,
        team2_id: t2Id,
        status: finalStatus,
        date: finalDate,
      };

      if (finalGoals1 !== undefined) payload.goals1 = finalGoals1;
      if (finalGoals2 !== undefined) payload.goals2 = finalGoals2;
      if (finalObs !== undefined) payload.observations = finalObs;

      const numericId = Number(m.id);
      if (m.id && !Number.isNaN(numericId) && numericId > 0 && !String(m.id).startsWith('temp')) {
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

    (jornadaData.allPendingMatches || []).forEach((m) => {
      const originName = m.jornadas?.name || m.originJornada;
      const targetJornadaId = m.jornada_id || jornadasMap[originName] || originalCurrentJornadaId;
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
        .filter((j) => j?.id)
        .map((j) => ({
          id: j.id,
          tournament_id: torneoId,
          name: j.name,
          start_date: j.start_date,
          end_date: j.end_date,
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
    console.error('Error detallado en guardarJornadaService:', error);
    throw error;
  }
};

export const updateMatchResultService = async (matchId, payload) => {
  const { error } = await supabase.from('matches').update(payload).eq('id', matchId);

  if (error) throw error;
  return { success: true };
};

export const upsertMatchesService = async (matches) => {
  if (!Array.isArray(matches) || matches.length === 0) return [];

  const { data, error } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'id' })
    .select();

  if (error) throw error;
  return data || [];
};
