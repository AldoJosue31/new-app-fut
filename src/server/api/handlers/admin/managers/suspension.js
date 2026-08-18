import {
  readJsonBody,
  sendError,
} from "../../../httpContract.js";

const hasActiveAuthBan = (bannedUntil) => {
  const timestamp = Date.parse(bannedUntil || "");
  return Number.isFinite(timestamp) && timestamp > Date.now();
};

export const createHandler = (dependencies = {}) => {
  const readBody = dependencies.readJsonBody || readJsonBody;
  const authorizeAdmin = dependencies.requireAdmin;
  const respondWithError = dependencies.sendError || sendError;
  const serviceClient = dependencies.supabaseAdmin;

  return async function handler(req, res) {
    if (req.method !== "PATCH") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let stage = "authorize-admin";

    try {
      const { client: authenticatedAdminClient, user: adminUser } =
        await authorizeAdmin(req);
      const profileClient = authenticatedAdminClient || serviceClient;
      const body = await readBody(req);
      const userId = String(body.userId || "").trim();
      const suspended = Boolean(body.suspended);
      const suspensionReason = String(body.reason || "").trim() || null;

      if (!userId) {
        return res.status(400).json({ error: "userId es obligatorio." });
      }

      stage = "read-target-profile";
      const { data: targetProfile, error: profileError } = await serviceClient
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

      let shouldSyncAuthBan = suspended;
      if (!suspended) {
        stage = "read-auth-ban";
        const { data: authUserData, error: authUserError } =
          await serviceClient.auth.admin.getUserById(userId);

        if (authUserError) throw authUserError;
        shouldSyncAuthBan = hasActiveAuthBan(
          authUserData?.user?.banned_until,
        );
      }

      const updates = {
        is_suspended: suspended,
        suspended_at: suspended ? new Date().toISOString() : null,
        suspended_by: suspended ? adminUser.id : null,
        suspension_reason: suspended ? suspensionReason : null,
      };

      stage = "update-profile";
      const { data: profile, error: updateError } = await profileClient
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select(
          "id, is_suspended, suspended_at, suspended_by, suspension_reason",
        )
        .single();

      if (updateError) throw updateError;

      if (shouldSyncAuthBan) {
        stage = "update-auth-ban";
        const { error: authError } =
          await serviceClient.auth.admin.updateUserById(userId, {
            ban_duration: suspended ? "876000h" : "none",
          });

        if (authError) {
          const failedStage = stage;
          stage = "rollback-profile";
          const { error: rollbackError } = await profileClient
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

          stage = failedStage;
          throw authError;
        }
      }

      return res.status(200).json({ success: true, profile });
    } catch (error) {
      console.error(
        `Manager suspension failed. stage=${stage} code=${error?.code || "none"} name=${error?.name || "Error"} requestId=${res.requestId || "none"}`,
      );
      return respondWithError(res, error);
    }
  };
};

export default createHandler;
