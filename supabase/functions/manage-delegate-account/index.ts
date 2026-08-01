import { createClient } from "@supabase/supabase-js";
import { corsJsonResponse, resolveCors } from "../_shared/edgeSecurity.ts";

const fail = (message: string, status: number): never => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  throw error;
};

const normalizeName = (value: unknown) =>
  String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");

const normalizeEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const authorizeTeamManager = async (
  req: Request,
  teamId: number,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
) => {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) fail("No autorizado.", 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) fail("La sesion no es valida.", 401);
  const authenticatedUser = user!;

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, is_suspended, is_deleted")
    .eq("id", authenticatedUser.id)
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
  const activeProfile = profile!;

  const { data: team, error: teamError } = await adminClient
    .from("teams")
    .select("id, name, division_id, delegate_name, contact_phone")
    .eq("id", teamId)
    .maybeSingle();
  if (teamError) throw teamError;
  if (!team) fail("No se encontro el equipo.", 404);
  const managedTeam = team!;

  if (activeProfile.role !== "admin") {
    const { data: division, error: divisionError } = await adminClient
      .from("divisions")
      .select("league_id")
      .eq("id", managedTeam.division_id)
      .maybeSingle();
    if (divisionError) throw divisionError;
    if (!division) fail("No se encontro la division del equipo.", 404);
    const managedDivision = division!;

    const { data: league, error: leagueError } = await adminClient
      .from("leagues")
      .select("owner_id")
      .eq("id", managedDivision.league_id)
      .maybeSingle();
    if (leagueError) throw leagueError;

    let canManageLeague = league?.owner_id === authenticatedUser.id;
    if (!canManageLeague) {
      const { data: leagueAdmin, error: leagueAdminError } = await adminClient
        .from("league_admins")
        .select("user_id")
        .eq("league_id", managedDivision.league_id)
        .eq("user_id", authenticatedUser.id)
        .maybeSingle();
      if (leagueAdminError) throw leagueAdminError;
      canManageLeague = Boolean(leagueAdmin);
    }

    if (!canManageLeague) {
      fail("No tienes permisos para administrar este equipo.", 403);
    }
  }

  const { data: assignment, error: assignmentError } = await adminClient
    .from("team_delegates")
    .select("delegate_profile_id")
    .eq("team_id", teamId)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment?.delegate_profile_id) {
    fail("Este equipo no tiene un delegado registrado.", 404);
  }
  const delegateAssignment = assignment!;

  const { data: delegateProfile, error: delegateProfileError } =
    await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", delegateAssignment.delegate_profile_id)
      .maybeSingle();
  if (delegateProfileError) throw delegateProfileError;
  if (delegateProfile?.role !== "delegate") {
    fail("La cuenta vinculada no corresponde a un delegado.", 409);
  }

  return {
    adminClient,
    actorProfileId: authenticatedUser.id,
    delegateProfileId: delegateAssignment.delegate_profile_id as string,
    team: managedTeam,
  };
};

type HandlerDependencies = {
  getEnv?: (name: string) => string | undefined;
  authorizeTeamManager?: typeof authorizeTeamManager;
};

