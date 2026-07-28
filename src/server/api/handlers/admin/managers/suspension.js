import {
  readJsonBody,
  sendError,
} from "../../../httpContract.js";

export const createHandler = (dependencies = {}) => {
  const readBody = dependencies.readJsonBody || readJsonBody;
  const authorizeAdmin = dependencies.requireAdmin;
  const respondWithError = dependencies.sendError || sendError;
  const adminClient = dependencies.supabaseAdmin;

  return async function handler(req, res) {
    if (req.method !== "PATCH") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { user: adminUser } = await authorizeAdmin(req);
      const body = await readBody(req);
      const userId = String(body.userId || "").trim();
      const suspended = Boolean(body.suspended);
      const suspensionReason = String(body.reason || "").trim() || null;

      if (!userId) {
        return res.status(400).json({ error: "userId es obligatorio." });
      }

      const { data: targetProfile, error: profileError } = await adminClient
        .from("profiles")
        .select(
          "id, role, is_suspended, suspended_at, suspended_by, suspension_reason",
        )
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

      const { data: profile, error: updateError } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select(
          "id, is_suspended, suspended_at, suspended_by, suspension_reason",
        )
        .single();

      if (updateError) throw updateError;

      const { error: authError } =
        await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: suspended ? "876000h" : "none",
        });

      if (authError) {
        const { error: rollbackError } = await adminClient
          .from("profiles")
          .update({
            is_suspended: Boolean(targetProfile.is_suspended),
            suspended_at: targetProfile.suspended_at || null,
            suspended_by: targetProfile.suspended_by || null,
            suspension_reason: targetProfile.suspension_reason || null,
          })
          .eq("id", userId)
          .eq("role", "manager");

        if (rollbackError) {
          console.error("Manager suspension rollback failed.", {
            code: rollbackError.code || null,
            name: rollbackError.name || "Error",
            requestId: res.requestId || null,
          });
        }

        throw authError;
      }

      return res.status(200).json({ success: true, profile });
    } catch (error) {
      return respondWithError(res, error);
    }
  };
};

export default createHandler;
