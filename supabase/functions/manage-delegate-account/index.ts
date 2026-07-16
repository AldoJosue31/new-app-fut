import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: corsHeaders });

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

  const { data: profile, error: profileError } = await adminClient
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

  const { data: team, error: teamError } = await adminClient
    .from("teams")
    .select("id, division_id")
    .eq("id", teamId)
    .maybeSingle();
  if (teamError) throw teamError;
  if (!team) fail("No se encontro el equipo.", 404);

  if (profile.role !== "admin") {
    const { data: division, error: divisionError } = await adminClient
      .from("divisions")
      .select("league_id")
      .eq("id", team.division_id)
      .maybeSingle();
    if (divisionError) throw divisionError;
    if (!division) fail("No se encontro la division del equipo.", 404);

    const { data: league, error: leagueError } = await adminClient
      .from("leagues")
      .select("owner_id")
      .eq("id", division.league_id)
      .maybeSingle();
    if (leagueError) throw leagueError;

    let canManageLeague = league?.owner_id === user.id;
    if (!canManageLeague) {
      const { data: leagueAdmin, error: leagueAdminError } = await adminClient
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

  const { data: assignment, error: assignmentError } = await adminClient
    .from("team_delegates")
    .select("delegate_profile_id")
    .eq("team_id", teamId)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment?.delegate_profile_id) {
    fail("Este equipo no tiene un delegado registrado.", 404);
  }

  const { data: delegateProfile, error: delegateProfileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", assignment.delegate_profile_id)
    .maybeSingle();
  if (delegateProfileError) throw delegateProfileError;
  if (delegateProfile?.role !== "delegate") {
    fail("La cuenta vinculada no corresponde a un delegado.", 409);
  }

  return {
    adminClient,
    delegateProfileId: assignment.delegate_profile_id as string,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "La funcion no esta configurada correctamente." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "get");
    const teamId = Number(body.teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return jsonResponse({ error: "teamId es obligatorio." }, 400);
    }

    const { adminClient, delegateProfileId } = await authorizeTeamManager(
      req,
      teamId,
      supabaseUrl,
      anonKey,
      serviceRoleKey,
    );

    const { data: authData, error: authError } =
      await adminClient.auth.admin.getUserById(delegateProfileId);
    if (authError || !authData?.user) {
      fail("No se pudo obtener la cuenta del delegado.", 404);
    }

    if (action === "get") {
      return jsonResponse({
        success: true,
        email: authData.user.email || "",
      });
    }

    if (action !== "update") {
      return jsonResponse({ error: "Accion no valida." }, 400);
    }

    const fullName = normalizeName(body.fullName);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!fullName) return jsonResponse({ error: "El nombre es obligatorio." }, 400);
    if (fullName.length > 45) {
      return jsonResponse({ error: "El nombre admite maximo 45 caracteres." }, 400);
    }
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return jsonResponse({ error: "Escribe un correo valido." }, 400);
    }
    if (password && password.length < 6) {
      return jsonResponse({ error: "La nueva contrasena debe tener al menos 6 caracteres." }, 400);
    }

    const authUpdates: { email?: string; password?: string } = {};
    if (email && email !== normalizeEmail(authData.user.email)) authUpdates.email = email;
    if (password) authUpdates.password = password;

    let updatedEmail = authData.user.email || "";
    if (Object.keys(authUpdates).length > 0) {
      const { data: updatedAuth, error: updateAuthError } =
        await adminClient.auth.admin.updateUserById(delegateProfileId, authUpdates);
      if (updateAuthError) fail(updateAuthError.message, 400);
      updatedEmail = updatedAuth.user?.email || email || updatedEmail;
    }

    const { data: updatedTeam, error: updateTeamError } = await adminClient
      .from("teams")
      .update({ delegate_name: fullName })
      .eq("id", teamId)
      .select("id, delegate_name, contact_phone")
      .single();
    if (updateTeamError) throw updateTeamError;

    const profileUpdates: { full_name: string; email?: string } = {
      full_name: fullName,
    };
    if (updatedEmail) profileUpdates.email = updatedEmail;
    const { error: updateProfileError } = await adminClient
      .from("profiles")
      .update(profileUpdates)
      .eq("id", delegateProfileId)
      .eq("role", "delegate");
    if (updateProfileError) throw updateProfileError;

    return jsonResponse({
      success: true,
      email: updatedEmail,
      team: updatedTeam,
      credentialsUpdated: Object.keys(authUpdates).length > 0,
    });
  } catch (error) {
    console.error("manage-delegate-account:", error);
    const candidate = error as Error & { status?: number };
    return jsonResponse(
      { error: candidate.message || "No se pudo actualizar el delegado." },
      candidate.status || 500,
    );
  }
});
