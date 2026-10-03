import { sendError } from "../../httpContract.js";
import { ACTIVE_TOURNAMENT_STATUSES, ROLES } from "../../../../utils/constants.js";

const fail = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const normalizeTournamentConfig = (config) => {
  let source = config;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { source = {}; }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
  return {
    participatingIds: Array.isArray(source.participatingIds) ? source.participatingIds : [],
    winPoints: source.winPoints,
    drawPoints: source.drawPoints,
    lossPoints: source.lossPoints,
    ascensos: source.ascensos,
    descensos: source.descensos,
    zonaLiguilla: source.zonaLiguilla,
    clasificados: source.clasificados,
    repechajeTeams: source.repechajeTeams,
    tieBreakType: source.tieBreakType,
    repositionMappings: source.repositionMappings,
    repositionMatchMappings: source.repositionMatchMappings,
  };
};

const publicMatch = (match) => ({
  id: match.id,
  jornada_id: match.jornada_id,
  team1_id: match.team1_id,
  team2_id: match.team2_id,
  date: match.date,
  status: match.status,
  goals1: match.goals1,
  goals2: match.goals2,
  puntos1: match.puntos1,
  puntos2: match.puntos2,
  jornadas: match.jornadas,
  observations: /doble\s*w\.?o\.?|ambos\s+pierden\s+por\s+default/i.test(match.observations || "")
    ? "Doble W.O."
    : (String(match.observations || "").match(/Pen.*?:\s*\d+\s*-\s*\d+/i)?.[0] || ""),
});

const MATCH_PAGE_SIZE = 1000;

const fetchTournamentMatches = async (adminClient, tournamentId) => {
  const matches = [];
  for (let from = 0; ; from += MATCH_PAGE_SIZE) {
    const { data, error } = await adminClient.from("matches")
      .select("id, jornada_id, team1_id, team2_id, date, status, goals1, goals2, puntos1, puntos2, observations, jornadas!inner(id, name, tournament_id)")
      .eq("jornadas.tournament_id", tournamentId)
      .order("id", { ascending: true })
      .range(from, from + MATCH_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    matches.push(...page);
    if (page.length < MATCH_PAGE_SIZE) return matches;
  }
};

export const createHandler = (dependencies = {}) => {
  const authorizeUser = dependencies.requireUser;
  const adminClient = dependencies.supabaseAdmin;
  const respondWithError = dependencies.sendError || sendError;

  return async function handler(req, res) {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { user } = await authorizeUser(req);
      const teamId = Number(req.query.teamId);
      if (!Number.isSafeInteger(teamId) || teamId <= 0) {
        return res.status(400).json({ error: "teamId invalido." });
      }

      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("id, role, is_suspended, is_deleted")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (
        profile?.role !== ROLES.DELEGATE ||
        profile.is_suspended ||
        profile.is_deleted
      ) {
        fail("No tienes acceso a este equipo.", 403);
      }

      const { data: assignment, error: assignmentError } = await adminClient
        .from("team_delegates")
        .select("team_id")
        .eq("team_id", teamId)
        .eq("delegate_profile_id", user.id)
        .maybeSingle();
      if (assignmentError) throw assignmentError;
      if (!assignment) fail("No tienes acceso a este equipo.", 403);

      const { data: team, error: teamError } = await adminClient
        .from("teams")
        .select("id, division_id")
        .eq("id", teamId)
        .maybeSingle();
      if (teamError) throw teamError;
      if (!team) fail("Equipo no encontrado.", 404);

      const { data: tournament, error: tournamentError } = await adminClient
        .from("tournaments")
        .select("id, season, category, format, status, start_date, config")
        .eq("division_id", team.division_id)
        .in("status", ACTIVE_TOURNAMENT_STATUSES)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tournamentError) throw tournamentError;
      if (!tournament) {
        return res.status(200).json({ tournament: null, teams: [], jornadas: [], matches: [] });
      }

      const config = normalizeTournamentConfig(tournament.config);
      const participantIds = [...new Set(config.participatingIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
      if (!participantIds.includes(teamId)) {
        return res.status(200).json({ tournament: null, teams: [], jornadas: [], matches: [] });
      }
      const [teamsResult, jornadasResult, matchesResult] = await Promise.all([
        participantIds.length
          ? adminClient.from("teams")
            .select("id, name, logo_url, color")
            .eq("division_id", team.division_id)
            .in("id", participantIds)
          : Promise.resolve({ data: [], error: null }),
        adminClient.from("jornadas")
          .select("id, name, status, tournament_id, start_date, end_date")
          .eq("tournament_id", tournament.id),
        fetchTournamentMatches(adminClient, tournament.id),
      ]);
      if (teamsResult.error) throw teamsResult.error;
      if (jornadasResult.error) throw jornadasResult.error;

      return res.status(200).json({
        tournament: {
          id: tournament.id,
          season: tournament.season,
          category: tournament.category,
          format: tournament.format,
          status: tournament.status,
          start_date: tournament.start_date,
          config,
        },
        teams: teamsResult.data || [],
        jornadas: jornadasResult.data || [],
        matches: matchesResult.map(publicMatch),
      });
    } catch (error) {
      return respondWithError(res, error);
    }
  };
};
