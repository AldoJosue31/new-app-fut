import { generarFixture } from "../services/torneos";

/**
 * Genera la estructura plana inicial de partidos.
 * CORREGIDO: Ahora detecta correctamente cuando el BYE es 'home' o 'away'.
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
            
            // Lógica corregida: Normalizar para que el BYE siempre sea el 'visitante' visualmente
            // o simplemente asegurar que el partido se cree si uno de los dos es real.
            
            let local = t1;
            let visita = t2;
            let isBye = false;

            // Caso 1: t2 no existe (t1 vs BYE)
            if (local && !visita) {
                visita = byeTeam;
                isBye = true;
            }
            // Caso 2: t1 no existe (BYE vs t2) -> Invertimos para UI
            else if (!local && visita) {
                local = visita;
                visita = byeTeam;
                isBye = true;
            }
            // Caso 3: Ambos existen (Partido normal)
            else if (local && visita) {
                isBye = false;
            } else {
                return; // Nadie juega (caso imposible en Berger normal)
            }

            // Solo agregamos si tenemos un equipo local real (que ahora siempre tenemos si hay alguien descansando)
            if (local) {
                newMatches.push({
                    id: `temp_${matchIdCounter++}`,
                    local: local,
                    visitante: visita,
                    jornadaIndex: rIndex,
                    locked: false,
                    isByeMatch: isBye
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
            // Mantenemos el flag de bye aunque se invierta
            isByeMatch: m.local.id === 'BYE' || m.visitante.id === 'BYE'
        }));
        newMatches = [...newMatches, ...matchesVuelta];
    }

    return newMatches;
};

/**
 * Valida el fixture y cuenta conflictos.
 */
export const validarFixture = (matches) => {
    const conflicts = {};
    let totalConflicts = 0;

    const byRound = {};
    // Pre-agrupado
    for (const m of matches) {
        if (!byRound[m.jornadaIndex]) byRound[m.jornadaIndex] = [];
        byRound[m.jornadaIndex].push(m);
    }

    for (const rIndex in byRound) {
        const teamsInRound = new Set();
        const duplicates = new Set();
        const roundMatches = byRound[rIndex];

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

        if (duplicates.size > 0) {
            conflicts[rIndex] = Array.from(duplicates);
            totalConflicts += duplicates.size;
        }
    }

    return { conflicts, totalConflicts };
};

/**
 * Algoritmo "Min-Conflicts" con Swap Estricto por TIPO.
 */
export const autoCorregirFixture = (initialMatches, maxIterations = 10000) => {
    let currentMatches = JSON.parse(JSON.stringify(initialMatches));
    
    let { totalConflicts: bestScore } = validarFixture(currentMatches);
    let bestSolution = JSON.parse(JSON.stringify(currentMatches));

    if (bestScore === 0) return currentMatches;

    const maxJornada = Math.max(...currentMatches.map(m => m.jornadaIndex));

    for (let i = 0; i < maxIterations; i++) {
        if (bestScore === 0) break;

        // A. Identificar conflictos
        const { conflicts } = validarFixture(currentMatches);
        const conflictRounds = Object.keys(conflicts);
        
        if (conflictRounds.length === 0) break;

        // B. Elegir jornada y partido conflictivo
        const badRound = Number(conflictRounds[Math.floor(Math.random() * conflictRounds.length)]);
        const badTeams = conflicts[badRound];
        
        // Buscamos un partido involucrado en el conflicto
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

        // C. ESTRATEGIA: SOLO SWAP DEL MISMO TIPO (Real vs Real, Bye vs Bye)
        const targetRoundsToCheck = [];
        for(let r=0; r<=maxJornada; r++) if(r !== badRound) targetRoundsToCheck.push(r);
        
        // Random Walk
        if (Math.random() < 0.05) {
            const randomR = targetRoundsToCheck[Math.floor(Math.random() * targetRoundsToCheck.length)];
            const candidatesB = currentMatches.filter(m => 
                m.jornadaIndex === randomR && 
                !m.locked &&
                m.isByeMatch === matchA.isByeMatch // CRUCIAL
            );
            
            if (candidatesB.length > 0) {
                const matchB = candidatesB[Math.floor(Math.random() * candidatesB.length)];
                performSwap(currentMatches, idxA, matchB);
            }
        } else {
            // Greedy
            let bestSwapCandidate = null;
            let minDelta = Infinity;

            for (let r of targetRoundsToCheck) {
                const candidatesB = currentMatches.filter(m => 
                    m.jornadaIndex === r && 
                    !m.locked &&
                    m.isByeMatch === matchA.isByeMatch // CRUCIAL
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
            }
        }

        // D. Evaluar Globalmente
        const { totalConflicts: currentTotal } = validarFixture(currentMatches);
        if (currentTotal < bestScore) {
            bestScore = currentTotal;
            bestSolution = JSON.parse(JSON.stringify(currentMatches));
        } else {
            if (i % 200 === 0) {
                currentMatches = JSON.parse(JSON.stringify(bestSolution));
            }
        }
    }

    return bestSolution;
};

// Helpers
function performSwap(matches, idxA, matchB) {
    const idxB = matches.findIndex(m => m.id === matchB.id);
    const tempJornada = matches[idxA].jornadaIndex;
    matches[idxA].jornadaIndex = matches[idxB].jornadaIndex;
    matches[idxB].jornadaIndex = tempJornada;
}

function countConflictsForMatchInRound(match, roundIndex, allMatches, ignoreMatchId) {
    let conflicts = 0;
    const matchesInRound = allMatches.filter(m => m.jornadaIndex === roundIndex && m.id !== ignoreMatchId && m.id !== match.id);
    const teamsInRound = new Set();
    matchesInRound.forEach(m => {
        if(m.local.id !== 'BYE') teamsInRound.add(m.local.id);
        if(m.visitante.id !== 'BYE') teamsInRound.add(m.visitante.id);
    });
    if (match.local.id !== 'BYE' && teamsInRound.has(match.local.id)) conflicts++;
    if (match.visitante.id !== 'BYE' && teamsInRound.has(match.visitante.id)) conflicts++;
    return conflicts;
}