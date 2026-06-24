import { supabase } from "../supabase/supabase.config";
import {
  getAllMatchesByTournament,
  getEquiposDivision,
  getTorneoActivo,
} from "./torneos";
import { getLeagueById } from "./leagues";

const parseApiError = async (response) => {
  try {
    const body = await response.json();
    return body?.error || `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
};

const withDivisionAliases = (division) => {
  if (!division) return null;

  return {
    ...division,
    league: division.leagues || division.league || null,
    category: division.categories || division.category || null,
  };
};

const getStandingsByTournament = async (tournamentId, divisionName) => {
  if (!tournamentId && !divisionName) return [];

  let query = supabase
    .from("view_clasificacion")
    .select("*")
    .order("pts", { ascending: false })
    .order("pj", { ascending: false })
    .order("dg", { ascending: false });

  if (tournamentId) {
    const { data, error } = await query.eq("tournament_id", tournamentId);

    if (!error) return data || [];

    if (error.code !== "42703" && !/tournament_id/i.test(error.message || "")) {
      throw error;
    }
  }

  if (!divisionName) return [];

  const { data, error } = await supabase
    .from("view_clasificacion")
    .select("*")
    .eq("division", divisionName)
    .order("pts", { ascending: false })
    .order("pj", { ascending: false })
    .order("dg", { ascending: false });

  if (error) throw error;
  return data || [];
};

const getDivisionWorkspaceFromSupabase = async (divisionId) => {
  const { data: divisionData, error: divisionError } = await supabase
    .from("divisions")
    .select("*, categories(id, name, tier), leagues(id, name, default_config, logo_url, original_logo_url)")
    .eq("id", divisionId)
    .maybeSingle();

  if (divisionError) throw divisionError;
  if (!divisionData) throw new Error("Division no encontrada.");

  const division = withDivisionAliases(divisionData);
  const [activeTournament, teams, league] = await Promise.all([
    getTorneoActivo(divisionId),
    getEquiposDivision(divisionId),
    division.league_id ? getLeagueById(division.league_id) : Promise.resolve(division.league),
  ]);

  const [standings, matches] = await Promise.all([
    getStandingsByTournament(activeTournament?.id, division.name),
    activeTournament?.id ? getAllMatchesByTournament(activeTournament.id) : Promise.resolve([]),
  ]);

  return {
    division,
    league,
    activeTournament,
    teams,
    standings,
    matches,
  };
};

export const getDivisionWorkspace = async (divisionId) => {
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

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return getDivisionWorkspaceFromSupabase(divisionId);
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json();
};
