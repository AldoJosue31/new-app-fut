const encodePathSegment = (value) => encodeURIComponent(String(value));

export const ROUTES = Object.freeze({
  ADMIN_MANAGERS: "/admin/managers",
  AUTH_CALLBACK: "/auth/callback",
  CONFIGURATION: "/configuracion",
  DASHBOARD: "/dashboard",
  DELEGATE_INVITATION_PATTERN: "/delegate/invitation/:token",
  DIVISION_TEAMS_PATTERN: "/division/:divisionId/equipos/:teamId?",
  DIVISION_TOURNAMENTS_PATTERN:
    "/division/:divisionId/torneos/:torneoOrTab?/:tab?/:jornadaId?",
  HOME: "/",
  LANDING: "/landing",
  LEAGUE_PATTERN: "/liga/:tab?",
  LOGIN: "/login",
  MANAGER_INVITATION_PATTERN: "/invitation/:token",
  MATCHES: "/partidos",
  PUBLIC_STANDINGS_PATTERN: "/share/standings/:torneoId",
  TEAMS: "/equipos",
  TEAMS_PATTERN: "/equipos/:teamId?",
  TOURNAMENTS_PATTERN: "/torneos/:torneoOrTab?/:tab?/:jornadaId?",
});

export const buildDivisionTeamsPath = (divisionId, teamId) => {
  const base = `/division/${encodePathSegment(divisionId)}/equipos`;
  return teamId === undefined || teamId === null || teamId === ""
    ? base
    : `${base}/${encodePathSegment(teamId)}`;
};

export const buildDivisionTournamentsPath = (
  divisionId,
  tournamentOrTab,
  tab,
  roundId,
) => {
  const segments = [
    "division",
    divisionId,
    "torneos",
    tournamentOrTab,
    tab,
    roundId,
  ].filter((segment) => segment !== undefined && segment !== null && segment !== "");

  return `/${segments.map(encodePathSegment).join("/")}`;
};

export const buildPublicStandingsPath = (tournamentId) =>
  `/share/standings/${encodePathSegment(tournamentId)}`;

export const buildLoginPath = (returnPath) => {
  const safeReturnPath = sanitizeInternalPath(returnPath, "");
  return safeReturnPath
    ? `${ROUTES.LOGIN}?next=${encodeURIComponent(safeReturnPath)}`
    : ROUTES.LOGIN;
};

export const buildAuthCallbackPath = (origin, returnPath) => {
  const callbackUrl = new URL(ROUTES.AUTH_CALLBACK, origin);
  const safeReturnPath = sanitizeInternalPath(returnPath, "");
  if (safeReturnPath) callbackUrl.searchParams.set("next", safeReturnPath);
  return callbackUrl.toString();
};

const hasUnsafeDecodedPath = (value) => {
  let decoded = value;

  for (let pass = 0; pass < 3; pass += 1) {
    if (decoded.startsWith("//") || decoded.includes("\\")) return true;

    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      return true;
    }
  }

  return decoded.startsWith("//") || decoded.includes("\\");
};

const hasControlCharacters = (value) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

export const sanitizeInternalPath = (candidate, fallback = ROUTES.HOME) => {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    hasControlCharacters(candidate) ||
    hasUnsafeDecodedPath(candidate)
  ) {
    return fallback;
  }

  try {
    const internalOrigin = "https://internal.invalid";
    const url = new URL(candidate, internalOrigin);
    if (url.origin !== internalOrigin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};
