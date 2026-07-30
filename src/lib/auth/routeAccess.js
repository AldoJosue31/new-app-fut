import { buildLoginPath, ROUTES } from "../navigation/routes.js";

export const AUTH_ROLES = Object.freeze({
  ADMIN: "admin",
  DELEGATE: "delegate",
  MANAGER: "manager",
});

const ALL_AUTHENTICATED_ROLES = Object.freeze([
  AUTH_ROLES.ADMIN,
  AUTH_ROLES.DELEGATE,
  AUTH_ROLES.MANAGER,
]);

const MANAGER_AND_ADMIN = Object.freeze([
  AUTH_ROLES.ADMIN,
  AUTH_ROLES.MANAGER,
]);

const PUBLIC_PATTERNS = [
  /^\/$/,
  /^\/landing\/?$/,
  /^\/login\/?$/,
  /^\/share\/standings\/[^/]+\/?$/,
  /^\/invitation\/[^/]+\/?$/,
  /^\/delegate\/invitation\/[^/]+\/?$/,
];

const PROTECTED_POLICIES = [
  { pattern: /^\/dashboard\/?$/, roles: MANAGER_AND_ADMIN },
  { pattern: /^\/partidos\/?$/, roles: MANAGER_AND_ADMIN },
  {
    pattern: /^\/(?:division\/[^/]+\/)?equipos(?:\/[^/]+)?\/?$/,
    roles: ALL_AUTHENTICATED_ROLES,
  },
  {
    pattern: /^\/(?:division\/[^/]+\/)?torneos(?:\/.*)?$/,
    roles: MANAGER_AND_ADMIN,
  },
  { pattern: /^\/liga(?:\/[^/]+)?\/?$/, roles: MANAGER_AND_ADMIN },
  {
    pattern: /^\/configuracion\/?$/,
    roles: ALL_AUTHENTICATED_ROLES,
  },
  {
    pattern: /^\/admin\/managers\/?$/,
    roles: Object.freeze([AUTH_ROLES.ADMIN]),
  },
];

export const getDefaultAuthenticatedPath = (role) =>
  role === AUTH_ROLES.DELEGATE ? ROUTES.TEAMS : ROUTES.DASHBOARD;

export const getRoutePolicy = (pathname) => {
  if (PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return { kind: "public", roles: [] };
  }

  const protectedPolicy = PROTECTED_POLICIES.find(({ pattern }) =>
    pattern.test(pathname),
  );

  if (protectedPolicy) {
    return {
      kind: "protected",
      roles: protectedPolicy.roles,
    };
  }

  return { kind: "unknown", roles: [] };
};

export const evaluateRouteAccess = ({
  auth,
  pathname,
  returnPath = pathname,
}) => {
  const policy = getRoutePolicy(pathname);

  if (policy.kind === "unknown") {
    return { action: "redirect", destination: ROUTES.HOME };
  }

  const isAuthenticated =
    auth?.status === "authenticated" && auth.profile?.role;

  if (policy.kind === "public") {
    if (pathname === ROUTES.LOGIN && isAuthenticated) {
      return {
        action: "redirect",
        destination: getDefaultAuthenticatedPath(auth.profile.role),
      };
    }

    if (
      pathname === ROUTES.HOME &&
      auth?.profile?.role === AUTH_ROLES.DELEGATE
    ) {
      return {
        action: "redirect",
        destination: ROUTES.TEAMS,
      };
    }

    return { action: "allow" };
  }

  if (auth?.status === "profile-unavailable") {
    return { action: "pending" };
  }

  if (!isAuthenticated) {
    return {
      action: "redirect",
      destination: buildLoginPath(returnPath),
    };
  }

  if (!policy.roles.includes(auth.profile.role)) {
    return {
      action: "redirect",
      destination: getDefaultAuthenticatedPath(auth.profile.role),
    };
  }

  return { action: "allow" };
};
