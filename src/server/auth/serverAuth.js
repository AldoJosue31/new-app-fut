import "server-only";

import { AUTH_ROLES } from "../../lib/auth/routeAccess.js";
import { createServerSupabaseClient } from "../../lib/supabase/serverClient.js";

const AUTHORIZED_ROLES = [
  AUTH_ROLES.ADMIN,
  AUTH_ROLES.DELEGATE,
  AUTH_ROLES.MANAGER,
];

export class AuthAccessError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AuthAccessError";
    this.statusCode = statusCode;
  }
}

export const getServerAuthSnapshot = async ({
  client,
} = {}) => {
  const supabase = client || (await createServerSupabaseClient());
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      profile: null,
      reason: userError ? "invalid-session" : null,
      status: "anonymous",
      user: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    const missingProfile =
      profileError.code === "PGRST116" ||
      profileError.code === "PGRST123";

    return {
      profile: null,
      reason: missingProfile ? "missing-profile" : "profile-query-failed",
      status: missingProfile ? "blocked" : "profile-unavailable",
      user: missingProfile ? null : user,
    };
  }

  if (!profile || !AUTHORIZED_ROLES.includes(profile.role)) {
    return {
      profile: null,
      reason: "unauthorized-role",
      status: "blocked",
      user: null,
    };
  }

  if (
    [AUTH_ROLES.MANAGER, AUTH_ROLES.DELEGATE].includes(profile.role) &&
    profile.is_suspended
  ) {
    return {
      profile: null,
      reason: "account-suspended",
      status: "blocked",
      user: null,
    };
  }

  return {
    profile,
    reason: null,
    status: "authenticated",
    user,
  };
};

export const requireUser = async (options = {}) => {
  const auth = await getServerAuthSnapshot(options);

  if (auth.status === "profile-unavailable") {
    throw new AuthAccessError("Authentication temporarily unavailable", 503);
  }

  if (auth.status !== "authenticated") {
    throw new AuthAccessError("Unauthorized", 401);
  }

  return auth;
};

export const requireRole = async (allowedRoles, options = {}) => {
  const auth = await requireUser(options);

  if (!allowedRoles.includes(auth.profile.role)) {
    throw new AuthAccessError("Forbidden", 403);
  }

  return auth;
};