export const createHandler = (dependencies: HandlerDependencies = {}) => {
  const getEnv = dependencies.getEnv || ((name: string) => Deno.env.get(name));
  const authorize = dependencies.authorizeTeamManager || authorizeTeamManager;

  return async (req: Request) => {
    const cors = resolveCors(req, { getEnv });
    const jsonResponse = (body: unknown, status = 200) =>
      corsJsonResponse(cors, body, status);

    if (req.method === "OPTIONS") {
      return cors.allowed
        ? new Response("ok", { headers: cors.headers })
        : jsonResponse({ error: "Origen no permitido." }, 403);
    }
    if (!cors.allowed) {
      return jsonResponse({ error: "Origen no permitido." }, 403);
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "Metodo no permitido." }, 405);
    }

    try {
      const supabaseUrl = getEnv("SUPABASE_URL");
      const anonKey = getEnv("SUPABASE_ANON_KEY");
      const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        return jsonResponse({
          error: "La funcion no esta configurada correctamente.",
        }, 500);
      }

      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "get");
      const teamId = Number(body.teamId);
      if (!Number.isInteger(teamId) || teamId <= 0) {
        return jsonResponse({ error: "teamId es obligatorio." }, 400);
      }

      const { adminClient, actorProfileId, delegateProfileId, team } =
        await authorize(
          req,
          teamId,
          supabaseUrl,
          anonKey,
          serviceRoleKey,
        );

      const { data: authData, error: authError } = await adminClient.auth.admin
        .getUserById(delegateProfileId);
      if (authError || !authData?.user) {
        fail("No se pudo obtener la cuenta del delegado.", 404);
      }
      const delegateAuthUser = authData.user!;

      if (action === "get") {
        return jsonResponse({
          success: true,
          email: delegateAuthUser.email || "",
        });
      }

      if (action !== "update") {
        return jsonResponse({ error: "Accion no valida." }, 400);
      }

      const fullName = normalizeName(body.fullName);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const reason = normalizeName(body.reason);
      const confirmed = body.confirmed === true;

      if (!fullName) {
        return jsonResponse({ error: "El nombre es obligatorio." }, 400);
      }
      if (fullName.length > 45) {
        return jsonResponse({
          error: "El nombre admite maximo 45 caracteres.",
        }, 400);
      }
      if (
        email &&
        (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      ) {
        return jsonResponse({ error: "Escribe un correo valido." }, 400);
      }
      if (password && password.length < 6) {
        return jsonResponse({
          error: "La nueva contrasena debe tener al menos 6 caracteres.",
        }, 400);
      }

      const changedFields: Array<"name" | "email" | "password"> = [];
      if (fullName !== normalizeName(team.delegate_name)) {
        changedFields.push("name");
      }
      if (email && email !== normalizeEmail(delegateAuthUser.email)) {
        changedFields.push("email");
      }
      if (password) changedFields.push("password");

      if (!changedFields.length) {
        return jsonResponse({ error: "No hay cambios para aplicar." }, 400);
      }
      const changesCredentials = changedFields.some((field) =>
        field === "email" || field === "password"
      );
      if (
        reason.length > 240 ||
        (reason.length > 0 && reason.length < 5) ||
        (changesCredentials && !reason)
      ) {
        return jsonResponse({
          error: changesCredentials
            ? "Escribe un motivo de entre 5 y 240 caracteres para cambiar los datos de acceso."
            : "El motivo es opcional, pero si lo agregas debe tener entre 5 y 240 caracteres.",
        }, 400);
      }
      if (changesCredentials && !confirmed) {
        return jsonResponse({
          error: "Debes confirmar expresamente el cambio de la cuenta.",
        }, 400);
      }
      const auditReason = reason || "Actualizacion del nombre del delegado.";

      const [auditPreflight, notificationPreflight] = await Promise.all([
        adminClient.from("delegate_account_audit_logs").select("id").limit(1),
        adminClient.from("account_security_notifications").select("id").limit(
          1,
        ),
      ]);
      if (auditPreflight.error || notificationPreflight.error) {
        throw auditPreflight.error || notificationPreflight.error;
      }

      const authUpdates: { email?: string; password?: string } = {};
      if (changedFields.includes("email")) authUpdates.email = email;
      if (changedFields.includes("password")) authUpdates.password = password;

      let updatedEmail = delegateAuthUser.email || "";
      if (Object.keys(authUpdates).length > 0) {
        const { data: updatedAuth, error: updateAuthError } = await adminClient
          .auth.admin.updateUserById(
            delegateProfileId,
            authUpdates,
          );
        if (updateAuthError) fail(updateAuthError.message, 400);
        updatedEmail = updatedAuth.user?.email || email || updatedEmail;
      }

      let updatedTeam = {
        id: team.id,
        delegate_name: team.delegate_name,
        contact_phone: team.contact_phone,
      };
      if (changedFields.includes("name")) {
        const teamUpdates: { delegate_name: string; contact_phone?: null } = {
          delegate_name: fullName,
        };
        if (team.contact_phone !== null && !String(team.contact_phone).trim()) {
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

      if (changedFields.includes("name") || changedFields.includes("email")) {
        const profileUpdates: { full_name?: string; email?: string } = {};
        if (changedFields.includes("name")) profileUpdates.full_name = fullName;
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
      const changedLabels = changedFields.map((field) => fieldLabels[field]);
      const changeSummary = changedLabels.length === 1
        ? changedLabels[0]
        : `${changedLabels.slice(0, -1).join(", ")} y ${changedLabels.at(-1)}`;

      const { error: notificationError } = await adminClient
        .from("account_security_notifications")
        .insert({
          user_id: delegateProfileId,
          title: "Cambios en tu cuenta",
          message:
            `Un administrador actualizo ${changeSummary} para ${team.name}. Motivo: ${auditReason}`,
          metadata: {
            team_id: teamId,
            actor_profile_id: actorProfileId,
            changed_fields: changedFields,
            audit_id: auditLog.id,
          },
        });
      if (notificationError) throw notificationError;

      return jsonResponse({
        success: true,
        email: updatedEmail,
        team: updatedTeam,
        credentialsUpdated: Object.keys(authUpdates).length > 0,
        changedFields,
        auditRecorded: true,
        notificationCreated: true,
      });
    } catch (error) {
      console.error("manage-delegate-account:", error);
      const candidate = error as Error & { status?: number };
      return jsonResponse(
        { error: candidate.message || "No se pudo actualizar el delegado." },
        candidate.status || 500,
      );
    }
  };
};

if (import.meta.main) {
  Deno.serve(createHandler());
}
