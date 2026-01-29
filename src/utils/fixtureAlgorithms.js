import { generarFixture } from "../services/torneos";

/**
 * Genera la estructura plana inicial de partidos.
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
                    id: `match_${matchIdCounter++}`,
                    local: local,
                    visitante: visita,
                    jornadaIndex: rIndex,
                    locked: false, 
                    isByeMatch: isBye
                });
            }
        });
    });

    // Ida y vuelta
    if (config?.vueltas === "2") {
        const totalRoundsIda = rounds.length;
        const matchesVuelta = newMatches.map(m => ({
            ...m,
            id: `match_${matchIdCounter++}`,
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
 * Valida conflictos (equipos repetidos) Y desbalance numérico de jornadas.
 */
export const validarFixture = (matches, totalTeams) => {
    const conflicts = {};
    let totalConflicts = 0;
    
    // Cálculo dinámico de partidos esperados por jornada
    // Si N es par: N/2 partidos. Si N es impar: (N+1)/2 partidos (incluyendo el Bye)
    const expectedMatchesPerRound = Math.ceil(totalTeams / 2);

    const byRound = {};
    const maxJornada = Math.max(...matches.map(m => m.jornadaIndex), 0);

    // Inicializar arrays para todas las jornadas
    for(let i=0; i<=maxJornada; i++) byRound[i] = [];
    
    for (const m of matches) {
        if(byRound[m.jornadaIndex]) byRound[m.jornadaIndex].push(m);
    }

    for (const rIndex in byRound) {
        const roundMatches = byRound[rIndex];
        const roundErrors = [];

        // 1. Validación de Cantidad (Balance)
        if (roundMatches.length > expectedMatchesPerRound) {
            roundErrors.push('OVERFLOW'); // Demasiados partidos
            totalConflicts += (roundMatches.length - expectedMatchesPerRound) * 2; // Penalización alta
        }

        // 2. Validación de Duplicados (Equipos jugando doble)
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
            // Guardamos los IDs duplicados para marcarlos en rojo en la UI
            // Si es error de overflow, marcamos toda la jornada técnicamente
            conflicts[rIndex] = Array.from(duplicates);
            totalConflicts += duplicates.size;
        }
    }

    return { conflicts, totalConflicts, expectedMatchesPerRound };
};

/**
 * Algoritmo Optimizado: Fase de Balanceo + Fase de Min-Conflicts
 */
