import { supabase } from '../supabase/supabase.config';

export const generarFixture = (equipos) => {
  const list = [...equipos];
  if (list.length % 2 !== 0) list.push({ id: null });
  const rounds = [];
  const totalRounds = list.length - 1;

  for (let i = 0; i < totalRounds; i++) {
    const round = [];
    for (let j = 0; j < list.length / 2; j++) {
      const t1 = list[j];
      const t2 = list[list.length - 1 - j];
      if (t1.id && t2.id) {
        round.push({ home: t1.id, away: t2.id });
      }
    }
    rounds.push(round);
    list.splice(1, 0, list.pop());
  }
  return rounds;
};

export const iniciarTorneoService = async ({ 
  divisionName, 
  season, 
  startDate, 
  config, 
  jornadas 
}) => {
  try {
    const { data, error } = await supabase.rpc("crear_torneo_completo", {
      p_division: divisionName,
      p_season: season,
      p_start_date: startDate,
      p_config: config,
      p_jornadas: jornadas 
    });

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};