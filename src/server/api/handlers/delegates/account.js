import { readJsonBody } from "../../httpContract.js";

const normalizeName = (value) =>
  String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");

const normalizeEmail = (value) =>
  String(value || "").trim().toLowerCase();

const fail = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const sendAccountError = (response, error) => {
  const statusCode = error?.statusCode || 500;
  const message =
    statusCode >= 500
      ? "No se pudo actualizar el delegado."
      : error?.message || "No se pudo actualizar el delegado.";

  if (statusCode >= 500) {
    console.error("Delegate account request failed.", {
      code: error?.code || null,
      name: error?.name || "Error",
      requestId: response.requestId || null,
    });
  }

  return response.status(statusCode).json({ error: message });
};

export const authorizeTeamManager = async (
  request,
  teamId,
  { requireUser, supabaseAdmin },
) => {
  const { user } = await requireUser(request);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_suspended, is_deleted")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.is_suspended ||
    profile.is_deleted ||
    !["admin", "manager"].includes(profile.role)
  ) {
    fail("No tienes permisos para administrar este delegado.", 403);
  }

  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, name, division_id, delegate_name, contact_phone")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw teamError;
  if (!team) fail("No se encontro el equipo.", 404);

  if (profile.role !== "admin") {
    const { data: division, error: divisionError } = await supabaseAdmin
      .from("divisions")
      .select("league_id")
      .eq("id", team.division_id)
      .maybeSingle();

    if (divisionError) throw divisionError;
    if (!division) fail("No se encontro la division del equipo.", 404);

    const { data: league, error: leagueError } = await supabaseAdmin
      .from("leagues")
      .select("owner_id")
      .eq("id", division.league_id)
      .maybeSingle();

    if (leagueError) throw leagueError;

    let canManageLeague = league?.owner_id === user.id;

    if (!canManageLeague) {
      const { data: leagueAdmin, error: leagueAdminError } =
        await supabaseAdmin
          .from("league_admins")
          .select("user_id")
          .eq("league_id", division.league_id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (leagueAdminError) throw leagueAdminError;
      canManageLeague = Boolean(leagueAdmin);
    }

    if (!canManageLeague) {
      fail("No tienes permisos para administrar este equipo.", 403);
    }
  }

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from("team_delegates")
    .select("delegate_profile_id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment?.delegate_profile_id) {
    fail("Este equipo no tiene un delegado registrado.", 404);
  }

  const { data: delegateProfile, error: delegateProfileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", assignment.delegate_profile_id)
      .maybeSingle();

  if (delegateProfileError) throw delegateProfileError;
  if (delegateProfile?.role !== "delegate") {
    fail("La cuenta vinculada no corresponde a un delegado.", 409);
  }

  return {
    actorProfileId: user.id,
    delegateProfileId: assignment.delegate_profile_id,
    team,
  };
};

export const createHandler = (dependencies = {}) => {
  const readBody = dependencies.readJsonBody || readJsonBody;
  const authorize =
    dependencies.authorizeTeamManager ||
    ((request, teamId) =>
      authorizeTeamManager(request, teamId, dependencies));
  const adminClient = dependencies.supabaseAdmin;

  return async function handler(request, response) {
    if (request.method !== "POST") {
      return response.status(405).json({ error: "Method not allowed" });
    }

    try {
      const body = await readBody(request);
      const action = String(body.action || "get");
      const teamId = Number(body.teamId);

      if (!Number.isInteger(teamId) || teamId <= 0) {
        return response.status(400).json({
          error: "teamId es obligatorio.",
        });
      }

      const {
        actorProfileId,
        delegateProfileId,
        team,
      } = await authorize(request, teamId);

      const { data: authData, error: authError } =
        await adminClient.auth.admin.getUserById(delegateProfileId);

      if (authError || !authData?.user) {
        fail("No se pudo obtener la cuenta del delegado.", 404);
      }

      const delegateAuthUser = authData.user;

      if (action === "get") {
        return response.status(200).json({
          success: true,
          email: delegateAuthUser.email || "",
        });
      }

      if (action !== "update") {
        return response.status(400).json({ error: "Accion no valida." });
      }

      const fullName = normalizeName(body.fullName);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const reason = normalizeName(body.reason);
      const confirmed = body.confirmed === true;

      if (!fullName) {
        return response.status(400).json({
          error: "El nombre es obligatorio.",
        });
      }

      if (fullName.length > 45) {
        return response.status(400).json({
          error: "El nombre admite maximo 45 caracteres.",
        });
      }

      if (
        email &&
        (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      ) {
        return response.status(400).json({
          error: "Escribe un correo valido.",
        });
      }

      if (password && password.length < 6) {
        return response.status(400).json({
          error: "La nueva contrasena debe tener al menos 6 caracteres.",
        });
      }

      const changedFields = [];
      if (fullName !== normalizeName(team.delegate_name)) {
        changedFields.push("name");
      }
      if (email && email !== normalizeEmail(delegateAuthUser.email)) {
        changedFields.push("email");
      }
      if (password) changedFields.push("password");

      if (!changedFields.length) {
        return response.status(400).json({
          error: "No hay cambios para aplicar.",
        });
      }

      const changesCredentials = changedFields.some(
        (field) => field === "email" || field === "password",
      );

      if (
        reason.length > 240 ||
        (reason.length > 0 && reason.length < 5) ||
        (changesCredentials && !reason)
      ) {
        return response.status(400).json({
          error: changesCredentials
            ? "Escribe un motivo de entre 5 y 240 caracteres para cambiar los datos de acceso."
            : "El motivo es opcional, pero si lo agregas debe tener entre 5 y 240 caracteres.",
        });
      }

      if (changesCredentials && !confirmed) {
        return response.status(400).json({
          error: "Debes confirmar expresamente el cambio de la cuenta.",
        });
      }

      const auditReason =
        reason || "Actualizacion del nombre del delegado.";
      const [auditPreflight, notificationPreflight] = await Promise.all([
        adminClient
          .from("delegate_account_audit_logs")
          .select("id")
          .limit(1),
        adminClient
          .from("account_security_notifications")
          .select("id")
          .limit(1),
      ]);

      if (auditPreflight.error || notificationPreflight.error) {
        throw auditPreflight.error || notificationPreflight.error;
      }

      const authUpdates = {};
      if (changedFields.includes("email")) authUpdates.email = email;
      if (changedFields.includes("password")) authUpdates.password = password;

      let updatedEmail = delegateAuthUser.email || "";
      if (Object.keys(authUpdates).length > 0) {
        const { data: updatedAuth, error: updateAuthError } =
          await adminClient.auth.admin.updateUserById(
            delegateProfileId,
            authUpdates,
          );

        if (updateAuthError) {
          fail("No se pudieron actualizar los datos de acceso.", 400);
        }

        updatedEmail =
          updatedAuth.user?.email || email || updatedEmail;
      }

      let updatedTeam = {
        id: team.id,
        delegate_name: team.delegate_name,
        contact_phone: team.contact_phone,
      };

      if (changedFields.includes("name")) {
        const teamUpdates = { delegate_name: fullName };
        if (
          team.contact_phone !== null &&
          !String(team.contact_phone).trim()
        ) {
          teamUpdates.contact_phone = null;
        }

        const { data, error: updateTeamError } = await adminClient
          .from("teams")
          .update(teamUpdates)
          .eq("id", teamId)
          .select("id, delegate_name, contact_phone")
          .single();

        if (updateTeamError) throw updateTeamError;
        updatedTeam = data;
      }

      if (
        changedFields.includes("name") ||
        changedFields.includes("email")
      ) {
        const profileUpdates = {};
        if (changedFields.includes("name")) {
          profileUpdates.full_name = fullName;
        }
        if (changedFields.includes("email") && updatedEmail) {
          profileUpdates.email = updatedEmail;
        }

        const { error: updateProfileError } = await adminClient
          .from("profiles")
          .update(profileUpdates)
          .eq("id", delegateProfileId)
          .eq("role", "delegate");

        if (updateProfileError) throw updateProfileError;
      }

      const { data: auditLog, error: auditError } = await adminClient
        .from("delegate_account_audit_logs")
        .insert({
          team_id: teamId,
          delegate_profile_id: delegateProfileId,
          actor_profile_id: actorProfileId,
          reason: auditReason,
          changed_fields: changedFields,
        })
        .select("id")
        .single();

      if (auditError) throw auditError;

      const fieldLabels = {
        name: "el nombre",
        email: "el correo de acceso",
        password: "la contrasena",
      };
      const changedLabels = changedFields.map(
        (field) => fieldLabels[field],
      );
      const changeSummary =
        changedLabels.length === 1
          ? changedLabels[0]
          : `${changedLabels.slice(0, -1).join(", ")} y ${
              changedLabels.at(-1)
            }`;

      const { error: notificationError } = await adminClient
        .from("account_security_notifications")
        .insert({
          user_id: delegateProfileId,
          title: "Cambios en tu cuenta",
          message:
            `Un administrador actualizo ${changeSummary} para ` +
            `${team.name}. Motivo: ${auditReason}`,
          metadata: {
            team_id: teamId,
            actor_profile_id: actorProfileId,
            changed_fields: changedFields,
            audit_id: auditLog.id,
          },
        });

      if (notificationError) throw notificationError;

      return response.status(200).json({
        success: true,
        email: updatedEmail,
        team: updatedTeam,
        credentialsUpdated: Object.keys(authUpdates).length > 0,
        changedFields,
        auditRecorded: true,
        notificationCreated: true,
      });
    } catch (error) {
      return sendAccountError(response, error);
    }
  };
};

export default createHandler;
