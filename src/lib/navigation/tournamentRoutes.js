export const TOURNAMENT_TABS = Object.freeze([
  "definir",
  "jornadas",
  "standings",
  "goleadores",
]);

const allowedTabs = new Set(TOURNAMENT_TABS);
const allowedViews = new Set(["list", "grid"]);

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

export const sanitizeTournamentView = (candidate) =>
  allowedViews.has(candidate) ? candidate : "";

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

  if (segments.length > routeStartIndex + 4) return null;

  return {
    jornadaId: segments[routeStartIndex + 2] || "",
    routeDivisionId,
    tab: segments[routeStartIndex + 1] || "",
    tournamentOrTab: segments[routeStartIndex] || "",
    view: segments[routeStartIndex + 3] || "",
  };
};

export const parseTournamentRoute = ({
  jornadaId,
  tab,
  tournamentOrTab,
  view,
} = {}) => {
  const firstSegment = asSegment(tournamentOrTab);
  const secondSegment = asSegment(tab);
  const thirdSegment = asSegment(jornadaId);
  const fourthSegment = asSegment(view);
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
  const requestedView = resolvedTab === "jornadas"
    ? hasTournamentId ? fourthSegment : thirdSegment
    : "";
  const validView = sanitizeTournamentView(requestedView);
  const viewMode = resolvedTab === "jornadas" ? validView || "list" : "";
  const ignoredSegments =
    resolvedTab && resolvedTab !== "jornadas"
      ? [hasTournamentId ? thirdSegment : secondSegment, hasTournamentId ? "" : thirdSegment, fourthSegment]
      : resolvedTab === "jornadas" && !hasTournamentId
        ? [fourthSegment]
        : [];

  return {
    hasTournamentId,
    isTabValid: Boolean(resolvedTab),
    jornadaId: resolvedJornadaId,
    needsRouteCleanup:
      (Boolean(requestedTab) && !resolvedTab) ||
      ignoredSegments.some(Boolean) ||
      (Boolean(requestedJornadaId) && !resolvedJornadaId) ||
      (Boolean(resolvedJornadaId) && !validView),
    requestedJornadaId,
    requestedTab,
    tab: resolvedTab,
    tournamentId,
    viewMode,
  };
};

export const buildTournamentPath = ({
  divisionId,
  jornadaId,
  tab,
  tournamentId,
  viewMode,
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
    segments.push(jornadaId, sanitizeTournamentView(viewMode) || "list");
  }

  return `/${segments
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/")}`;
};

export const buildTournamentDivisionSwitchPath = ({
  divisionId,
  pathname,
} = {}) => {
  if (!isPositiveTournamentPathId(divisionId)) return "";

  const pathnameRoute = parseTournamentPathname(pathname);
  if (!pathnameRoute) return "";

  const tournamentRoute = parseTournamentRoute(pathnameRoute);

  return buildTournamentPath({
    divisionId,
    tab: tournamentRoute.tab || "definir",
  });
};
