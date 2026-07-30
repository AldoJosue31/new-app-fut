import { supabase } from "../lib/supabase/browserClient.js";

const inFlightWorkspaceRequests = new Map();

const parseApiError = async (response) => {
  try {
    const body = await response.json();
    return body?.error || `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
};

const requestDivisionWorkspace = async (divisionId) => {
  if (!divisionId) {
    throw new Error("divisionId es obligatorio.");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("No hay una sesion activa.");
  }

  const response = await fetch(`/api/divisions/${divisionId}/workspace`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json();
};

export const getDivisionWorkspace = (divisionId) => {
  if (!divisionId) {
    return Promise.reject(new Error("divisionId es obligatorio."));
  }

  const requestKey = String(divisionId);
  const existingRequest = inFlightWorkspaceRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = requestDivisionWorkspace(divisionId).finally(() => {
    if (inFlightWorkspaceRequests.get(requestKey) === request) {
      inFlightWorkspaceRequests.delete(requestKey);
    }
  });

  inFlightWorkspaceRequests.set(requestKey, request);
  return request;
};
