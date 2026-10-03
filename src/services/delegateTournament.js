import { supabase } from "../lib/supabase/browserClient.js";

export const getDelegateTournament = async (teamId, { signal } = {}) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error("Tu sesión terminó. Inicia sesión de nuevo.");

  const response = await fetch(`/api/delegates/teams/${encodeURIComponent(teamId)}/tournament`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "No se pudo cargar el torneo.");
  }

  return response.json();
};
