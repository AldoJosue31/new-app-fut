import { generarFixture } from "../services/torneos";

/**
 * Genera la estructura plana inicial de partidos.
 * Incluye la lógica para manejar equipos impares (BYE).
 */
export const generarEstructuraInicial = (teams, config) => {
    if (!teams || teams.length < 2) return [];

    const mixed = [...teams];
    // Barajeo Fisher-Yates: Mezcla los equipos antes de generar el calendario base
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

            // Caso 1: t2 no existe (t1 vs BYE)
            if (local && !visita) {
                visita = byeTeam;
                isBye = true;
            }
            // Caso 2: t1 no existe (BYE vs t2) -> Invertimos para que el Bye siempre sea visualmente el visitante
            else if (!local && visita) {
                local = visita;
                visita = byeTeam;
                isBye = true;
            }
            // Caso 3: Ambos existen
            else if (local && visita) {
                isBye = false;
            } else {
                return; 
            }

            if (local) {
                newMatches.push({
                    id: `match_${matchIdCounter++}`, // Prefijo más limpio
                    local: local,
                    visitante: visita,
                    jornadaIndex: rIndex,
                    locked: false, // Inicialmente nada está bloqueado
                    isByeMatch: isBye
                });
            }
        });
    });

    // Si es ida y vuelta
    if (config?.vueltas === "2") {
        const totalRoundsIda = rounds.length;
        // Creamos la vuelta invirtiendo localías
        const matchesVuelta = newMatches.map(m => ({
            ...m,
            id: `match_${matchIdCounter++}`,
            local: m.visitante, 
            visitante: m.local,
            jornadaIndex: m.jornadaIndex + totalRoundsIda,
            locked: false,
            // El tipo de partido (Bye o Normal) se mantiene igual aunque giren
            isByeMatch: m.isByeMatch
        }));
        newMatches = [...newMatches, ...matchesVuelta];
    }

    return newMatches;
};

/**
 * Valida el fixture en busca de equipos jugando dos veces en la misma jornada.
 * Retorna un objeto con los conflictos y el conteo total.
 */
