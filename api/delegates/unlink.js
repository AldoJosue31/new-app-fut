import {
  readJsonBody,
  requireManager,
  requireUser,
  sendError,
  supabaseAdmin,
} from "../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireManager(req);
    const { client, user } = await requireUser(req);
    const body = await readJsonBody(req);
    const teamId = Number(body.teamId);
    const deleteAccount = body.deleteAccount !== false;

    if (!Number.isInteger(teamId) || teamId <= 0) {
      return res.status(400).json({ error: "teamId es obligatorio." });
    }

    const { data, error } = await client.rpc("unlink_team_delegate", {
      p_team_id: teamId,
    });

    if (error) throw error;
    if (!data?.success) {
      return res.status(400).json({
        error: data?.message || "No se pudo desvincular al delegado.",
      });
    }

    const baseResponse = {
      success: true,
      teamId,
      delegateProfileId: data?.delegate_profile_id || null,
      remainingAssignments: Number(data?.remaining_assignments || 0),
      accountDeleted: false,
      accountSuspended: false,
      message: "Delegado desvinculado.",
    };

    if (!deleteAccount || !baseResponse.delegateProfileId) {
      return res.status(200).json(baseResponse);
    }

    if (baseResponse.remainingAssignments > 0) {
      return res.status(200).json({
        ...baseResponse,
        message:
          "Delegado desvinculado de este equipo. La cuenta no se elimino porque sigue vinculada a otros equipos.",
      });
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_by: user.id,
        suspension_reason: "Cuenta removida por el manager de la liga.",
      })
      .eq("id", baseResponse.delegateProfileId)
      .eq("role", "delegate");

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      baseResponse.delegateProfileId
    );

    if (deleteError) {
      return res.status(200).json({
        ...baseResponse,
        accountSuspended: true,
        message:
          "Delegado desvinculado. La cuenta quedo suspendida porque no se pudo borrar automaticamente.",
        warning: deleteError.message,
      });
    }

    return res.status(200).json({
      ...baseResponse,
      accountDeleted: true,
      message: "Delegado desvinculado y cuenta eliminada.",
    });
  } catch (error) {
    return sendError(res, error);
  }
}
