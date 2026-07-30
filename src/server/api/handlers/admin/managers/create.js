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
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      await authorizeAdmin(req);
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const fullName = String(body.fullName || "").trim();
      const leagueName = String(body.leagueName || "").trim();

      if (!email || !password || !fullName || !leagueName) {
        return res.status(400).json({
          error: "email, password, fullName y leagueName son obligatorios.",
        });
      }

      const { data: createdUserData, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (createError) throw createError;

      try {
        const { error: activationError } = await adminClient.rpc(
          "activar_nuevo_manager",
          {
            p_email: email,
            p_nombre: fullName,
            p_nombre_liga: leagueName,
          },
        );

        if (activationError) throw activationError;
      } catch (error) {
        const createdUserId = createdUserData?.user?.id;
        if (createdUserId) {
          await adminClient.auth.admin.deleteUser(createdUserId);
        }
        throw error;
      }

      return res.status(200).json({
        success: true,
        userId: createdUserData?.user?.id || null,
      });
    } catch (error) {
      return respondWithError(res, error);
    }
  };
};

export default createHandler;
