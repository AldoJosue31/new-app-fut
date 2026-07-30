export const TOURNAMENT_TABS = Object.freeze([
  "definir",
  "jornadas",
  "standings",
  "goleadores",
]);

const allowedTabs = new Set(TOURNAMENT_TABS);

const hasSegment = (value) =>
  value !== undefined && value !== null && value !== "";

const asSegment = (value) => (hasSegment(value) ? String(value) : "");

const decodePathSegment = (segment) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const isPositiveTournamentPathId = (candidate) => {
  if (typeof candidate !== "string" && typeof candidate !== "number") {
    return false;
  }

  const value = String(candidate);
  return (
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
};

export const sanitizeTournamentTab = (candidate) =>
  allowedTabs.has(candidate) ? candidate : "";

export const parseTournamentPathname = (pathname) => {
  if (typeof pathname !== "string") return null;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map(decodePathSegment);
  let routeDivisionId = "";
  let routeStartIndex = 0;

  if (segments[0] === "division") {
    if (
      !isPositiveTournamentPathId(segments[1]) ||
      segments[2] !== "torneos"
    ) {
      return null;
    }

    routeDivisionId = segments[1];
    routeStartIndex = 3;
  } else if (segments[0] === "torneos") {
    routeStartIndex = 1;
  } else {
    return null;
  }

  if (segments.length > routeStartIndex + 3) return null;

  return {
    jornadaId: segments[routeStartIndex + 2] || "",
    routeDivisionId,
    tab: segments[routeStartIndex + 1] || "",
    tournamentOrTab: segments[routeStartIndex] || "",
  };
};

export const parseTournamentRoute = ({
  jornadaId,
  tab,
  tournamentOrTab,
} = {}) => {
  const firstSegment = asSegment(tournamentOrTab);
  const secondSegment = asSegment(tab);
  const thirdSegment = asSegment(jornadaId);
  const hasTournamentId = isPositiveTournamentPathId(firstSegment);
  const tournamentId = hasTournamentId ? firstSegment : "";
  const requestedTab = hasTournamentId ? secondSegment : firstSegment;
  const resolvedTab = sanitizeTournamentTab(requestedTab);
  const requestedJornadaId =
    resolvedTab === "jornadas"
      ? hasTournamentId
        ? thirdSegment
        : secondSegment
      : "";
  const resolvedJornadaId = isPositiveTournamentPathId(requestedJornadaId)
    ? requestedJornadaId
    : "";
  const ignoredSegments =
    resolvedTab && resolvedTab !== "jornadas"
      ? [hasTournamentId ? thirdSegment : secondSegment, hasTournamentId ? "" : thirdSegment]
      : resolvedTab === "jornadas" && !hasTournamentId
        ? [thirdSegment]
        : [];

  return {
    hasTournamentId,
    isTabValid: Boolean(resolvedTab),
    jornadaId: resolvedJornadaId,
    needsRouteCleanup:
      (Boolean(requestedTab) && !resolvedTab) ||
      ignoredSegments.some(Boolean) ||
      (Boolean(requestedJornadaId) && !resolvedJornadaId),
    requestedJornadaId,
    requestedTab,
    tab: resolvedTab,
    tournamentId,
  };
};

export const buildTournamentPath = ({
  divisionId,
  jornadaId,
  tab,
  tournamentId,
} = {}) => {
  const segments = [];

  if (hasSegment(divisionId)) {
    segments.push("division", divisionId);
  }

  segments.push("torneos");

  if (hasSegment(tournamentId)) {
    segments.push(tournamentId);
  }

  const resolvedTab = sanitizeTournamentTab(tab);
  if (resolvedTab) {
    segments.push(resolvedTab);
  }

  if (
    resolvedTab === "jornadas" &&
    isPositiveTournamentPathId(jornadaId)
  ) {
    segments.push(jornadaId);
  }

  return `/${segments
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/")}`;
};
