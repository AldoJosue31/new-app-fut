import { generarFixture } from "../services/torneos";

/**
 * Genera la estructura plana inicial de partidos (CREACIÓN).
 */
export const generarEstructuraInicial = (teams, config) => {
    if (!teams || teams.length < 2) return [];

    const mixed = [...teams];
    // Barajeo Fisher-Yates
    for (let i = mixed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }

    const rounds = generarFixture(mixed); 
    let newMatches = [];
    let matchIdCounter = 1;

    // Objeto Dummy para descanso
    const byeTeam = { id: 'BYE', name: 'DESCANSA', img: null, isBye: true };

    rounds.forEach((round, rIndex) => {
        round.forEach(m => {
            const t1 = mixed.find(t => t.id === m.home);
            const t2 = mixed.find(t => t.id === m.away);
            
            let local = t1;
            let visita = t2;
            let isBye = false;

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
                    id: `temp_${matchIdCounter++}`, // ID temporal
                    local: local,
                    visitante: visita,
                    jornadaIndex: rIndex,
                    locked: false, 
                    isByeMatch: isBye,
                    dbId: null // No tiene ID en BD aún
                });
            }
        });
    });

    // Ida y vuelta
    if (config?.vueltas === "2") {
        const totalRoundsIda = rounds.length;
        const matchesVuelta = newMatches.map(m => ({
            ...m,
            id: `temp_${matchIdCounter++}`,
            local: m.visitante, 
            visitante: m.local,
            jornadaIndex: m.jornadaIndex + totalRoundsIda,
            locked: false,
            isByeMatch: m.isByeMatch
        }));
        newMatches = [...newMatches, ...matchesVuelta];
    }

    return newMatches;
};

/**
 * Transforma partidos de BD al formato del Editor (EDICIÓN POST-INICIO).
 * Reconstruye los partidos normales y crea objetos "ficticios" para los equipos que descansan.
 */
export const transformarPartidosExistentes = (matchesDB, jornadas, teams) => {
    const byeTeam = { id: 'BYE', name: 'DESCANSA', img: null, isBye: true };
    const editorMatches = [];
    
    // Mapeo rápido de jornadas ID -> { index, status }
    const jornadaMap = {};
    const jornadaIndexToId = {}; // Para reconstruir descansos
    
    // Ordenamos jornadas por ID o nombre para asegurar índice secuencial
    const jornadasSorted = [...jornadas].sort((a,b) => {
        // Intenta extraer el numero de "Jornada X"
        const numA = parseInt(a.name.replace(/\D/g, '')) || a.id;
        const numB = parseInt(b.name.replace(/\D/g, '')) || b.id;
        return numA - numB;
    });

    jornadasSorted.forEach((j, index) => {
        jornadaMap[j.id] = { index: index, status: j.status, id: j.id };
        jornadaIndexToId[index] = j.id;
    });

    // 1. Procesar partidos reales de la DB
    matchesDB.forEach(m => {
        const jInfo = jornadaMap[m.jornada_id];
        if (!jInfo) return; // Partido de jornada eliminada o desconocida

        const localTeam = teams.find(t => t.id === m.team1_id);
        const visitaTeam = teams.find(t => t.id === m.team2_id);
        
        // Si falta un equipo en el match de DB (ej. null), es un BYE implícito guardado
        // (Aunque normalmente no se guardan, manejamos el caso)
        const isByeMatch = !localTeam || !visitaTeam;
        
        // Si la jornada está confirmada/finalizada, bloqueamos
        const isRoundLocked = (jInfo.status === 'Confirmada' || jInfo.status === 'Finalizada');

        if (localTeam) {
            editorMatches.push({
                id: m.id, // UUID real
                dbId: m.id,
                local: localTeam,
                visitante: visitaTeam || byeTeam,
                jornadaIndex: jInfo.index,
                locked: isRoundLocked,
                roundLocked: isRoundLocked, // Flag crítico para la UI
                isByeMatch: isByeMatch || (visitaTeam === undefined)
            });
        }
    });

    // 2. Reconstruir Descansos (BYEs no guardados en BD)
    // Para cada jornada, ver qué equipos NO jugaron y emparejarlos con el BYE
    jornadasSorted.forEach((j, index) => {
        const jInfo = jornadaMap[j.id];
        const isRoundLocked = (jInfo.status === 'Confirmada' || jInfo.status === 'Finalizada');

        const matchesInRound = editorMatches.filter(m => m.jornadaIndex === index);
        const playedTeamIds = new Set();
        
        matchesInRound.forEach(m => {
            if (m.local.id !== 'BYE') playedTeamIds.add(m.local.id);
            if (m.visitante.id !== 'BYE') playedTeamIds.add(m.visitante.id);
        });

        const teamsResting = teams.filter(t => !playedTeamIds.has(t.id));

        // Crear match ficticio de descanso para estos equipos
        teamsResting.forEach(t => {
            editorMatches.push({
                id: `temp_bye_${index}_${t.id}`, // ID temporal
                dbId: null, // No existe en BD
                local: t,
                visitante: byeTeam,
                jornadaIndex: index,
                locked: isRoundLocked,
                roundLocked: isRoundLocked,
                isByeMatch: true
            });
        });
    });

    return editorMatches;
};


/**
 * Valida conflictos (equipos repetidos) Y desbalance numérico.
 */
