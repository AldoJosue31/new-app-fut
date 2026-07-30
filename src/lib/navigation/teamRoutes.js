import {
  buildDivisionTeamsPath,
  ROUTES,
} from "./routes.js";

export const TEAM_DETAIL_VIEWS = Object.freeze({
  DELEGATE_REQUESTS: "delegate-requests",
  STATS: "stats",
});

const allowedDetailViews = new Set(Object.values(TEAM_DETAIL_VIEWS));

const decodePathSegment = (segment) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const sanitizeTeamDetailView = (candidate) =>
  allowedDetailViews.has(candidate) ? candidate : "";

export const isPositiveIntegerPathSegment = (candidate) => {
  if (typeof candidate !== "string" && typeof candidate !== "number") {
    return false;
  }

  const value = String(candidate);
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
};

export const isTeamPathSegment = (candidate) =>
  candidate === "crear" || isPositiveIntegerPathSegment(candidate);

export const parseTeamsPathname = (pathname) => {
  if (typeof pathname !== "string") return null;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map(decodePathSegment);
  let routeDivisionId = "";
  let teamIndex = 1;

  if (segments[0] === "division") {
    if (
      !isPositiveIntegerPathSegment(segments[1]) ||
      segments[2] !== "equipos"
    ) {
      return null;
    }

    routeDivisionId = segments[1];
    teamIndex = 3;
  } else if (segments[0] !== "equipos") {
    return null;
  }

  if (segments.length > teamIndex + 1) return null;

  const teamId = segments[teamIndex] || "";
  if (teamId && !isTeamPathSegment(teamId)) return null;

  return {
    routeDivisionId,
    teamId,
  };
};

export const buildTeamsPath = ({
  divisionId,
  teamId,
  view,
} = {}) => {
  const hasTeam = teamId !== undefined && teamId !== null && teamId !== "";
  const basePath =
    divisionId !== undefined && divisionId !== null && divisionId !== ""
      ? buildDivisionTeamsPath(divisionId, teamId)
      : hasTeam
        ? `${ROUTES.TEAMS}/${encodeURIComponent(String(teamId))}`
        : ROUTES.TEAMS;
  const detailView =
    hasTeam && teamId !== "crear"
      ? sanitizeTeamDetailView(view)
      : "";

  return detailView
    ? `${basePath}?view=${encodeURIComponent(detailView)}`
    : basePath;
};
