import {
  readJsonBody,
  requireAdmin,
  sendError,
  supabaseAdmin,
} from "../../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireAdmin(req);
    const body = await readJsonBody(req);
    const userId = String(body.userId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!userId) {
      return res.status(400).json({ error: "userId es obligatorio." });
    }

    if (!email && !password) {
      return res.status(400).json({
        error: "Debes enviar al menos email o password.",
      });
    }

    const updates = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates,
    );

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
}