export const validarFixture = (matches, totalTeams) => {
    const conflicts = {};
    let totalConflicts = 0;
    
    const expectedMatchesPerRound = Math.ceil(totalTeams / 2);

    const byRound = {};
    const maxJornada = Math.max(...matches.map(m => m.jornadaIndex), 0);

    for(let i=0; i<=maxJornada; i++) byRound[i] = [];
    
    for (const m of matches) {
        if(byRound[m.jornadaIndex]) byRound[m.jornadaIndex].push(m);
    }

    for (const rIndex in byRound) {
        const roundMatches = byRound[rIndex];
        const roundErrors = [];

        // 1. Validación de Cantidad (Balance)
        if (roundMatches.length > expectedMatchesPerRound) {
            roundErrors.push('OVERFLOW'); 
            totalConflicts += (roundMatches.length - expectedMatchesPerRound) * 2;
        }

        // 2. Validación de Duplicados
        const teamsInRound = new Set();
        const duplicates = new Set();

        for (const m of roundMatches) {
            // Check Local
            if (m.local.id !== 'BYE') {
                if (teamsInRound.has(m.local.id)) duplicates.add(m.local.id);
                teamsInRound.add(m.local.id);
            }
            // Check Visitante
            if (m.visitante.id !== 'BYE') {
                if (teamsInRound.has(m.visitante.id)) duplicates.add(m.visitante.id);
                teamsInRound.add(m.visitante.id);
            }
        }

        if (duplicates.size > 0 || roundErrors.length > 0) {
            conflicts[rIndex] = Array.from(duplicates);
            totalConflicts += duplicates.size;
        }
    }

    return { conflicts, totalConflicts, expectedMatchesPerRound };
};

export const autoCorregirFixture = (initialMatches, totalTeams, maxIterations = 5000) => {
    // NOTA: Para el modo edición, NO debemos mover partidos que tengan 'roundLocked' o 'locked'
    
    let currentMatches = JSON.parse(JSON.stringify(initialMatches));
    const expectedMatchesPerRound = Math.ceil(totalTeams / 2);
    
    const getStatus = (ms) => validarFixture(ms, totalTeams);

    let { totalConflicts: bestScore } = getStatus(currentMatches);
    let bestSolution = JSON.parse(JSON.stringify(currentMatches));

    if (bestScore === 0) return currentMatches;

    for (let i = 0; i < maxIterations; i++) {
        if (bestScore === 0) break;

        const byRound = {};
        currentMatches.forEach(m => {
            if(!byRound[m.jornadaIndex]) byRound[m.jornadaIndex] = [];
            byRound[m.jornadaIndex].push(m);
        });

        const roundsIndexes = Object.keys(byRound).map(Number);
        const fatRounds = roundsIndexes.filter(r => byRound[r].length > expectedMatchesPerRound);
        const thinRounds = roundsIndexes.filter(r => byRound[r].length < expectedMatchesPerRound);

        if (fatRounds.length > 0 && thinRounds.length > 0) {
            const sourceR = fatRounds[Math.floor(Math.random() * fatRounds.length)];
            const targetR = thinRounds[Math.floor(Math.random() * thinRounds.length)];

            // Importante: Solo candidatos NO bloqueados
            const candidates = byRound[sourceR].filter(m => !m.locked && !m.roundLocked);
            
            if (candidates.length > 0) {
                const matchToMove = candidates[Math.floor(Math.random() * candidates.length)];
                matchToMove.jornadaIndex = targetR; 
                
                const { totalConflicts: newScore } = getStatus(currentMatches);
                if (newScore < bestScore) {
                    bestScore = newScore;
                    bestSolution = JSON.parse(JSON.stringify(currentMatches));
                }
                continue; 
            }
        }

        const { conflicts } = getStatus(currentMatches);
        const conflictRounds = Object.keys(conflicts);
        
        if (conflictRounds.length === 0) continue; 

        const badRound = Number(conflictRounds[Math.floor(Math.random() * conflictRounds.length)]);
        const badTeams = conflicts[badRound];
        
        let conflictiveMatches = currentMatches.filter(m => 
            m.jornadaIndex === badRound && 
            !m.locked && !m.roundLocked &&
            (badTeams.includes(m.local.id) || badTeams.includes(m.visitante.id))
        );

        if (conflictiveMatches.length === 0) {
             conflictiveMatches = currentMatches.filter(m => m.jornadaIndex === badRound && !m.locked && !m.roundLocked);
        }
        
        if (conflictiveMatches.length === 0) continue; 

        const matchA = conflictiveMatches[Math.floor(Math.random() * conflictiveMatches.length)];
        const idxA = currentMatches.findIndex(m => m.id === matchA.id);

        const targetRoundsToCheck = roundsIndexes.filter(r => r !== badRound);
        
        let bestSwapCandidate = null;

        // Búsqueda simplificada para swap
        for (let r of targetRoundsToCheck) {
            const candidatesB = currentMatches.filter(m => 
                m.jornadaIndex === r && 
                !m.locked && !m.roundLocked &&
                m.isByeMatch === matchA.isByeMatch
            );
            
            if(candidatesB.length > 0) {
                 const matchB = candidatesB[Math.floor(Math.random() * candidatesB.length)];
                 bestSwapCandidate = matchB;
                 break; 
            }
        }

        if (bestSwapCandidate) {
            const idxB = currentMatches.findIndex(m => m.id === bestSwapCandidate.id);
            const temp = currentMatches[idxA].jornadaIndex;
            currentMatches[idxA].jornadaIndex = currentMatches[idxB].jornadaIndex;
            currentMatches[idxB].jornadaIndex = temp;

            const { totalConflicts: currentTotal } = getStatus(currentMatches);
             if (currentTotal < bestScore) {
                bestScore = currentTotal;
                bestSolution = JSON.parse(JSON.stringify(currentMatches));
            }
        }
    }

    return bestSolution;
};