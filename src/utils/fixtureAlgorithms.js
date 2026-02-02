import { generarFixture } from "../services/torneos";

/**
 * Genera la estructura plana inicial de partidos (CREACIÓN).
 */
export const generarEstructuraInicial = (teams, config) => {
    if (!teams || teams.length < 2) return [];

    // Copia y shuffle para aleatoriedad
    const mixed = [...teams];
    for (let i = mixed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }

    const rounds = generarFixture(mixed); 
    let newMatches = [];
    let matchIdCounter = 1;

    // Objeto constante para descansa
    const byeTeam = { id: 'BYE', name: 'DESCANSA', img: null, isBye: true };

    rounds.forEach((round, rIndex) => {
        round.forEach(m => {
            const t1 = mixed.find(t => t.id === m.home);
            const t2 = mixed.find(t => t.id === m.away);
            
            let local = t1;
            let visita = t2;
            let isBye = false;

            // Lógica para determinar si es partido de descanso
            if (local && !visita) {
                visita = byeTeam;
                isBye = true;
            } else if (!local && visita) {
                local = visita;
                visita = byeTeam;
                isBye = true;
            } else if (local && visita) {
                isBye = false;
            } else {
                return; 
            }

            if (local) {
                newMatches.push({
                    id: `temp_${matchIdCounter++}`,
                    local: local,
                    visitante: visita,
                    jornadaIndex: rIndex,
                    locked: false,
                    roundLocked: false, // En creación nada está confirmado
                    isByeMatch: isBye,
                    dbId: null 
                });
            }
        });
    });

    // Generar vueltas si la config lo pide
    if (config?.vueltas === "2") {
        const totalRoundsIda = rounds.length;
        const matchesVuelta = newMatches.map(m => ({
            ...m,
            id: `temp_${matchIdCounter++}`,
            local: m.visitante, 
            visitante: m.local,
            jornadaIndex: m.jornadaIndex + totalRoundsIda,
            locked: false,
            roundLocked: false,
            isByeMatch: m.isByeMatch,
            dbId: null
        }));
        newMatches = [...newMatches, ...matchesVuelta];
    }

    return newMatches;
};

/**
 * Transforma partidos de BD al formato del Editor (EDICIÓN POST-INICIO).
 * CORREGIDO: Evita duplicar equipos 'BYE' en jornadas confirmadas.
 */
export const transformarPartidosExistentes = (matchesDB, jornadas, teams) => {
    const byeTeam = { id: 'BYE', name: 'DESCANSA', img: null, isBye: true };
    const editorMatches = [];
    
    // Mapa auxiliar para asegurar unicidad de equipos por jornada
    // Clave: jornadaIndex, Valor: Set de IDs de equipos (normalizados a string)
    const teamsPlayingByRound = {};
    
    const jornadaMap = {};
    // Ordenamos jornadas para garantizar el índice correcto
    const jornadasSorted = [...jornadas].sort((a,b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || a.id;
        const numB = parseInt(b.name.replace(/\D/g, '')) || b.id;
        return numA - numB;
    });

    // Inicializamos el mapa y los Sets
    jornadasSorted.forEach((j, index) => {
        jornadaMap[j.id] = { index: index, status: j.status, id: j.id };
        teamsPlayingByRound[index] = new Set(); 
    });

    // 1. Procesar partidos existentes en DB
    matchesDB.forEach(m => {
        const jInfo = jornadaMap[m.jornada_id];
        if (!jInfo) return;

        // Normalización CRÍTICA: Convertir IDs a String para comparaciones seguras
        const localTeam = teams.find(t => String(t.id) === String(m.team1_id));
        const visitaTeam = teams.find(t => String(t.id) === String(m.team2_id));
        const isRoundLocked = (jInfo.status === 'Confirmada' || jInfo.status === 'Finalizada');

        if (localTeam) {
            const roundSet = teamsPlayingByRound[jInfo.index];
            const localIdStr = String(localTeam.id);

            // FILTRO ANTI-DUPLICADOS:
            // Si el equipo local YA fue registrado en esta jornada (posible error en datos de DB), ignoramos este registro extra.
            if (roundSet.has(localIdStr)) return;

            // Marcamos el equipo local como "jugando" en esta jornada
            roundSet.add(localIdStr);
            
            // Si hay visitante real, también lo marcamos
            if (visitaTeam) {
                roundSet.add(String(visitaTeam.id));
            }

            editorMatches.push({
                id: m.id,
                dbId: m.id,
                local: localTeam,
                visitante: visitaTeam || byeTeam,
                jornadaIndex: jInfo.index,
                locked: isRoundLocked,
                roundLocked: isRoundLocked,
                isByeMatch: !visitaTeam || String(visitaTeam.id) === 'BYE'
            });
        }
    });

    // 2. Rellenar huecos (BYE) para equipos que NO jugaron
    jornadasSorted.forEach((j, index) => {
        const jInfo = jornadaMap[j.id];
        const isRoundLocked = (jInfo.status === 'Confirmada' || jInfo.status === 'Finalizada');
        const roundSet = teamsPlayingByRound[index];

        // Filtramos los equipos cuyo ID NO esté en el Set de esa jornada
        const teamsResting = teams.filter(t => !roundSet.has(String(t.id)));

        teamsResting.forEach(t => {
            editorMatches.push({
                id: `temp_bye_${index}_${t.id}`,
                dbId: null,
                local: t,
                visitante: byeTeam,
                jornadaIndex: index,
                locked: isRoundLocked, // Si la jornada está confirmada, el descanso generado también se bloquea
                roundLocked: isRoundLocked,
                isByeMatch: true
            });
        });
    });

    return editorMatches;
};

