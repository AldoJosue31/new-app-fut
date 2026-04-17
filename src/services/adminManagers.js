import { supabase } from "../supabase/supabase.config";

const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("No hay una sesión activa para realizar esta acción.");
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
    throw new Error(data?.error || "No se pudo completar la operación.");
  }

  return data;
};

export const createManagerAdminService = async (payload) =>
  callAdminEndpoint("/api/admin/managers/create", "POST", payload);

export const updateManagerCredentialsService = async (payload) =>
  callAdminEndpoint("/api/admin/managers/update", "PATCH", payload);

export const deleteManagerAdminService = async (email) =>
  callAdminEndpoint("/api/admin/managers/delete", "DELETE", { email });
