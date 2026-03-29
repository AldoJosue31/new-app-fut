import { addDaysToDate } from "./dateUtils";

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
  currentJornadaName,
  existingJornadas = [],
}) => {
  const baseName = `Reposicion previa a ${currentJornadaName}`;
  const matches = existingJornadas.filter((jornada) =>
    String(jornada?.name || "").startsWith(baseName)
  );

  if (matches.length === 0) {
    return baseName;
  }

  return `${baseName} (${matches.length + 1})`;
};

export const buildRepositionPreview = ({
  jornadas = [],
  jornadaIndex = 0,
  repositionStartDate,
}) => {
  if (!repositionStartDate) return [];

  const currentJornada = jornadas[jornadaIndex];
  const preview = [
    {
      id: null,
      name: currentJornada?.name
        ? `Reposicion previa a ${currentJornada.name}`
        : "Reposicion",
      start_date: repositionStartDate,
      end_date: addDaysToDate(repositionStartDate, 6),
      isSynthetic: true,
    },
  ];

  jornadas.slice(jornadaIndex).forEach((jornada, offset) => {
    const startDate = addDaysToDate(repositionStartDate, (offset + 1) * 7);
    preview.push({
      id: jornada.id,
      name: jornada.name,
      start_date: startDate,
      end_date: addDaysToDate(startDate, 6),
      isSynthetic: false,
    });
  });

  return preview;
};
