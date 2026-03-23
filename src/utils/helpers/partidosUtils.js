// src/utils/helpers/partidosUtils.js

/**
 * Calcula los partidos pendientes de una jornada específica.
 * Regla: status === 'Pendiente' Y team1_id no es null Y team2_id no es null.
 * * @param {Array} partidos - Lista completa de partidos del torneo
 * @param {String|Number} jornadaId - ID de la jornada a evaluar
 * @returns {Number} Cantidad de partidos pendientes
 */
export const calcularPartidosPendientes = (partidos = [], jornadaId) => {
  if (!partidos || !jornadaId) return 0;

  return partidos.filter(match => {
    // Aseguramos que los IDs coincidan (parseando a String por seguridad)
    const isSameJornada = String(match.jornada_id) === String(jornadaId);
    
    // Validación estricta solicitada
    const isPendiente = match.status === 'Pendiente';
    const hasTeam1 = match.team1_id !== null && match.team1_id !== undefined;
    const hasTeam2 = match.team2_id !== null && match.team2_id !== undefined;

    return isSameJornada && isPendiente && hasTeam1 && hasTeam2;
  }).length;
};