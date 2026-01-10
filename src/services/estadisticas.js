import { supabase } from '../supabase/supabase.config';

export const getTablaPosicionesService = async (division) => {
  const { data, error } = await supabase
    .from('view_clasificacion')
    .select('*')
    .eq('division', division)
    .order('pts', { ascending: false })
    .order('dg', { ascending: false });

  if (error) throw error;
  return data || [];
};
