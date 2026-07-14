import { addDaysToDate } from "./dateUtils";

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
