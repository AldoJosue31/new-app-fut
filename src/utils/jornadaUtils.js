import { addDaysToDate } from "./dateUtils";

export const normalizeJornadaName = (name) => {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

export const parseJornadaNumber = (name, fallback = Number.MAX_SAFE_INTEGER) => {
  if (!name) return fallback;

  const jornadaMatch = String(name).match(/jornada\s+(\d+)/i);
  if (jornadaMatch) {
    return Number(jornadaMatch[1]);
  }

  const genericMatch = String(name).match(/(\d+)/);
  return genericMatch ? Number(genericMatch[1]) : fallback;
};

export const getJornadaReferenceNumber = (jornada, fallbackIndex = 0) => {
  return parseJornadaNumber(jornada?.name, fallbackIndex + 1);
};

export const isOfficialJornadaName = (name) => /^jornada\s+\d+$/i.test(String(name || "").trim());

export const isRepositionJornadaName = (name) => {
  const normalized = normalizeJornadaName(name);
  return /^(?:jornada de )?reposicion(?: \d+)?$/.test(normalized);
};

export const sortJornadas = (jornadas = []) => {
  return [...jornadas].sort((a, b) => {
    const startA = a?.start_date || "";
    const startB = b?.start_date || "";

    if (startA && startB && startA !== startB) {
      return startA.localeCompare(startB);
    }

    if (startA && !startB) return -1;
    if (!startA && startB) return 1;

    const numA = parseJornadaNumber(a?.name, a?.id || Number.MAX_SAFE_INTEGER);
    const numB = parseJornadaNumber(b?.name, b?.id || Number.MAX_SAFE_INTEGER);
    if (numA !== numB) return numA - numB;

    return (a?.id || 0) - (b?.id || 0);
  });
};

export const buildRepositionJornadaName = ({
  existingJornadas = [],
}) => {
  const repositionNumbers = existingJornadas
    .map((jornada) => {
      const match = normalizeJornadaName(jornada?.name).match(
        /^(?:jornada de )?reposicion(?: (\d+))?$/
      );

      if (!match) return null;
      return match[1] ? Number(match[1]) : 1;
    })
    .filter((value) => Number.isFinite(value));

  const nextNumber =
    repositionNumbers.length > 0 ? Math.max(...repositionNumbers) + 1 : 1;

  return `Reposicion ${nextNumber}`;
};

export const buildRepositionPreview = ({
  jornadas = [],
  jornadaIndex = 0,
  repositionStartDate,
  repositionEndDate,
}) => {
  if (!repositionStartDate) return [];

  const repositionName = buildRepositionJornadaName({
    existingJornadas: jornadas,
  });
  const syntheticEndDate =
    repositionEndDate || addDaysToDate(repositionStartDate, 6);
  const preview = [
    {
      id: null,
      name: repositionName,
      start_date: repositionStartDate,
      end_date: syntheticEndDate,
      isSynthetic: true,
    },
  ];

  let cursorStartDate = addDaysToDate(syntheticEndDate, 1);

  jornadas.slice(jornadaIndex).forEach((jornada, offset) => {
    const originalStart = jornada?.start_date || "";
    const originalEnd = jornada?.end_date || "";
    const durationDays = getDateDurationDays(originalStart, originalEnd);
    const startDate = offset === 0 ? cursorStartDate : cursorStartDate;
    const endDate = addDaysToDate(startDate, durationDays);

    preview.push({
      id: jornada.id,
      name: jornada.name,
      start_date: startDate,
      end_date: endDate,
      isSynthetic: false,
    });

    cursorStartDate = addDaysToDate(endDate, 1);
  });

  return preview;
};

export const resolveRepositionMappings = ({
  jornadas = [],
  configuredMappings = [],
}) => {
  const normalizedConfigured = (configuredMappings || [])
    .filter((mapping) => mapping?.repositionJornadaId && mapping?.originalJornadaId)
    .map((mapping) => ({
      repositionJornadaId: mapping.repositionJornadaId,
      repositionJornadaName: mapping.repositionJornadaName || "",
      originalJornadaId: mapping.originalJornadaId,
      originalJornadaName: mapping.originalJornadaName || "",
    }));

  const configuredIds = new Set(
    normalizedConfigured.map((mapping) => String(mapping.repositionJornadaId))
  );

  const sorted = sortJornadas(jornadas);

  const inferred = sorted
    .filter(
      (jornada) =>
        !isOfficialJornadaName(jornada?.name) &&
        isRepositionJornadaName(jornada?.name)
    )
    .map((repositionJornada) => {
      if (configuredIds.has(String(repositionJornada.id))) {
        return null;
      }

      const expectedNextStart = repositionJornada?.end_date
        ? addDaysToDate(repositionJornada.end_date, 1)
        : "";

      const originalByExpectedDate = sorted.find(
        (candidate) =>
          isOfficialJornadaName(candidate?.name) &&
          String(candidate?.start_date || "") === String(expectedNextStart)
      );

      const originalByNextOfficial = sorted.find(
        (candidate) =>
          isOfficialJornadaName(candidate?.name) &&
          String(candidate?.start_date || "") >
            String(repositionJornada?.end_date || "")
      );

      const originalJornada = originalByExpectedDate || originalByNextOfficial || null;
      if (!originalJornada) return null;

      return {
        repositionJornadaId: repositionJornada.id,
        repositionJornadaName: repositionJornada.name || "",
        originalJornadaId: originalJornada.id,
        originalJornadaName: originalJornada.name || "",
      };
    })
    .filter(Boolean);

  return [...normalizedConfigured, ...inferred];
};

function getDateDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return 6;

  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));

  return Number.isNaN(diff) || diff < 0 ? 6 : diff;
}
