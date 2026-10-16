import { addDaysToDate } from "./dateUtils.js";
import { parseJornadaNumber } from "./jornadaUtils.js";

export const REPOSITION_MODE = {
  NONE: "none",
  ONLY_DELAYED: "only_delayed",
};

export const isPendingRepositionMatch = (match) => {
  const localId = match?.team1_id !== undefined ? match.team1_id : match?.local?.id;
  const visitanteId = match?.team2_id !== undefined ? match.team2_id : match?.visitante?.id;

  return Boolean(
    match &&
    !match.isByeMatch &&
    !match.isReferenceOnly &&
    !match.date &&
    match.resolution?.type !== "default" &&
    // El planificador muestra los cruces Programado sin fecha como Pendiente,
    // pero para una reposición debe respetarse el estado guardado en la BD.
    (match.persistedStatus ?? match.status) === "Pendiente" &&
    localId && visitanteId &&
    String(localId) !== "BYE" && String(visitanteId) !== "BYE"
  );
};

export const getRepositionMode = ({
  scheduledMatches = [],
  currentJornadaNumber = 1,
}) => {
  const playableMatches = scheduledMatches.filter(
    (match) => !match.isByeMatch && !match.isReferenceOnly && match.status !== "Cancelado"
  );

  if (playableMatches.length === 0) return REPOSITION_MODE.NONE;

  const onlyDelayed = playableMatches.every(
    (match) => parseJornadaNumber(match.originJornada, currentJornadaNumber) < currentJornadaNumber
  );
  return onlyDelayed ? REPOSITION_MODE.ONLY_DELAYED : REPOSITION_MODE.NONE;
};

export const isConfirmedJornada = (jornada) => {
  return ["Confirmada", "Finalizada"].includes(jornada?.status);
};

export const getSuggestedRepositionWindow = ({
  jornadas = [],
  jornadaIndex = 0,
  fallbackStartDate,
  jornadaDurationDays = 7,
}) => {
  const durationDays = Math.max(1, parseInt(jornadaDurationDays, 10) || 7);
  const confirmedBeforeCurrent = jornadas
    .slice(0, jornadaIndex)
    .filter(isConfirmedJornada);

  const lastConfirmed = confirmedBeforeCurrent[confirmedBeforeCurrent.length - 1];
  const anchorDate =
    lastConfirmed?.start_date ||
    lastConfirmed?.end_date ||
    fallbackStartDate;

  const startDate = anchorDate
    ? addDaysToDate(anchorDate, durationDays)
    : addDaysToDate(new Date().toISOString().split("T")[0], durationDays);

  return {
    startDate,
    endDate: addDaysToDate(startDate, durationDays - 1),
    lastConfirmed,
  };
};