export const validarFixture = (matches) => {
    const conflicts = {};
    let totalConflicts = 0;

    const byRound = {};
    // Agrupamos por jornada
    for (const m of matches) {
        if (!byRound[m.jornadaIndex]) byRound[m.jornadaIndex] = [];
        byRound[m.jornadaIndex].push(m);
    }

    for (const rIndex in byRound) {
        const teamsInRound = new Set();
        const duplicates = new Set();
        const roundMatches = byRound[rIndex];

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
 * Respeta estrictamente los partidos con locked: true.
 */
export const autoCorregirFixture = (initialMatches, maxIterations = 10000) => {
    // Clon profundo para no mutar el estado directamente durante el cálculo
    let currentMatches = JSON.parse(JSON.stringify(initialMatches));
    
    let { totalConflicts: bestScore } = validarFixture(currentMatches);
    let bestSolution = JSON.parse(JSON.stringify(currentMatches));

    if (bestScore === 0) return currentMatches;

    const maxJornada = Math.max(...currentMatches.map(m => m.jornadaIndex));

    for (let i = 0; i < maxIterations; i++) {
        if (bestScore === 0) break;

        // 1. Identificar jornadas con conflictos
        const { conflicts } = validarFixture(currentMatches);
        const conflictRounds = Object.keys(conflicts);
        
        if (conflictRounds.length === 0) break;

        // 2. Elegir una jornada conflictiva al azar
        const badRound = Number(conflictRounds[Math.floor(Math.random() * conflictRounds.length)]);
        const badTeams = conflicts[badRound];
        
        // 3. Buscar un partido que cause el conflicto Y que NO esté bloqueado
        let conflictiveMatches = currentMatches.filter(m => 
            m.jornadaIndex === badRound && 
            !m.locked && // CRUCIAL: Respetar bloqueo
            (badTeams.includes(m.local.id) || badTeams.includes(m.visitante.id))
        );

        // Si todos los conflictivos están bloqueados, intentamos mover otro no bloqueado de la misma jornada para hacer espacio
        if (conflictiveMatches.length === 0) {
             conflictiveMatches = currentMatches.filter(m => m.jornadaIndex === badRound && !m.locked);
        }
        
        // Si absolutamente todo está bloqueado en esa jornada, no podemos hacer nada ahí
        if (conflictiveMatches.length === 0) continue; 

        // Elegimos uno al azar para mover
        const matchA = conflictiveMatches[Math.floor(Math.random() * conflictiveMatches.length)];
        const idxA = currentMatches.findIndex(m => m.id === matchA.id);

        // 4. Buscar candidato para intercambio (SWAP)
        const targetRoundsToCheck = [];
        for(let r=0; r<=maxJornada; r++) if(r !== badRound) targetRoundsToCheck.push(r);
        
        // Estrategia Probabilística: 
        // 90% Greedy (Mejor movimiento local), 10% Aleatorio (para salir de mínimos locales)
        if (Math.random() < 0.10) {
            const randomR = targetRoundsToCheck[Math.floor(Math.random() * targetRoundsToCheck.length)];
            const candidatesB = currentMatches.filter(m => 
                m.jornadaIndex === randomR && 
                !m.locked &&
                m.isByeMatch === matchA.isByeMatch 
            );
            
            if (candidatesB.length > 0) {
                const matchB = candidatesB[Math.floor(Math.random() * candidatesB.length)];
                performSwap(currentMatches, idxA, matchB);
            }
        } else {
            // Greedy: Buscar el swap que minimice conflictos
            let bestSwapCandidate = null;
            let minDelta = Infinity; // Buscamos reducir conflictos (delta negativo o bajo)

            // Limitamos la búsqueda a unas cuantas jornadas al azar para rendimiento si son muchas
            // (Si tienes < 20 jornadas, revisar todas está bien)
            for (let r of targetRoundsToCheck) {
                const candidatesB = currentMatches.filter(m => 
                    m.jornadaIndex === r && 
                    !m.locked &&
                    m.isByeMatch === matchA.isByeMatch
                );
                
                for (let matchB of candidatesB) {
                    // Calculamos cuántos conflictos genera poner A en la jornada R
                    const costA_in_R = countConflictsForMatchInRound(matchA, r, currentMatches, matchB.id); 
                    // Calculamos cuántos conflictos genera traer B a la jornada conflictiva (badRound)
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

        // 5. Evaluar si mejoramos la solución global
        const { totalConflicts: currentTotal } = validarFixture(currentMatches);
        if (currentTotal < bestScore) {
            bestScore = currentTotal;
            bestSolution = JSON.parse(JSON.stringify(currentMatches));
        } else {
            // Mecanismo de "Reinicio Suave": Si llevamos muchos intentos sin mejorar, volvemos a la mejor conocida
            if (i % 500 === 0) {
                currentMatches = JSON.parse(JSON.stringify(bestSolution));
            }
        }
    }

    return bestSolution;
};

// --- Helpers Internos ---

function performSwap(matches, idxA, matchB) {
    const idxB = matches.findIndex(m => m.id === matchB.id);
    // Intercambio simple de indices de jornada
    const tempJornada = matches[idxA].jornadaIndex;
    matches[idxA].jornadaIndex = matches[idxB].jornadaIndex;
    matches[idxB].jornadaIndex = tempJornada;
}

function countConflictsForMatchInRound(match, roundIndex, allMatches, ignoreMatchId) {
    let conflicts = 0;
    // Filtramos partidos en esa jornada, ignorando los que se van a mover (ignoreMatchId)
    // y el propio partido que estamos evaluando
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

    // Si mis equipos ya están en esa jornada, es conflicto
    if (match.local.id !== 'BYE' && teamsInRound.has(match.local.id)) conflicts++;
    if (match.visitante.id !== 'BYE' && teamsInRound.has(match.visitante.id)) conflicts++;
    
    return conflicts;
}