import { supabase } from '../supabase/supabase.config';

export const getTablaPosicionesService = async (division, season) => {
  // Leemos directamente la vista optimizada 'view_clasificacion'
  const { data, error } = await supabase
    .from('view_clasificacion')
    .select('*')
    .eq('division', division)
    .eq('season', season)
    .order('pts', { ascending: false })
    .order('dg', { ascending: false });

  if (error) throw error;
  return data;
};