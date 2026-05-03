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
    const { user: adminUser } = await requireAdmin(req);
    const body = await readJsonBody(req);
    const userId = String(body.userId || "").trim();
    const suspended = Boolean(body.suspended);
    const suspensionReason = String(body.reason || "").trim() || null;

    if (!userId) {
      return res.status(400).json({ error: "userId es obligatorio." });
    }

    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    if (targetProfile?.role !== "manager") {
      return res.status(400).json({
        error: "Solo se pueden suspender cuentas manager.",
      });
    }

    const updates = {
      is_suspended: suspended,
      suspended_at: suspended ? new Date().toISOString() : null,
      suspended_by: suspended ? adminUser.id : null,
      suspension_reason: suspended ? suspensionReason : null,
    };

    const { data: profile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id, is_suspended, suspended_at, suspended_by, suspension_reason")
      .single();

    if (updateError) throw updateError;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: suspended ? "876000h" : "none" },
    );

    if (authError) throw authError;

    return res.status(200).json({ success: true, profile });
  } catch (error) {
    return sendError(res, error);
  }
}
