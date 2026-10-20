import { sendError } from "../../httpContract.js";
import { loadDelegateTournament } from "./teamTournament.js";
import { getCachedTournamentForecast } from "../../../analytics/tournamentForecast.js";

const getMovementAvailability = async (client, divisionId) => {
  const { data: division, error } = await client.from("divisions")
    .select("id, tier, category_id, league_id").eq("id", divisionId).maybeSingle();
  if (error) throw error;
  if (!division?.category_id || !division?.league_id || division.tier === null) return {};
  const { data: divisions, error: siblingsError } = await client.from("divisions")
    .select("id, tier").eq("category_id", division.category_id).eq("league_id", division.league_id);
  if (siblingsError) throw siblingsError;
  return {
    canPromote: (divisions || []).some((item) => item.tier !== null && Number(item.tier) < Number(division.tier)),
    canRelegate: (divisions || []).some((item) => item.tier !== null && Number(item.tier) > Number(division.tier)),
  };
};

export const createHandler = (dependencies = {}) => async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const bundle = await loadDelegateTournament(dependencies, req);
    const movement = bundle.tournament
      ? await getMovementAvailability(dependencies.supabaseAdmin, bundle.divisionId)
      : {};
    const forecast = (dependencies.getForecast || getCachedTournamentForecast)({ ...bundle, movement });
    return res.status(200).json({ forecast });
  } catch (error) {
    return (dependencies.sendError || sendError)(res, error);
  }
};
