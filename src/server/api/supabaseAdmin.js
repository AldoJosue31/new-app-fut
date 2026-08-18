import "server-only";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

let cachedAdminClient;
const REQUEST_AUTH_RESULT = Symbol("request-auth-result");

const getSupabaseConfig = () => {
  const env = globalThis.process?.env || {};
  const supabaseUrl =
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.VITE_APP_SUPABASE_URL;
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SERVICE_ROLE_KEY;
  const anonKey =
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.VITE_APP_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL for server-side admin API.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role key for server-side admin API.",
    );
  }

  if (!anonKey) {
    throw new Error("Missing Supabase anon key for server-side admin API.");
  }

  return { anonKey, serviceRoleKey, supabaseUrl };
};

const getSupabaseAdmin = () => {
  if (cachedAdminClient) return cachedAdminClient;

  const { serviceRoleKey, supabaseUrl } = getSupabaseConfig();
  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
};

export const supabaseAdmin = new Proxy(
  {},
  {
    get(_target, property) {
      const client = getSupabaseAdmin();
      const value = Reflect.get(client, property);
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);

const parseAuthorizationHeader = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) return null;
  return authHeader.replace(/^Bearer\s+/i, "").trim() || null;
};

export const createUserScopedClient = (accessToken) =>
  (() => {
    const { anonKey, supabaseUrl } = getSupabaseConfig();
    return createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  })();

export const createCookieScopedClient = (req) => {
  const { anonKey, supabaseUrl } = getSupabaseConfig();
  const cookieHeader = req.headers.cookie || req.headers.Cookie || "";
  const requestCookies = parseCookieHeader(cookieHeader);

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return requestCookies;
      },
      setAll(cookiesToSet, cacheHeaders = {}) {
        cookiesToSet.forEach(({ name, options, value }) => {
          req.responseHeaders?.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options),
          );
        });

        Object.entries(cacheHeaders).forEach(([name, value]) => {
          req.responseHeaders?.set(name, value);
        });
      },
    },
  });
};

export const requireUser = async (
  req,
  {
    createBearerClient = createUserScopedClient,
    createCookieClient = createCookieScopedClient,
  } = {},
) => {
  if (req[REQUEST_AUTH_RESULT]) {
    return req[REQUEST_AUTH_RESULT];
  }

  const accessToken = parseAuthorizationHeader(req);
  const cookieHeader = req.headers.cookie || req.headers.Cookie || "";

  if (!accessToken && !cookieHeader) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const authTransport = accessToken ? "bearer" : "cookie";
  const client = accessToken
    ? createBearerClient(accessToken)
    : createCookieClient(req);
  const {
    data: { user },
    error: userError,
  } = accessToken
    ? await client.auth.getUser(accessToken)
    : await client.auth.getUser();

  if (userError || !user) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const result = {
    accessToken,
    authTransport,
    client,
    user,
  };
  req[REQUEST_AUTH_RESULT] = result;
  return result;
};

const requireProfileRole = async (req, allowedRoles) => {
  const { client, user } = await requireUser(req);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_suspended, is_deleted")
    .eq("id", user.id)
    .single();

  const isInactive =
    profile?.is_deleted ||
    (profile?.role !== "admin" && profile?.is_suspended);

  if (
    profileError ||
    !allowedRoles.includes(profile?.role) ||
    isInactive
  ) {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }

  return { client, user, profile };
};

export const requireAdmin = async (req) =>
  requireProfileRole(req, ["admin"]);

export const requireManager = async (req) =>
  requireProfileRole(req, ["manager", "admin"]);

