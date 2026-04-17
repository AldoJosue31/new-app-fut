import { createClient } from "@supabase/supabase-js";

const env = globalThis.process?.env || {};

const supabaseUrl =
  env.SUPABASE_URL ||
  env.VITE_APP_SUPABASE_URL;

const serviceRoleKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.VITE_APP_SUPABASE_SERVICE_ROLE_KEY;

const anonKey =
  env.SUPABASE_ANON_KEY ||
  env.VITE_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing Supabase URL for server-side admin API.");
}

if (!serviceRoleKey) {
  throw new Error("Missing Supabase service role key for server-side admin API.");
}

if (!anonKey) {
  throw new Error("Missing Supabase anon key for server-side admin API.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const parseAuthorizationHeader = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
};

export const createUserScopedClient = (accessToken) =>
  createClient(supabaseUrl, anonKey, {
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

export const readJsonBody = async (req) => {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }
  return req.body;
};

export const requireAdmin = async (req) => {
  const accessToken = parseAuthorizationHeader(req);
  if (!accessToken) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const client = createUserScopedClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }

  return { user, profile };
};

export const sendError = (res, error) => {
  const statusCode = error?.statusCode || 500;
  return res.status(statusCode).json({
    error: error?.message || "Unexpected server error",
  });
};
