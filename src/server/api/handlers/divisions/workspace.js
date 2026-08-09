import {
  sendError,
} from "../../httpContract.js";
import { ACTIVE_TOURNAMENT_STATUSES } from "../../../../utils/constants.js";

const normalizeNumberParam = (value) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const withDivisionAliases = (division) => {
  if (!division) return null;

  const { leagues, categories, ...rest } = division;
  return {
    ...rest,
    league: leagues || null,
    category: categories || null,
  };
};

const withTournamentAliases = (tournament) => {
  if (!tournament) return null;

  const { divisions, ...rest } = tournament;
  return {
    ...rest,
    division: divisions || null,
  };
};

const fetchTournamentStandings = async (adminClient, tournamentId) => {
  if (!tournamentId) return [];

  const { data, error } = await adminClient
    .from("view_clasificacion")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("pts", { ascending: false })
    .order("pj", { ascending: false })
    .order("dg", { ascending: false });

  if (!error) return data || [];

  if (error.code === "42703" || /tournament_id/i.test(error.message || "")) {
    return [];
  }

  throw error;
};

export const createHandler = (dependencies = {}) => {
  const authorizeUser = dependencies.requireUser;
  const respondWithError = dependencies.sendError || sendError;
  const adminClient = dependencies.supabaseAdmin;

  return async function handler(req, res) {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { user } = await authorizeUser(req);
      const divisionId = normalizeNumberParam(req.query.divisionId);

      if (!divisionId) {
        return res.status(400).json({ error: "divisionId invalido." });
      }

      const { data: divisionData, error: divisionError } = await adminClient
        .from("divisions")
        .select(`
        id,
        name,
        tier,
        category_id,
        league_id,
        categories(id, name, tier),
        leagues!inner(id, name, default_config, logo_url, original_logo_url)
        `)
        .eq("id", divisionId)
        .eq("leagues.owner_id", user.id)
        .maybeSingle();

      if (divisionError) throw divisionError;

      if (!divisionData) {
        return res.status(404).json({ error: "Division no encontrada." });
      }

      const [
        { data: tournamentData, error: tournamentError },
        { data: teamsData, error: teamsError },
      ] = await Promise.all([
        adminClient
          .from("tournaments")
          .select(`
          *,
          jornadas(id, name, status, start_date, end_date),
          divisions(id, name, league_id)
          `)
          .eq("division_id", divisionId)
          .in("status", ACTIVE_TOURNAMENT_STATUSES)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
        adminClient
          .from("teams")
          .select("*, players(id)")
          .eq("division_id", divisionId)
          .order("name", { ascending: true }),
      ]);

      if (tournamentError) throw tournamentError;
      if (teamsError) throw teamsError;

      const activeTournament = withTournamentAliases(tournamentData);
      const [standings, matchesResult] = await Promise.all([
        fetchTournamentStandings(adminClient, activeTournament?.id),
        activeTournament?.id
          ? adminClient
            .from("matches")
            .select("*, jornadas!inner(id, name, tournament_id)")
            .eq("jornadas.tournament_id", activeTournament.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (matchesResult.error) throw matchesResult.error;

      const division = withDivisionAliases(divisionData);

      return res.status(200).json({
        division,
        league: division.league,
        activeTournament,
        teams: teamsData || [],
        standings,
        matches: matchesResult.data || [],
      });
    } catch (error) {
      return respondWithError(res, error);
    }
  };
};

export default createHandler;
