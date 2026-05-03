import { supabase } from "../supabase/supabase.config";

const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("No hay una sesion activa para realizar esta accion.");
  }

  return accessToken;
};

const callAdminEndpoint = async (path, method, payload = {}) => {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || "No se pudo completar la operacion.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const createManagerAdminService = async (payload) =>
  callAdminEndpoint("/api/admin/managers/create", "POST", payload);

export const updateManagerCredentialsService = async (payload) =>
  callAdminEndpoint("/api/admin/managers/update", "PATCH", payload);

export const updateManagerLimitsService = async (payload) => {
  if (!import.meta.env.DEV) {
    return callAdminEndpoint("/api/admin/managers/limits", "PATCH", payload);
  }

  const { leagueId, ...limits } = payload;
  const { data, error: updateError } = await supabase
    .from("leagues")
    .update(limits)
    .eq("id", leagueId)
    .select("id, max_divisions_total, max_teams_total, max_players_total")
    .single();

  if (updateError) throw updateError;
  return { success: true, league: data };
};

export const updateManagerSuspensionService = async (payload) => {
  if (!import.meta.env.DEV) {
    return callAdminEndpoint("/api/admin/managers/suspension", "PATCH", payload);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const suspended = Boolean(payload.suspended);
  const updates = {
    is_suspended: suspended,
    suspended_at: suspended ? new Date().toISOString() : null,
    suspended_by: suspended ? user?.id || null : null,
    suspension_reason: suspended ? payload.reason || null : null,
  };

  const { data, error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", payload.userId)
    .eq("role", "manager")
    .select("id, is_suspended, suspended_at, suspended_by, suspension_reason")
    .single();

  if (updateError) throw updateError;
  return { success: true, profile: data };
};

export const deleteManagerAdminService = async (email) =>
  callAdminEndpoint("/api/admin/managers/delete", "DELETE", { email });