/**
 * Valida conflictos.
 * CORREGIDO: Ignora conflictos en jornadas BLOQUEADAS (Confirmadas).
 * Esto permite guardar cambios futuros aunque el pasado tenga errores.
 */
export const validarFixture = (matches) => {
    const conflicts = {};
    let totalConflicts = 0;
    const byRound = {};

    // Agrupar por jornada
    for (const m of matches) {
        if (!byRound[m.jornadaIndex]) byRound[m.jornadaIndex] = [];
        byRound[m.jornadaIndex].push(m);
    }

    for (const rIndex in byRound) {
        const roundMatches = byRound[rIndex];

        // OPTIMIZACIÓN CLAVE: Si la jornada está bloqueada (confirmada), 
        // asumimos que es válida y NO buscamos conflictos.
        const isRoundLocked = roundMatches.some(m => m.roundLocked);
        if (isRoundLocked) continue; 

        const teamsInRound = new Set();
        const duplicates = new Set();

        for (const m of roundMatches) {
            // Verificar Local
            if (m.local.id !== 'BYE') {
                if (teamsInRound.has(m.local.id)) duplicates.add(m.local.id);
                teamsInRound.add(m.local.id);
            }
            // Verificar Visitante
            if (m.visitante.id !== 'BYE') {
                if (teamsInRound.has(m.visitante.id)) duplicates.add(m.visitante.id);
                teamsInRound.add(m.visitante.id);
            }
        }

        if (duplicates.size > 0) {
            conflicts[rIndex] = Array.from(duplicates);
            totalConflicts += duplicates.size;
        }
    }

    return { conflicts, totalConflicts };
};

/**
 * Algoritmo "Min-Conflicts" Optimizado.
 * Respeta estrictamente los bloqueos.
 */
