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
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      await authorizeAdmin(req);
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();

      if (!email) {
        return res.status(400).json({ error: "email es obligatorio." });
      }

      const { data: targetProfile, error: targetProfileError } =
        await adminClient
          .from("profiles")
          .select("id, role")
          .eq("email", email)
          .maybeSingle();

      if (targetProfileError) throw targetProfileError;
      if (targetProfile?.role !== "manager") {
        return res.status(400).json({
          error: "Solo se pueden eliminar cuentas manager.",
        });
      }

      const { error } = await adminClient.rpc("borrar_usuario_por_email", {
        p_email: email,
      });

      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (error) {
      return respondWithError(res, error);
    }
  };
};

export default createHandler;
