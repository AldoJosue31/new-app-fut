import { supabase } from "../supabase/supabase.config";

const parseRpcResponse = (rpcName, data, error) => {
  if (error) throw error;
  if (!data?.success) {
    throw new Error(data?.message || `No se pudo completar ${rpcName}.`);
  }
  return data;
};

const unique = (values) => [...new Set(values.filter(Boolean))];
const mapById = (rows = []) => new Map(rows.map((row) => [row.id, row]));
const createDelegateRequestSummary = () => ({
  totalCount: 0,
  pendingCount: 0,
  latestPendingAt: null,
  latestReviewedStatus: null,
  latestReviewedAt: null,
  latestReviewNotes: null,
});
const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("No hay una sesion activa para realizar esta accion.");
  }

  return accessToken;
};

const callAuthenticatedEndpoint = async (path, method, payload = {}) => {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || "No se pudo completar la operacion.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const getDelegateAssignments = async (delegateProfileId) => {
  if (!delegateProfileId) return [];

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("team_delegates")
    .select("team_id, delegate_profile_id, assigned_at, assigned_by")
    .eq("delegate_profile_id", delegateProfileId)
    .order("assigned_at", { ascending: false });

  if (assignmentError) throw assignmentError;
  if (!assignmentRows?.length) return [];

  const teamIds = assignmentRows.map((row) => row.team_id);
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .in("id", teamIds)
    .order("name", { ascending: true });

  if (teamsError) throw teamsError;
  if (!teams?.length) return [];

  const divisionIds = unique(teams.map((team) => team.division_id));
  const { data: divisions, error: divisionsError } = await supabase
    .from("divisions")
    .select("*")
    .in("id", divisionIds);

  if (divisionsError) throw divisionsError;

  const leagueIds = unique((divisions || []).map((division) => division.league_id));
  const { data: leagues, error: leaguesError } = await supabase
    .from("leagues")
    .select("id, name, logo_url, original_logo_url, delegate_changes_require_approval")
    .in("id", leagueIds);

  if (leaguesError) throw leaguesError;

  const assignmentsMap = new Map(assignmentRows.map((row) => [row.team_id, row]));
  const divisionsMap = new Map((divisions || []).map((division) => [division.id, division]));
  const leaguesMap = new Map((leagues || []).map((league) => [league.id, league]));

  return teams.map((team) => {
    const division = divisionsMap.get(team.division_id) || null;
    const league = division ? leaguesMap.get(division.league_id) || null : null;

    return {
      ...team,
      division,
      league,
      delegateAssignment: assignmentsMap.get(team.id) || null,
    };
  });
};

export const getDelegateLeagueNames = async (delegateProfileId) => {
  const assignments = await getDelegateAssignments(delegateProfileId);
  return unique(assignments.map((team) => team.league?.name));
};

export const getActiveDelegateInvitation = async (teamId) => {
  if (!teamId) return null;

  const { data, error } = await supabase
    .from("delegate_invitations")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_used", false)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    invited_phone: data?.metadata?.invited_phone || null,
  };
};

export const createDelegateInvitation = async ({
  teamId,
  invitedName,
  invitedEmail,
  invitedPhone,
  expiresAt = null,
}) => {
  const { data, error } = await supabase.rpc("create_delegate_invitation", {
    p_team_id: teamId,
    p_invited_name: invitedName || null,
    p_invited_email: invitedEmail || null,
    p_invited_phone: invitedPhone || null,
    p_expires_at: expiresAt,
  });

  return parseRpcResponse("create_delegate_invitation", data, error);
};

export const revokeDelegateInvitation = async (invitationId) => {
  const { data, error } = await supabase.rpc("revoke_delegate_invitation", {
    p_invitation_id: invitationId,
  });

  return parseRpcResponse("revoke_delegate_invitation", data, error);
};

export const getDelegateInvitation = async (token) => {
  const { data, error } = await supabase.rpc("get_delegate_invitation", {
    p_token: token,
  });

  return parseRpcResponse("get_delegate_invitation", data, error);
};

export const acceptDelegateInvitation = async (token, userId, contactPhone = null) => {
  const { data, error } = await supabase.rpc("procesar_invitacion_delegate", {
    p_token: token,
    p_user_id: userId,
    p_contact_phone: contactPhone || null,
  });

  return parseRpcResponse("procesar_invitacion_delegate", data, error);
};

