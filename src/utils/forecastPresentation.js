export const formatForecastPercent = (percent, exact = false) => {
  if (!exact && percent < 1) return "<1 %";
  if (!exact && percent > 99) return ">99 %";
  return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: exact ? 0 : 1 }).format(percent)} %`;
};
