import { resolveRepositionMappings, sortJornadas } from "./jornadaUtils.js";

const key = (value) => String(value ?? "");
const isClosedRound = (round) => ["Confirmada", "Finalizada"].includes(round?.status);
const hasScore = (value) => value !== null && value !== undefined && String(value).trim() !== "";

export const getMatchesForManagement = ({
  matches = [], jornadas = [], teams = [], config = {},
}) => {
  const rounds = sortJornadas(jornadas);
  const lastConfirmedIndex = rounds.reduce(
    (last, round, index) => isClosedRound(round) ? index : last, -1,
  );
  const roundsById = new Map(rounds.map((round, index) => [key(round.id), { ...round, index }]));
  const teamsById = new Map(teams.map((team) => [key(team.id), team]));
  const matchMappings = new Map((config.repositionMatchMappings || [])
    .map((mapping) => [key(mapping.matchId), mapping]));
  const roundMappings = new Map(resolveRepositionMappings({
    jornadas: rounds, configuredMappings: config.repositionMappings || [],
  }).map((mapping) => [key(mapping.repositionJornadaId), mapping]));
  const pending = new Map();
  const unresulted = new Map();

  matches.forEach((match) => {
    if (!match?.id || match.isByeMatch || match.isReferenceOnly) return;
    if (!["Pendiente", "Programado"].includes(match.status)) return;

    const localId = match.team1_id !== undefined ? match.team1_id : match.local?.id;
    const visitId = match.team2_id !== undefined ? match.team2_id : match.visitante?.id;
    if (!localId || !visitId || key(localId) === "BYE" || key(visitId) === "BYE") return;

    const mapping = matchMappings.get(key(match.id)) || roundMappings.get(key(match.jornada_id));
    const originId = mapping?.originalJornadaId || match.originJornadaId || match.jornada_id;
    const origin = roundsById.get(key(originId));
    if (!origin) return;

    if (match.date) {
      // La última jornada confirmada conserva su propio flujo de captura de resultados.
      if (!isClosedRound(origin) || origin.index >= lastConfirmedIndex ||
          hasScore(match.goals1) || hasScore(match.goals2)) return;
    } else if (origin.index > lastConfirmedIndex) {
      return;
    }

    const managedMatch = {
      ...match,
      local: teamsById.get(key(localId)) || match.local || { id: localId, name: "Equipo local" },
      visitante: teamsById.get(key(visitId)) || match.visitante || { id: visitId, name: "Equipo visitante" },
      originJornadaId: origin.id,
      originJornada: origin.name,
      originJornadaIndex: origin.index,
      jornadas: origin,
      isByeMatch: false,
    };
    (match.date ? unresulted : pending).set(key(match.id), managedMatch);
  });

  const byOrigin = (a, b) =>
    a.originJornadaIndex - b.originJornadaIndex ||
    a.local.name.localeCompare(b.local.name, "es");

  return {
    pending: [...pending.values()].sort(byOrigin),
    unresulted: [...unresulted.values()].sort(byOrigin),
  };
};

export const getPendingMatchesForManagement = (input) => getMatchesForManagement(input).pending;

export const buildPendingMatchResultRequest = (match, request) => {
  if (!match?.originJornadaId) throw new Error("No se encontró la jornada de origen del partido.");
  if (request?.type !== "atomic-result-save" || request.updates?.status !== "Finalizado") {
    throw new Error("Captura un resultado para resolver el partido pendiente.");
  }

  return {
    ...request,
    updates: { ...request.updates, jornada_id: match.originJornadaId },
  };
};

export const buildPendingMatchCancellationRequest = (match) => {
  if (!match?.originJornadaId) throw new Error("No se encontró la jornada de origen del partido.");

  return {
    type: "atomic-result-save",
    expectedRevision: match.result_revision ?? 0,
    events: [],
    updates: {
      jornada_id: match.originJornadaId,
      status: "Cancelado",
      goals1: null,
      goals2: null,
      puntos1: null,
      puntos2: null,
      referee_id: null,
      date: null,
      observations: "Sin jugar: pendiente cancelado sin resultado.",
    },
  };
};

export const buildUnresultedMatchPendingRequest = (match) => {
  if (!match?.originJornadaId || !match.date ||
      !["Pendiente", "Programado"].includes(match.status) ||
      hasScore(match.goals1) || hasScore(match.goals2)) {
    throw new Error("El partido ya no está programado sin resultado.");
  }

  return {
    type: "atomic-result-save",
    expectedRevision: match.result_revision ?? 0,
    events: [],
    updates: {
      jornada_id: match.originJornadaId,
      status: "Pendiente",
      date: null,
      goals1: null,
      goals2: null,
      puntos1: null,
      puntos2: null,
      referee_id: null,
    },
  };
};
