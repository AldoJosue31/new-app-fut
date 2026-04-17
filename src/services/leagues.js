import { supabase } from '../supabase/supabase.config';

export const getLeagueById = async (leagueId) => {
  if (!leagueId) return null;

  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (error) throw error;
  return data;
};
