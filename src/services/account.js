import { supabase } from "../supabase/supabase.config";

export const getLeagueNameByOwner = async (userId) => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("leagues")
    .select("name")
    .eq("owner_id", userId)
    .single();

  if (error) throw error;
  return data?.name || null;
};

export const updateProfileName = async (userId, fullName) => {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);

  if (error) throw error;
};

export const linkGoogleIdentity = async (redirectTo) => {
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo },
  });

  if (error) throw error;
};

export const unlinkGoogleIdentity = async (googleIdentity) => {
  const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
  if (error) throw error;

  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError) throw refreshError;
  if (session?.user) return session.user;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  return user;
};
