import "server-only";

import { createServerSupabaseClient } from "../../lib/supabase/serverClient.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const loadPublicTournament = async (tournamentId) => {
  const parsedTournamentId = Number(tournamentId);
  if (
    !Number.isInteger(parsedTournamentId) ||
    parsedTournamentId <= 0
  ) {
    return { bundle: null, error: "ERROR_GENERIC" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_public_tournament_bundle",
    { p_tournament_id: parsedTournamentId },
  );

  if (error || !data?.success) {
    return {
      bundle: null,
      error: data?.locked ? "LOCKED" : "ERROR_GENERIC",
    };
  }

  return { bundle: data, error: null };
};

const loadInvitation = async ({
  invalidMessage,
  rpcName,
  token,
}) => {
  if (!UUID_PATTERN.test(String(token || ""))) {
    return { invitation: null, error: invalidMessage };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(rpcName, {
    p_token: token,
  });

  if (error) {
    return {
      invitation: null,
      error: "No fue posible validar la invitacion. Intenta nuevamente.",
    };
  }

  if (!data?.success) {
    return {
      invitation: null,
      error: data?.message || "Invitacion invalida o expirada.",
    };
  }

  return { invitation: data, error: null };
};

export const loadManagerInvitation = (token) =>
  loadInvitation({
    invalidMessage:
      "El enlace esta incompleto o fue copiado incorrectamente.",
    rpcName: "get_manager_invitation",
    token,
  });

export const loadDelegateInvitation = (token) =>
  loadInvitation({
    invalidMessage:
      "El enlace esta incompleto o fue copiado incorrectamente. Solicita al manager que te comparta la invitacion nuevamente.",
    rpcName: "get_delegate_invitation",
    token,
  });
