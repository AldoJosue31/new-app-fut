import { resolveScannedSchedule } from "./scannedScheduleUtils.js";

const scheduledDateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "numeric", month: "short", timeZone: "UTC",
});
const scheduledDateTimeFormat = new Intl.DateTimeFormat("es-MX", {
  day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC",
});

export const formatForecastMatchDate = (value) => {
  const { date, time } = resolveScannedSchedule({ date: value });
  if (!date) return "Fecha por confirmar";

  // Match schedules store wall-clock components, as in the planning screen.
  // UTC is only a formatting anchor here; do not convert the scheduled time.
  const scheduled = new Date(`${date}T${time || "00:00"}:00Z`);
  return time
    ? scheduledDateTimeFormat.format(scheduled)
    : `${scheduledDateFormat.format(scheduled)} · Hora por confirmar`;
};

export const formatForecastPercent = (percent, exact = false) => {
  if (!exact && percent < 1) return "<1 %";
  if (!exact && percent > 99) return ">99 %";
  return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: exact ? 0 : 1 }).format(percent)} %`;
};