export const getTeamDelegateBindings = async (teamIds = []) => {
  const normalizedTeamIds = unique(teamIds);
  if (!normalizedTeamIds.length) return {};

  const { data, error } = await supabase
    .from("team_delegates")
    .select("team_id, delegate_profile_id, assigned_at, assigned_by")
    .in("team_id", normalizedTeamIds);

  if (error) throw error;

  return Object.fromEntries(
    normalizedTeamIds.map((teamId) => [
      teamId,
      data?.find((assignment) => assignment.team_id === teamId) || null,
    ])
  );
};

export const submitDelegateChangeRequest = async ({
  teamId,
  entityType,
  actionType,
  payload = {},
  playerId = null,
}) => {
  const { data, error } = await supabase.rpc("submit_delegate_change_request", {
    p_team_id: teamId,
    p_entity_type: entityType,
    p_action_type: actionType,
    p_payload: payload,
    p_player_id: playerId,
  });

  return parseRpcResponse("submit_delegate_change_request", data, error);
};

export const getLeagueDelegateChangeRequests = async (leagueId) => {
  if (!leagueId) return [];

  const { data: requests, error: requestsError } = await supabase
    .from("delegate_change_requests")
    .select("*")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });

  if (requestsError) throw requestsError;
  if (!requests?.length) return [];

  const teamIds = unique(requests.map((request) => request.team_id));
  const playerIds = unique(requests.map((request) => request.player_id));

  const [{ data: teams, error: teamsError }, { data: players, error: playersError }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name, delegate_name, contact_phone, color, division_id, status")
        .in("id", teamIds),
      playerIds.length
        ? supabase
            .from("players")
            .select("id, first_name, last_name, dorsal, position, team_id, is_active")
            .in("id", playerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (teamsError) throw teamsError;
  if (playersError) throw playersError;

  const teamsMap = mapById(teams || []);
  const playersMap = mapById(players || []);

  return requests.map((request) => {
    const team = teamsMap.get(request.team_id) || null;
    const player = request.player_id ? playersMap.get(request.player_id) || null : null;

    return {
      ...request,
      team,
      player,
      submitter_label: team?.delegate_name || "Delegado del equipo",
    };
  });
};

export const reviewDelegateChangeRequest = async ({
  requestId,
  decision,
  reviewNotes = null,
}) => {
  const { data, error } = await supabase.rpc("review_delegate_change_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_review_notes: reviewNotes,
  });

  return parseRpcResponse("review_delegate_change_request", data, error);
};

export const getTeamDelegateRequestSummaries = async (teamIds = []) => {
  const normalizedTeamIds = unique(teamIds);
  if (!normalizedTeamIds.length) return {};

  const { data: requests, error } = await supabase
    .from("delegate_change_requests")
    .select("team_id, status, created_at, reviewed_at, applied_at, review_notes")
    .in("team_id", normalizedTeamIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const summaries = Object.fromEntries(
    normalizedTeamIds.map((teamId) => [teamId, createDelegateRequestSummary()])
  );

  (requests || []).forEach((request) => {
    const teamId = request.team_id;
    if (!teamId) return;

    const summary = summaries[teamId] || createDelegateRequestSummary();
    summary.totalCount += 1;

    if (request.status === "pending") {
      summary.pendingCount += 1;

      if (!summary.latestPendingAt || request.created_at > summary.latestPendingAt) {
        summary.latestPendingAt = request.created_at;
      }
    }

    if (request.status === "applied" || request.status === "rejected") {
      const reviewedAt =
        request.reviewed_at || request.applied_at || request.created_at || null;

      if (!summary.latestReviewedAt || reviewedAt > summary.latestReviewedAt) {
        summary.latestReviewedAt = reviewedAt;
        summary.latestReviewedStatus = request.status;
        summary.latestReviewNotes = request.review_notes || null;
      }
    }

    summaries[teamId] = summary;
  });

  return summaries;
};

export const unlinkTeamDelegateService = async ({
  teamId,
  deleteAccount = true,
}) =>
  callAuthenticatedEndpoint("/api/delegates/unlink", "POST", {
    teamId,
    deleteAccount,
  });
