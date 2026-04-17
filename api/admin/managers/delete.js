import {
  readJsonBody,
  requireAdmin,
  sendError,
  supabaseAdmin,
} from "../../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireAdmin(req);
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "email es obligatorio." });
    }

    const { error } = await supabaseAdmin.rpc("borrar_usuario_por_email", {
      p_email: email,
    });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
}
