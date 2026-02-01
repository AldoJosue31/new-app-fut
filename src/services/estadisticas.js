import { supabase } from '../supabase/supabase.config';

export const getTablaPosicionesService = async (division) => {
  const { data, error } = await supabase
    .from('view_clasificacion')
    .select('*')
    .eq('division', division)
    .order('pts', { ascending: false })
    .order('pj', { ascending: false }) // AGREGADO: Más jerarquía a más partidos jugados
    .order('dg', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getTopScorersService = async ({ division = null, tournamentId = null, limit = 10 } = {}) => {
  let query = supabase
    .from('view_goleadores')
    .select('*')
    .order('goals', { ascending: false })
    .limit(limit);

  if (division) query = query.eq('division', division);
  if (tournamentId) query = query.eq('tournament_id', tournamentId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};