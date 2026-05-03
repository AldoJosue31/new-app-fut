import {
  readJsonBody,
  requireAdmin,
  sendError,
  supabaseAdmin,
} from "../../_lib/supabaseAdmin.js";

const normalizeLimit = (value, fieldName) => {
  if (value === null || value === undefined || value === "") return null;

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    const error = new Error(`${fieldName} debe ser un entero mayor o igual a 0.`);
    error.statusCode = 400;
    throw error;
  }

  return parsedValue;
};

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireAdmin(req);
    const body = await readJsonBody(req);
    const leagueId = Number(body.leagueId);

    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      return res.status(400).json({ error: "leagueId es obligatorio." });
    }

    const updates = {
      max_divisions_total: normalizeLimit(
        body.max_divisions_total,
        "max_divisions_total",
      ),
      max_teams_total: normalizeLimit(body.max_teams_total, "max_teams_total"),
      max_players_total: normalizeLimit(
        body.max_players_total,
        "max_players_total",
      ),
    };

    const { data, error } = await supabaseAdmin
      .from("leagues")
      .update(updates)
      .eq("id", leagueId)
      .select("id, max_divisions_total, max_teams_total, max_players_total")
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, league: data });
  } catch (error) {
    return sendError(res, error);
  }
}