export const autoCorregirFixture = (initialMatches, totalTeams, maxIterations = 5000) => {
    let currentMatches = JSON.parse(JSON.stringify(initialMatches));
    const expectedMatchesPerRound = Math.ceil(totalTeams / 2);
    
    // Función auxiliar para recalcular estado
    const getStatus = (ms) => validarFixture(ms, totalTeams);

    let { totalConflicts: bestScore } = getStatus(currentMatches);
    let bestSolution = JSON.parse(JSON.stringify(currentMatches));

    if (bestScore === 0) return currentMatches;

    for (let i = 0; i < maxIterations; i++) {
        if (bestScore === 0) break;

        // --- FASE 1: BALANCEO DE CARGA (Para arreglar drag & drop de jornadas) ---
        // Identificar jornadas con exceso y defecto
        const byRound = {};
        currentMatches.forEach(m => {
            if(!byRound[m.jornadaIndex]) byRound[m.jornadaIndex] = [];
            byRound[m.jornadaIndex].push(m);
        });

        const roundsIndexes = Object.keys(byRound).map(Number);
        const fatRounds = roundsIndexes.filter(r => byRound[r].length > expectedMatchesPerRound);
        const thinRounds = roundsIndexes.filter(r => byRound[r].length < expectedMatchesPerRound);

        // Si hay desbalance, MOVER (Move) en lugar de INTERCAMBIAR (Swap)
        if (fatRounds.length > 0 && thinRounds.length > 0) {
            const sourceR = fatRounds[Math.floor(Math.random() * fatRounds.length)];
            const targetR = thinRounds[Math.floor(Math.random() * thinRounds.length)];

            // Buscar partido no bloqueado en la jornada llena
            const candidates = byRound[sourceR].filter(m => !m.locked);
            
            if (candidates.length > 0) {
                const matchToMove = candidates[Math.floor(Math.random() * candidates.length)];
                matchToMove.jornadaIndex = targetR; // MOVIMIENTO UNILATERAL
                
                // Evaluar si mejoramos
                const { totalConflicts: newScore } = getStatus(currentMatches);
                if (newScore < bestScore) {
                    bestScore = newScore;
                    bestSolution = JSON.parse(JSON.stringify(currentMatches));
                }
                continue; // Pasamos a la siguiente iteración sin hacer swap normal
            }
        }

        // --- FASE 2: RESOLUCIÓN DE CONFLICTOS (SWAP) ---
        const { conflicts } = getStatus(currentMatches);
        const conflictRounds = Object.keys(conflicts);
        
        if (conflictRounds.length === 0) continue; // Si solo queda desbalance, lo maneja la fase 1

        const badRound = Number(conflictRounds[Math.floor(Math.random() * conflictRounds.length)]);
        const badTeams = conflicts[badRound];
        
        // Buscar partido causante del conflicto
        let conflictiveMatches = currentMatches.filter(m => 
            m.jornadaIndex === badRound && 
            !m.locked && 
            (badTeams.includes(m.local.id) || badTeams.includes(m.visitante.id))
        );

        if (conflictiveMatches.length === 0) {
             conflictiveMatches = currentMatches.filter(m => m.jornadaIndex === badRound && !m.locked);
        }
        
        if (conflictiveMatches.length === 0) continue; 

        const matchA = conflictiveMatches[Math.floor(Math.random() * conflictiveMatches.length)];
        const idxA = currentMatches.findIndex(m => m.id === matchA.id);

        // Buscar pareja para swap
        const targetRoundsToCheck = roundsIndexes.filter(r => r !== badRound);
        
        // Lógica Greedy (90%) vs Random (10%)
        if (Math.random() < 0.10) {
            const randomR = targetRoundsToCheck[Math.floor(Math.random() * targetRoundsToCheck.length)];
            const candidatesB = currentMatches.filter(m => 
                m.jornadaIndex === randomR && 
                !m.locked &&
                m.isByeMatch === matchA.isByeMatch // Mantiene consistencia si es torneo impar
            );
            
            if (candidatesB.length > 0) {
                const matchB = candidatesB[Math.floor(Math.random() * candidatesB.length)];
                performSwap(currentMatches, idxA, matchB);
            }
        } else {
            let bestSwapCandidate = null;
            let minDelta = Infinity;

            for (let r of targetRoundsToCheck) {
                const candidatesB = currentMatches.filter(m => 
                    m.jornadaIndex === r && 
                    !m.locked &&
                    m.isByeMatch === matchA.isByeMatch
                );
                
                for (let matchB of candidatesB) {
                    // Costo heurístico simple
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
            }
        }

        const { totalConflicts: currentTotal } = getStatus(currentMatches);
        if (currentTotal < bestScore) {
            bestScore = currentTotal;
            bestSolution = JSON.parse(JSON.stringify(currentMatches));
        } else if (i % 200 === 0) {
            // Reinicio suave para salir de minimos locales
            currentMatches = JSON.parse(JSON.stringify(bestSolution));
        }
    }

    return bestSolution;
};

// Helpers internos
function performSwap(matches, idxA, matchB) {
    const idxB = matches.findIndex(m => m.id === matchB.id);
    const tempJornada = matches[idxA].jornadaIndex;
    matches[idxA].jornadaIndex = matches[idxB].jornadaIndex;
    matches[idxB].jornadaIndex = tempJornada;
}

function countConflictsForMatchInRound(match, roundIndex, allMatches, ignoreMatchId) {
    let conflicts = 0;
    const matchesInRound = allMatches.filter(m => 
        m.jornadaIndex === roundIndex && 
        m.id !== ignoreMatchId && 
        m.id !== match.id
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