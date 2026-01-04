import { supabase } from '../supabase/supabase.config';
import { TOURNAMENT_STATUS } from '../utils/constants';

// --- SERVICIOS DE LECTURA (Queries) ---

export const getTorneoActivo = async (divisionId) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('division_id', divisionId)
      .in('status', [TOURNAMENT_STATUS.ACTIVE, TOURNAMENT_STATUS.ONGOING])
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en getTorneoActivo:", error.message);
    throw error;
  }
};

export const getEquiposDivision = async (divisionId) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(id)')
      .eq('division_id', divisionId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error en getEquiposDivision:", error.message);
    throw error;
  }
};

// --- SERVICIOS DE ESCRITURA ---

export const generarFixture = (equipos) => {
  const list = [...equipos];
  if (list.length % 2 !== 0) list.push({ id: null }); // Bye
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
  divisionName, season, startDate, config, jornadas 
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

/**
 * Guarda la jornada y procesa partidos programados y pendientes.
 * @param {number} torneoId 
 * @param {object} jornadaData - Objeto con { id (index), matches (programados), pendingMatches (pendientes) }
 */
export const guardarJornadaService = async (torneoId, jornadaData) => {
  try {
    if (!torneoId) throw new Error("ID de torneo no proporcionado");

    // 1. Obtener o Crear la Jornada
    const { data: existingJornada, error: fetchError } = await supabase
      .from('jornadas')
      .select('id')
      .eq('tournament_id', torneoId)
      .eq('name', `Jornada ${jornadaData.id}`)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let jornadaId;

    if (existingJornada) {
      jornadaId = existingJornada.id;
      // Actualizar estatus de la jornada a Confirmada
      await supabase
        .from('jornadas')
        .update({ status: 'Confirmada' }) 
        .eq('id', jornadaId);
    } else {
      const { data: newJornada, error: insertError } = await supabase
        .from('jornadas')
        .insert({
          tournament_id: torneoId,
          name: `Jornada ${jornadaData.id}`,
          status: 'Confirmada'
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      jornadaId = newJornada.id;
    }

    // 2. Unificar listas (Programados + Pendientes)
    // Los pendientes se guardan con status 'Pendiente' y fecha NULL (o fecha base sin hora)
    
    const formatMatchForDB = (m, status) => {
       // Determinar si es un ID temporal del frontend (ej: "match-0-12-14" o "suggested-...")
       const isTempId = String(m.id).includes('-') || typeof m.id === 'string';
       
       const payload = {
          jornada_id: jornadaId,
          team1_id: m.local.id,
          team2_id: m.visitante.id,
          status: status
       };

       if (status === 'Programado') {
          // Combinar fecha y hora
          const fullDate = new Date(`${m.date}T${m.time}:00`);
          payload.date = fullDate.toISOString();
       } else {
          // Pendiente: Puede tener fecha tentativa o null
          payload.date = m.date ? new Date(m.date).toISOString() : null; 
       }

       // Solo incluimos el ID si es REAL (numérico de la DB), si es temporal no lo mandamos para que cree uno nuevo
       if (!isTempId) {
          payload.id = m.id;
       }

       return payload;
    };

    const scheduledPayloads = jornadaData.matches.map(m => formatMatchForDB(m, 'Programado'));
    const pendingPayloads = (jornadaData.pendingMatches || []).map(m => formatMatchForDB(m, 'Pendiente'));

    const allMatches = [...scheduledPayloads, ...pendingPayloads];

    // 3. Ejecutar Upsert
    // Supabase upsert requiere que si mandas ID, este exista. Si no mandas ID, crea.
    const { data: savedMatches, error: matchError } = await supabase
      .from('matches')
      .upsert(allMatches, { onConflict: 'id' }) 
      .select();

    if (matchError) throw matchError;

    return { jornadaId, savedMatches };

  } catch (error) {
    console.error("Error en guardarJornadaService:", error.message);
    throw error;
  }
};