export const autoCorregirFixture = (initialMatches, maxIterations = 5000) => {
    let currentMatches = JSON.parse(JSON.stringify(initialMatches));
    
    // Solo validamos lo NO bloqueado para el score inicial
    let { totalConflicts: bestScore } = validarFixture(currentMatches);
    let bestSolution = JSON.parse(JSON.stringify(currentMatches));

    if (bestScore === 0) return currentMatches;

    const maxJornada = Math.max(...currentMatches.map(m => m.jornadaIndex), 0);

    for (let i = 0; i < maxIterations; i++) {
        if (bestScore === 0) break;

        const { conflicts } = validarFixture(currentMatches);
        const conflictRounds = Object.keys(conflicts);
        
        if (conflictRounds.length === 0) break;

        // Seleccionar una jornada conflictiva al azar
        const badRound = Number(conflictRounds[Math.floor(Math.random() * conflictRounds.length)]);
        const badTeams = conflicts[badRound];
        
        // Buscar partido causante que sea MOVIBLE (no locked, no roundLocked)
        let conflictiveMatches = currentMatches.filter(m => 
            m.jornadaIndex === badRound && 
            !m.locked && !m.roundLocked && 
            (badTeams.includes(m.local.id) || badTeams.includes(m.visitante.id))
        );

        // Si no encuentro el específico, tomo cualquiera movible de esa jornada
        if (conflictiveMatches.length === 0) {
             conflictiveMatches = currentMatches.filter(m => m.jornadaIndex === badRound && !m.locked && !m.roundLocked);
        }
        
        if (conflictiveMatches.length === 0) {
            // Si todo está bloqueado en esta jornada conflictiva, no podemos hacer nada aquí.
            // Eliminamos esta jornada de la lista de pendientes para evitar bucle infinito en validación externa,
            // pero dentro del loop simplemente saltamos.
            continue; 
        }

        const matchA = conflictiveMatches[Math.floor(Math.random() * conflictiveMatches.length)];
        const idxA = currentMatches.findIndex(m => m.id === matchA.id);
        
        // Buscar jornadas destino que NO estén bloqueadas por confirmación
        const targetRoundsToCheck = [];
        for(let r=0; r<=maxJornada; r++) {
            // Verificar si la jornada destino está totalmente bloqueada
            const isDestLocked = currentMatches.some(m => m.jornadaIndex === r && m.roundLocked);
            if(r !== badRound && !isDestLocked) targetRoundsToCheck.push(r);
        }
        
        if (targetRoundsToCheck.length === 0) break; // No hay donde mover

        // Greedy swap
        let bestSwapCandidate = null;
        let minDelta = Infinity;

        // Probar swap con candidatos
        for (let r of targetRoundsToCheck) {
            const candidatesB = currentMatches.filter(m => 
                m.jornadaIndex === r && !m.locked && !m.roundLocked && m.isByeMatch === matchA.isByeMatch
            );
            
            for (let matchB of candidatesB) {
                const costA_in_R = countConflictsForMatchInRound(matchA, r, currentMatches, matchB.id); 
                const costB_in_Bad = countConflictsForMatchInRound(matchB, badRound, currentMatches, matchA.id);
                const totalCost = costA_in_R + costB_in_Bad;

                if (totalCost < minDelta) {
                    minDelta = totalCost;
                    bestSwapCandidate = matchB;
                }
            }
        }
        
        if (bestSwapCandidate) {
            performSwap(currentMatches, idxA, bestSwapCandidate);
        } else {
            // Fallback random si greedy falla
             const randomR = targetRoundsToCheck[Math.floor(Math.random() * targetRoundsToCheck.length)];
             const candidatesB = currentMatches.filter(m => 
                m.jornadaIndex === randomR && !m.locked && !m.roundLocked && m.isByeMatch === matchA.isByeMatch 
            );
            if (candidatesB.length > 0) {
                const matchB = candidatesB[Math.floor(Math.random() * candidatesB.length)];
                performSwap(currentMatches, idxA, matchB);
            }
        }

        const { totalConflicts: currentTotal } = validarFixture(currentMatches);
        if (currentTotal < bestScore) {
            bestScore = currentTotal;
            bestSolution = JSON.parse(JSON.stringify(currentMatches));
        }
    }
    return bestSolution;
};

// --- Helpers Internos ---
function performSwap(matches, idxA, matchB) {
    const idxB = matches.findIndex(m => m.id === matchB.id);
    const tempJornada = matches[idxA].jornadaIndex;
    matches[idxA].jornadaIndex = matches[idxB].jornadaIndex;
    matches[idxB].jornadaIndex = tempJornada;
}

function countConflictsForMatchInRound(match, roundIndex, allMatches, ignoreMatchId) {
    // Si la jornada destino está confirmada, el costo es Infinito (prohibido)
    const isRoundLocked = allMatches.some(m => m.jornadaIndex === roundIndex && m.roundLocked);
    if (isRoundLocked) return 9999;

    let conflicts = 0;
    const matchesInRound = allMatches.filter(m => 
        m.jornadaIndex === roundIndex && m.id !== ignoreMatchId && m.id !== match.id
    );
    const teamsInRound = new Set();
    matchesInRound.forEach(m => {
        if(m.local.id !== 'BYE') teamsInRound.add(m.local.id);
        if(m.visitante.id !== 'BYE') teamsInRound.add(m.visitante.id);
    });
    if (match.local.id !== 'BYE' && teamsInRound.has(match.local.id)) conflicts++;
    if (match.visitante.id !== 'BYE' && teamsInRound.has(match.visitante.id)) conflicts++;
    return conflicts;
}