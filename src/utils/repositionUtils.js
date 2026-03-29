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
  sidebarMatches = [],
  currentJornadaNumber = 1,
}) => {
  const currentNum = currentJornadaNumber;
  const playableScheduled = scheduledMatches.filter((match) => !match.isByeMatch);
  const playableSidebar = sidebarMatches.filter((match) => !match.isByeMatch);
  const isDelayed = (match) =>
    parseJornadaNumber(match.originJornada, currentNum) < currentNum;
  const isCurrentOrFuture = (match) =>
    parseJornadaNumber(match.originJornada, currentNum) >= currentNum;

  if (playableScheduled.length === 0 && playableSidebar.length === 0) {
    return REPOSITION_MODE.NONE;
  }

  if (playableScheduled.length > 0) {
    const onlyDelayedScheduled = playableScheduled.every(isDelayed);
    const hasCurrentScheduled = playableScheduled.some(isCurrentOrFuture);
    if (onlyDelayedScheduled && !hasCurrentScheduled) {
      return REPOSITION_MODE.ONLY_DELAYED;
    }
  }

  if (playableSidebar.length > 0 && playableSidebar.every(isDelayed)) {
    return REPOSITION_MODE.ONLY_DELAYED;
  }

  return REPOSITION_MODE.NONE;
};

export const getSuggestedRepositionWindow = ({
  jornadas = [],
  jornadaIndex = 0,
  fallbackStartDate,
}) => {
  const confirmedBeforeCurrent = jornadas
    .slice(0, jornadaIndex)
    .filter(isConfirmedJornada);

  const lastConfirmed = confirmedBeforeCurrent[confirmedBeforeCurrent.length - 1];
  const anchorDate =
    lastConfirmed?.start_date ||
    lastConfirmed?.end_date ||
    fallbackStartDate;

  const startDate = anchorDate
    ? addDaysToDate(anchorDate, 7)
    : addDaysToDate(new Date().toISOString().split("T")[0], 7);

  return {
    startDate,
    endDate: addDaysToDate(startDate, 6),
    lastConfirmed,
  };
};

export const buildFutureJornadaPreview = ({
  jornadas = [],
  jornadaIndex = 0,
  repositionStartDate,
}) => {
  if (!repositionStartDate) {
    return [];
  }

  return jornadas.slice(jornadaIndex).map((jornada, offset) => {
    const startDate = addDaysToDate(repositionStartDate, offset * 7);
    return {
      id: jornada.id,
      name: jornada.name,
      start_date: startDate,
      end_date: addDaysToDate(startDate, 6),
      offset,
    };
  });
};
