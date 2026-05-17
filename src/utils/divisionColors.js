export const DIVISION_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
  "#0f766e",
  "#be123c",
];

export const normalizeDivisionName = (name) => String(name || "Otra").trim() || "Otra";

export const buildDivisionColorMap = (divisionNames = []) => {
  const map = new Map();

  divisionNames.forEach((name) => {
    const normalizedName = normalizeDivisionName(name);
    if (!map.has(normalizedName)) {
      map.set(normalizedName, DIVISION_COLORS[map.size % DIVISION_COLORS.length]);
    }
  });

  return map;
};
