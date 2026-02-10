/**
 * Utilidad AVANZADA para validación de conflictos deportivos.
 * Compatible con esquema SQL: matches(id, team1_id, team2_id, jornada_id, date)
 */

// Normaliza fechas a YYYY-MM-DD
export const normalizeDate = (dateInput) => {
    if (!dateInput) return "";
    try {
        if (dateInput instanceof Date) return dateInput.toISOString().split('T')[0];
        
        const dateStr = String(dateInput);
        // Soporte para formato SQL "2026-02-06 22:00:00+00" (espacio en vez de T)
        if (dateStr.includes(' ')) {
            return dateStr.split(' ')[0];
        }
        // Soporte para ISO "2026-02-06T22:00:00.000Z"
        return dateStr.split('T')[0];
    } catch (e) {
        console.error("Error normalizando fecha:", dateInput);
        return "";
    }
};

const getMinutes = (timeStr) => {
    if (!timeStr) return -1;
    const parts = String(timeStr).split(':');
    if (parts.length < 2) return -1;
    const [h, m] = parts.map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return -1;
    return (h * 60) + m;
};

// --- Identidad de Partido Mejorada (Corrección del Bug de NULLs) ---
const isSameMatchIdentity = (matchA, matchB) => {
    const getTeamId = (teamProp) => {
        if (!teamProp) return null;
        if (typeof teamProp === 'object') return String(teamProp.id || teamProp.team1_id || teamProp.team2_id || '');
        return String(teamProp);
    };

    // Obtenemos IDs (A es el local/memoria, B es externo/BD)
    const localA = getTeamId(matchA.local || matchA.team1_id || matchA.equipoLocal);
    const visitaA = getTeamId(matchA.visitante || matchA.team2_id || matchA.equipoVisitante);
    
    const localB = getTeamId(matchB.local || matchB.team1_id || matchB.local_id);
    const visitaB = getTeamId(matchB.visitante || matchB.team2_id || matchB.visitante_id);

    // Si no podemos identificar al menos un equipo en cada lado, no asumimos identidad
    if ((!localA && !visitaA) || (!localB && !visitaB)) return false;

    // LÓGICA FLEXIBLE:
    // Si B (Base de Datos) tiene un equipo como NULL, pero el otro coincide con A,
    // asumimos que es el mismo partido que se está terminando de configurar.
    
    // Caso 1: Coincidencia Directa o Parcial (Local con Local)
    const matchDirect = (localA === localB);
    if (matchDirect) {
        if (!visitaB) return true; 
        if (visitaA === visitaB) return true;
    }

    // Caso 2: Coincidencia Cruzada (Local con Visita)
    const matchCross = (localA === visitaB);
    if (matchCross) {
        if (!localB) return true;
        if (visitaA === localB) return true;
    }

    // Caso 3: Visita con Visita
    if (visitaA && visitaB && visitaA === visitaB) {
        if (!localB) return true;
    }

    return false;
};

export const checkOverlap = (matchA, matchB, defaultDuration = 60) => {
    // 1. FECHA
    const dateA = normalizeDate(matchA.date || matchA.fecha);
    const dateB = normalizeDate(matchB.date || matchB.fecha);
    
    if (!dateA || !dateB || dateA !== dateB) return false;

    // 2. HORA
    const startA = getMinutes(matchA.time || matchA.horaInicio);
    const startB = getMinutes(matchB.time || matchB.horaInicio);
    if (startA === -1 || startB === -1) return false;

    // 3. DURACIÓN
    const durA = matchA.duration || defaultDuration;
    const durB = matchB.duration || defaultDuration;

    const endA = startA + durA;
    const endB = startB + durB;

    return (startA < endB && endA > startB);
};

export const findScheduleConflicts = (internalMatches, externalMatches, defaultDuration) => {
    const conflicts = [];
    
    internalMatches.forEach(internal => {
        if (!internal.date || !internal.time) return;

        externalMatches.forEach(external => {
            // --- BLINDAJE ---
            
            // 1. Identidad por ID
            if (internal.id && external.id && String(internal.id) === String(external.id)) return;
            if (external.original_id && String(internal.id) === String(external.original_id)) return;
            
            // 2. Identidad por Equipos (Con tolerancia a Null)
            if (isSameMatchIdentity(internal, external)) return;

            // 3. Verificar Solapamiento
            if (checkOverlap(internal, external, defaultDuration)) {
                conflicts.push({
                    internal: internal,
                    external: external,
                    duration: defaultDuration
                });
            }
        });
    });

    return conflicts;
};
