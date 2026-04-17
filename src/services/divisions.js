import { supabase } from "../supabase/supabase.config";

export const createDivisionForCurrentUser = async (name) => {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new Error("El nombre de la division es obligatorio.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No hay una sesion activa.");
  }

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (leagueError) throw leagueError;
  if (!league) {
    throw new Error("No tienes una liga creada.");
  }

  const { error } = await supabase.from("divisions").insert({
    name: trimmedName,
    league_id: league.id,
    tier: 1,
  });

  if (error) throw error;
};

export const deleteDivisionById = async (divisionId) => {
  const { error } = await supabase
    .from("divisions")
    .delete()
    .eq("id", divisionId);

  if (error) throw error;
};
