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
      await authorizeAdmin(req);
      const body = await readBody(req);
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

      const { data: targetProfile, error: targetProfileError } =
        await adminClient
          .from("profiles")
          .select("id, role")
          .eq("id", userId)
          .maybeSingle();

      if (targetProfileError) throw targetProfileError;
      if (targetProfile?.role !== "manager") {
        return res.status(400).json({
          error: "Solo se pueden actualizar cuentas manager.",
        });
      }

      const updates = {};
      if (email) updates.email = email;
      if (password) updates.password = password;

      const { error } = await adminClient.auth.admin.updateUserById(
        userId,
        updates,
      );

      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (error) {
      return respondWithError(res, error);
    }
  };
};

export default createHandler;
