import { supabase } from "../lib/supabase/browserClient.js";

const inFlightWorkspaceRequests = new Map();
const prefetchedWorkspaceResults = new Map();
const PREFETCH_TTL_MS = 15000;

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

const getRequestKey = (divisionId) => String(divisionId);

const readPrefetchedWorkspace = (requestKey) => {
  const prefetched = prefetchedWorkspaceResults.get(requestKey);
  if (!prefetched) return null;

  prefetchedWorkspaceResults.delete(requestKey);
  if (prefetched.expiresAt <= Date.now()) return null;
  return prefetched.data;
};

const startWorkspaceRequest = (divisionId, { cacheIfUnused = false } = {}) => {
  const requestKey = getRequestKey(divisionId);
  const entry = {
    cacheIfUnused,
    consumed: !cacheIfUnused,
    promise: null,
  };

  entry.promise = requestDivisionWorkspace(divisionId)
    .then((data) => {
      if (entry.cacheIfUnused && !entry.consumed) {
        prefetchedWorkspaceResults.set(requestKey, {
          data,
          expiresAt: Date.now() + PREFETCH_TTL_MS,
        });
      }
      return data;
    })
    .finally(() => {
      if (inFlightWorkspaceRequests.get(requestKey) === entry) {
        inFlightWorkspaceRequests.delete(requestKey);
      }
    });

  inFlightWorkspaceRequests.set(requestKey, entry);
  return entry;
};

export const getDivisionWorkspace = (divisionId) => {
  if (!divisionId) {
    return Promise.reject(new Error("divisionId es obligatorio."));
  }

  const requestKey = getRequestKey(divisionId);
  const prefetchedWorkspace = readPrefetchedWorkspace(requestKey);
  if (prefetchedWorkspace) return Promise.resolve(prefetchedWorkspace);

  const existingEntry = inFlightWorkspaceRequests.get(requestKey);
  if (existingEntry) {
    existingEntry.consumed = true;
    return existingEntry.promise;
  }

  return startWorkspaceRequest(divisionId).promise;
};

export const prefetchDivisionWorkspace = (divisionId) => {
  if (!divisionId) return Promise.resolve(null);

  const requestKey = getRequestKey(divisionId);
  const prefetched = prefetchedWorkspaceResults.get(requestKey);
  if (prefetched?.expiresAt > Date.now()) {
    return Promise.resolve(prefetched.data);
  }
  if (prefetched) prefetchedWorkspaceResults.delete(requestKey);

  const existingEntry = inFlightWorkspaceRequests.get(requestKey);
  if (existingEntry) return existingEntry.promise;

  return startWorkspaceRequest(divisionId, { cacheIfUnused: true }).promise;
};
