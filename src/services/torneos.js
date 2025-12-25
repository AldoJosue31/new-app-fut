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

export const iniciarTorneoService = async ({ divisionId, divisionName, season, startDate, totalJornadas }) => {
  const jornadasArray = Array.from({ length: totalJornadas }, (_, i) => ({
    name: `Jornada ${i + 1}`
  }));

  // NOTA: Asegúrate de que tu función SQL 'crear_torneo_completo' haya sido actualizada
  // para recibir p_division_id O que use el nombre para buscarlo.
  // Por seguridad y compatibilidad con tu código actual que espera nombre en SQL:
  
  const { data, error } = await supabase.rpc('crear_torneo_completo', {
    p_division: divisionName, // Enviamos el nombre porque tu SQL original usa nombres
    p_season: season,
    p_start_date: startDate,
    p_jornadas: jornadasArray
    // Si actualizaste el SQL para usar IDs, cambia esto por p_division_id: divisionId
  });

  if (error) throw error;
  return data;
};