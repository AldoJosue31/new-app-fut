import {
  readJsonBody,
  requireManager,
  sendError,
  supabaseAdmin,
} from "../_lib/supabaseAdmin.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u;
const PHONE_PATTERN = /^\+?[0-9](?:[0-9 ()-]{5,23}[0-9])?$/;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeText = (value) =>
  String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");

const getAuthorizedDelegateContext = async (user, profile, teamId) => {
  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, division_id, delegate_name, contact_phone")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team) throw createHttpError("Equipo no encontrado.", 404);

  if (profile.role !== "admin") {
    const { data: division, error: divisionError } = await supabaseAdmin
      .from("divisions")
      .select("league_id")
      .eq("id", team.division_id)
      .maybeSingle();

    if (divisionError) throw divisionError;
    if (!division) throw createHttpError("Division no encontrada.", 404);

    const [{ data: league, error: leagueError }, { data: leagueAdmin, error: adminError }] =
      await Promise.all([
        supabaseAdmin
          .from("leagues")
          .select("owner_id")
          .eq("id", division.league_id)
          .maybeSingle(),
        supabaseAdmin
          .from("league_admins")
          .select("id")
          .eq("league_id", division.league_id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    if (leagueError) throw leagueError;
    if (adminError) throw adminError;

    const canManageTeam = league?.owner_id === user.id || Boolean(leagueAdmin);
    if (!canManageTeam) {
      throw createHttpError(
        "No tienes permiso para editar al delegado de este equipo.",
        403,
      );
    }
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from("team_delegates")
    .select("delegate_profile_id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment?.delegate_profile_id) {
    throw createHttpError("Este equipo no tiene un delegado vinculado.", 404);
  }

  const { data: delegateProfile, error: delegateProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, metadata, role")
    .eq("id", assignment.delegate_profile_id)
    .eq("role", "delegate")
    .maybeSingle();

  if (delegateProfileError) throw delegateProfileError;
  if (!delegateProfile) {
    throw createHttpError("No se encontro el perfil del delegado.", 404);
  }

  const { data: authUserData, error: authUserError } =
    await supabaseAdmin.auth.admin.getUserById(delegateProfile.id);

  if (authUserError) throw authUserError;
  if (!authUserData?.user) {
    throw createHttpError("No se encontro la cuenta de acceso del delegado.", 404);
  }

  return {
    team,
    delegateProfile,
    authUser: authUserData.user,
  };
};

const serializeDelegate = ({ team, delegateProfile, authUser }) => ({
  id: delegateProfile.id,
  fullName: delegateProfile.full_name || team.delegate_name || "",
  email: authUser.email || delegateProfile.email || "",
  phone: team.contact_phone || delegateProfile.metadata?.contact_phone || "",
});

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user, profile } = await requireManager(req);
    const body = req.method === "PATCH" ? await readJsonBody(req) : {};
    const teamId = Number(req.method === "GET" ? req.query?.teamId : body.teamId);

    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw createHttpError("teamId es obligatorio.", 400);
    }

    const context = await getAuthorizedDelegateContext(user, profile, teamId);

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        delegate: serializeDelegate(context),
      });
    }

    const fullName = normalizeText(body.fullName);
    const email = normalizeText(body.email).toLowerCase();
    const phone = normalizeText(body.phone);
    const password = String(body.password || "");

    if (!fullName || fullName.length > 45 || !NAME_PATTERN.test(fullName)) {
      throw createHttpError(
        "Escribe un nombre valido de hasta 45 caracteres.",
        400,
      );
    }

    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      throw createHttpError("Escribe un correo valido.", 400);
    }

    if (phone && (phone.length > 25 || !PHONE_PATTERN.test(phone))) {
      throw createHttpError("Escribe un telefono valido.", 400);
    }

    if (password && (password.length < 6 || password.length > 72)) {
      throw createHttpError(
        "La nueva contrasena debe tener entre 6 y 72 caracteres.",
        400,
      );
    }

    const authUpdates = {
      email,
      user_metadata: {
        ...(context.authUser.user_metadata || {}),
        full_name: fullName,
      },
    };
    if (password) authUpdates.password = password;

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        context.delegateProfile.id,
        authUpdates,
      );

    if (authUpdateError) {
      authUpdateError.statusCode = 400;
      throw authUpdateError;
    }

    const nextMetadata = {
      ...(context.delegateProfile.metadata || {}),
      contact_phone: phone || null,
    };

    const [{ error: profileUpdateError }, { error: teamUpdateError }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .update({
            full_name: fullName,
            email,
            metadata: nextMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", context.delegateProfile.id)
          .eq("role", "delegate"),
        supabaseAdmin
          .from("teams")
          .update({
            delegate_name: fullName,
            contact_phone: phone || null,
          })
          .eq("id", teamId),
      ]);

    if (profileUpdateError) throw profileUpdateError;
    if (teamUpdateError) throw teamUpdateError;

    const delegate = {
      id: context.delegateProfile.id,
      fullName,
      email,
      phone,
    };

    return res.status(200).json({ success: true, delegate });
  } catch (error) {
    return sendError(res, error);
  }
}
