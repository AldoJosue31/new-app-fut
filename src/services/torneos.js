import { supabase } from '../supabase/supabase.config';

// Reciclamos tu algoritmo Round Robin (Matemática pura, sin efectos secundarios)
export const generarFixture = (equipos) => {
  const list = [...equipos];
  if (list.length % 2 !== 0) list.push({ id: null }); // "Bye" para impares
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

// Optimización: Llamada RPC a Supabase (Transacción segura)
export const iniciarTorneoService = async ({ division, season, startDate, totalJornadas }) => {
  // Preparamos el array de jornadas para el Bulk Insert
  const jornadasArray = Array.from({ length: totalJornadas }, (_, i) => ({
    name: `Jornada ${i + 1}`
  }));

  // Llamamos a la función SQL que creaste anteriormente
  const { data, error } = await supabase.rpc('crear_torneo_completo', {
    p_division: division,
    p_season: season,
    p_start_date: startDate,
    p_jornadas: jornadasArray
  });

  if (error) throw error;
  return data;
};