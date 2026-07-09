import { addDaysToDate } from "./dateUtils";
import { parseJornadaNumber } from "./jornadaUtils";

export const REPOSITION_MODE = {
  NONE: "none",
  ONLY_DELAYED: "only_delayed",
};

export const isConfirmedJornada = (jornada) => {
  return ["Confirmada", "Finalizada"].includes(jornada?.status);
};

export const getRepositionMode = ({
  scheduledMatches = [],
  currentJornadaNumber = 1,
}) => {
  const currentNum = currentJornadaNumber;
  const playableScheduled = scheduledMatches.filter(
    (match) => !match.isByeMatch && !match.isReferenceOnly
  );
  const isDelayed = (match) =>
    parseJornadaNumber(match.originJornada, currentNum) < currentNum;

  if (playableScheduled.length === 0) {
    return REPOSITION_MODE.NONE;
  }

  const onlyDelayedScheduled = playableScheduled.every(isDelayed);
  if (onlyDelayedScheduled) {
    return REPOSITION_MODE.ONLY_DELAYED;
  }

  return REPOSITION_MODE.NONE;
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

export const buildFutureJornadaPreview = ({
  jornadas = [],
  jornadaIndex = 0,
  repositionStartDate,
  jornadaDurationDays = 7,
}) => {
  if (!repositionStartDate) {
    return [];
  }

  const durationDays = Math.max(1, parseInt(jornadaDurationDays, 10) || 7);

  return jornadas.slice(jornadaIndex).map((jornada, offset) => {
    const startDate = addDaysToDate(repositionStartDate, offset * durationDays);
    return {
      id: jornada.id,
      name: jornada.name,
      start_date: startDate,
      end_date: addDaysToDate(startDate, durationDays - 1),
      offset,
    };
  });
};
