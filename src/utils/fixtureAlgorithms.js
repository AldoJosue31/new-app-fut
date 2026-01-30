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
                    id: `temp_${matchIdCounter++}`,
                    local: local,
                    visitante: visita,
                    jornadaIndex: rIndex,
                    locked: false, 
                    isByeMatch: isBye,
                    dbId: null 
                });
            }
        });
    });

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
 */
export const transformarPartidosExistentes = (matchesDB, jornadas, teams) => {
    const byeTeam = { id: 'BYE', name: 'DESCANSA', img: null, isBye: true };
    const editorMatches = [];
    const jornadaMap = {};
    
    const jornadasSorted = [...jornadas].sort((a,b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || a.id;
        const numB = parseInt(b.name.replace(/\D/g, '')) || b.id;
        return numA - numB;
    });

    jornadasSorted.forEach((j, index) => {
        jornadaMap[j.id] = { index: index, status: j.status, id: j.id };
    });

    matchesDB.forEach(m => {
        const jInfo = jornadaMap[m.jornada_id];
        if (!jInfo) return;

        const localTeam = teams.find(t => t.id === m.team1_id);
        const visitaTeam = teams.find(t => t.id === m.team2_id);
        const isRoundLocked = (jInfo.status === 'Confirmada' || jInfo.status === 'Finalizada');

        if (localTeam) {
            editorMatches.push({
                id: m.id,
                dbId: m.id,
                local: localTeam,
                visitante: visitaTeam || byeTeam,
                jornadaIndex: jInfo.index,
                locked: isRoundLocked,
                roundLocked: isRoundLocked,
                isByeMatch: !localTeam || !visitaTeam
            });
        }
    });

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

        teamsResting.forEach(t => {
            editorMatches.push({
                id: `temp_bye_${index}_${t.id}`,
                dbId: null,
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
 * Valida conflictos (equipos repetidos en la misma jornada).
 */
export const validarFixture = (matches) => {
    const conflicts = {};
    let totalConflicts = 0;
    const byRound = {};

    for (const m of matches) {
        if (!byRound[m.jornadaIndex]) byRound[m.jornadaIndex] = [];
        byRound[m.jornadaIndex].push(m);
    }

    for (const rIndex in byRound) {
        const teamsInRound = new Set();
        const duplicates = new Set();
        const roundMatches = byRound[rIndex];

        for (const m of roundMatches) {
            if (m.local.id !== 'BYE') {
                if (teamsInRound.has(m.local.id)) duplicates.add(m.local.id);
                teamsInRound.add(m.local.id);
            }
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
 * Algoritmo "Min-Conflicts" Optimizado (Recuperado).
 * Respeta estrictamente los bloqueos de jornadas y bloqueos manuales.
 */
export const autoCorregirFixture = (initialMatches, maxIterations = 10000) => {
    let currentMatches = JSON.parse(JSON.stringify(initialMatches));
    let { totalConflicts: bestScore } = validarFixture(currentMatches);
    let bestSolution = JSON.parse(JSON.stringify(currentMatches));

    if (bestScore === 0) return currentMatches;

    const maxJornada = Math.max(...currentMatches.map(m => m.jornadaIndex), 0);

    for (let i = 0; i < maxIterations; i++) {
        if (bestScore === 0) break;

        const { conflicts } = validarFixture(currentMatches);
        const conflictRounds = Object.keys(conflicts);
        if (conflictRounds.length === 0) break;

        const badRound = Number(conflictRounds[Math.floor(Math.random() * conflictRounds.length)]);
        const badTeams = conflicts[badRound];
        
        // Buscar un partido que cause el conflicto Y que NO esté bloqueado (ni por BD ni manual)
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
        const targetRoundsToCheck = [];
        for(let r=0; r<=maxJornada; r++) if(r !== badRound) targetRoundsToCheck.push(r);
        
        // Estrategia Probabilística del código original
        if (Math.random() < 0.10) {
            const randomR = targetRoundsToCheck[Math.floor(Math.random() * targetRoundsToCheck.length)];
            const candidatesB = currentMatches.filter(m => 
                m.jornadaIndex === randomR && !m.locked && !m.roundLocked && m.isByeMatch === matchA.isByeMatch 
            );
            if (candidatesB.length > 0) {
                const matchB = candidatesB[Math.floor(Math.random() * candidatesB.length)];
                performSwap(currentMatches, idxA, matchB);
            }
        } else {
            // Greedy: Buscar el swap que minimice conflictos
            let bestSwapCandidate = null;
            let minDelta = Infinity;

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
            if (bestSwapCandidate) performSwap(currentMatches, idxA, bestSwapCandidate);
        }

        const { totalConflicts: currentTotal } = validarFixture(currentMatches);
        if (currentTotal < bestScore) {
            bestScore = currentTotal;
            bestSolution = JSON.parse(JSON.stringify(currentMatches));
        } else if (i % 500 === 0) {
            currentMatches = JSON.parse(JSON.stringify(bestSolution));
        }
    }
    return bestSolution;
};

// --- Helpers Internos Recuperados ---
function performSwap(matches, idxA, matchB) {
    const idxB = matches.findIndex(m => m.id === matchB.id);
    const tempJornada = matches[idxA].jornadaIndex;
    matches[idxA].jornadaIndex = matches[idxB].jornadaIndex;
    matches[idxB].jornadaIndex = tempJornada;
}

function countConflictsForMatchInRound(match, roundIndex, allMatches, ignoreMatchId) {
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