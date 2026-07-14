import { generarFixture } from "../services/torneos";
import {
    isOfficialJornadaName,
    resolveRepositionMappings,
    sortJornadas
} from "./jornadaUtils";

/**
 * Genera la estructura plana inicial de partidos (creacion).
 */
export const generarEstructuraInicial = (teams, config) => {
    if (!teams || teams.length < 2) return [];

    const mixed = [...teams];
    for (let i = mixed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }

    const rounds = generarFixture(mixed);
    let newMatches = [];
    let matchIdCounter = 1;

    const byeTeam = { id: "BYE", name: "DESCANSA", img: null, isBye: true };

    rounds.forEach((round, rIndex) => {
        round.forEach((m) => {
            const t1 = mixed.find((t) => t.id === m.home);
            const t2 = mixed.find((t) => t.id === m.away);

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
                    local,
                    visitante: visita,
                    jornadaIndex: rIndex,
                    locked: false,
                    roundLocked: false,
                    isByeMatch: isBye,
                    dbId: null,
                });
            }
        });
    });

    if (config?.vueltas === "2") {
        const totalRoundsIda = rounds.length;
        const matchesVuelta = newMatches.map((m) => ({
            ...m,
            id: `temp_${matchIdCounter++}`,
            local: m.visitante,
            visitante: m.local,
            jornadaIndex: m.jornadaIndex + totalRoundsIda,
            locked: false,
            roundLocked: false,
            isByeMatch: m.isByeMatch,
            dbId: null,
        }));
        newMatches = [...newMatches, ...matchesVuelta];
    }

    return newMatches;
};

export const generarJornadaExtra = ({
    teams,
    config,
    officialRoundsPlayed = 0,
    nextRoundIndex = 0,
    roundName,
}) => {
    if (!Array.isArray(teams) || teams.length < 2) return [];

    const normalizedTeams = teams.filter((team) => team?.id !== undefined && team?.id !== null);
    const baseRounds = generarFixture(normalizedTeams);
    if (baseRounds.length === 0) return [];

    const vueltas = String(config?.vueltas || "1") === "2" ? 2 : 1;
    const cycleLength = baseRounds.length * vueltas;
    const cycleIndex = officialRoundsPlayed % cycleLength;
    const baseRoundIndex = cycleIndex % baseRounds.length;
    const reverseHomeAway = vueltas === 2 && cycleIndex >= baseRounds.length;
    const byeTeam = { id: "BYE", name: "DESCANSA", img: null, isBye: true };
    const targetRound = baseRounds[baseRoundIndex] || [];

    return targetRound.reduce((acc, pair, pairIndex) => {
        const homeTeam = normalizedTeams.find((team) => String(team.id) === String(pair.home));
        const awayTeam = normalizedTeams.find((team) => String(team.id) === String(pair.away));

        if (!homeTeam && !awayTeam) {
            return acc;
        }

        const realTeam = homeTeam || awayTeam;
        const isByeMatch = !homeTeam || !awayTeam;
        let local = homeTeam;
        let visitante = awayTeam;

        if (isByeMatch && realTeam) {
            local = realTeam;
            visitante = byeTeam;
        } else if (reverseHomeAway) {
            local = awayTeam;
            visitante = homeTeam;
        }

        if (!local) {
            return acc;
        }

        acc.push({
            id: `temp_extra_${nextRoundIndex}_${pairIndex + 1}`,
            local,
            visitante: visitante || byeTeam,
            jornadaIndex: nextRoundIndex,
            locked: false,
            roundLocked: false,
            isByeMatch,
            dbId: null,
            isGeneratedRound: true,
            roundType: "extra",
            roundName: roundName || `Jornada ${nextRoundIndex + 1}`,
        });

        return acc;
    }, []);
};

/**
 * Transforma partidos de BD al formato del editor.
 * Evita descansos falsos en jornadas de reposicion o por partidos reprogramados.
 */
export const transformarPartidosExistentes = (
    matchesDB,
    jornadas,
    teams,
    repositionMatchMappings = [],
    repositionMappings = []
) => {
    const byeTeam = { id: "BYE", name: "DESCANSA", img: null, isBye: true };
    const editorMatches = [];
    const isOddTournament = Array.isArray(teams) && teams.length % 2 !== 0;

    const teamsPlayingByRound = {};
    const hasExplicitByeByRound = {};
    const repositionMatchMap = new Map();
    const repositionJornadaMap = new Map();

    const jornadaMap = {};
    const jornadasSorted = sortJornadas(jornadas);
    const resolvedRepositionMappings = resolveRepositionMappings({
        jornadas: jornadasSorted,
        configuredMappings: repositionMappings,
    });

    (repositionMatchMappings || []).forEach((mapping) => {
        if (!mapping?.matchId) return;
        repositionMatchMap.set(String(mapping.matchId), mapping);
    });

    (resolvedRepositionMappings || []).forEach((mapping) => {
        if (!mapping?.repositionJornadaId) return;
        repositionJornadaMap.set(String(mapping.repositionJornadaId), mapping);
    });

    jornadasSorted.forEach((j, index) => {
        jornadaMap[j.id] = { index, status: j.status, id: j.id, name: j.name };
        teamsPlayingByRound[index] = new Set();
        hasExplicitByeByRound[index] = false;
    });

    matchesDB.forEach((m) => {
        const matchMapping = repositionMatchMap.get(String(m.id));
        const jornadaMapping = repositionJornadaMap.get(String(m.jornada_id));
        const sourceJornadaId =
            matchMapping?.originalJornadaId ||
            jornadaMapping?.originalJornadaId ||
            m.jornada_id;
        const jInfo = jornadaMap[sourceJornadaId] || jornadaMap[m.jornada_id];
        if (!jInfo) return;

        const localTeam = teams.find((t) => String(t.id) === String(m.team1_id));
        const visitaTeam = teams.find((t) => String(t.id) === String(m.team2_id));
        const isRoundLocked = jInfo.status === "Confirmada" || jInfo.status === "Finalizada";

        if (!localTeam) return;

        const roundSet = teamsPlayingByRound[jInfo.index];
        const localIdStr = String(localTeam.id);
        const visitIdStr = visitaTeam ? String(visitaTeam.id) : null;
        const isByeMatch = !visitaTeam || visitIdStr === "BYE";

        // Evitamos duplicar el mismo descanso o el mismo partido por datos repetidos.
        if (isByeMatch) {
            if (hasExplicitByeByRound[jInfo.index]) return;
        } else if (roundSet.has(localIdStr) || (visitIdStr && roundSet.has(visitIdStr))) {
            return;
        }

        roundSet.add(localIdStr);
        if (visitIdStr && visitIdStr !== "BYE") {
            roundSet.add(visitIdStr);
        }

        if (isByeMatch) {
            hasExplicitByeByRound[jInfo.index] = true;
        }

        editorMatches.push({
            id: m.id,
            dbId: m.id,
            local: localTeam,
            visitante: visitaTeam || byeTeam,
            jornadaIndex: jInfo.index,
            locked: isRoundLocked,
            roundLocked: isRoundLocked,
            isByeMatch,
        });
    });

    // Solo agregamos descansos sinteticos cuando son realmente identificables:
    // torneo impar, jornada oficial, sin descanso explicito y exactamente un equipo faltante.
    jornadasSorted.forEach((j, index) => {
        if (!isOddTournament) return;
        if (!isOfficialJornadaName(j?.name)) return;
        if (hasExplicitByeByRound[index]) return;

        const jInfo = jornadaMap[j.id];
        const isRoundLocked = jInfo.status === "Confirmada" || jInfo.status === "Finalizada";
        const roundSet = teamsPlayingByRound[index];
        const teamsResting = teams.filter((t) => !roundSet.has(String(t.id)));

        if (teamsResting.length !== 1) return;

        const [restingTeam] = teamsResting;
        editorMatches.push({
            id: `temp_bye_${index}_${restingTeam.id}`,
            dbId: null,
            local: restingTeam,
            visitante: byeTeam,
            jornadaIndex: index,
            locked: isRoundLocked,
            roundLocked: isRoundLocked,
            isByeMatch: true,
        });
    });

    return editorMatches;
};

/**
 * Valida conflictos.
 * Ignora conflictos en jornadas bloqueadas.
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
        const roundMatches = byRound[rIndex];
        const isRoundLocked = roundMatches.some((m) => m.roundLocked);
        if (isRoundLocked) continue;

        const teamsInRound = new Set();
        const duplicates = new Set();

        for (const m of roundMatches) {
            if (m.local.id !== "BYE") {
                if (teamsInRound.has(m.local.id)) duplicates.add(m.local.id);
                teamsInRound.add(m.local.id);
            }
            if (m.visitante.id !== "BYE") {
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
 * Algoritmo Min-Conflicts optimizado.
 * Respeta estrictamente los bloqueos.
 */
export const autoCorregirFixture = (initialMatches, maxIterations = 5000) => {
    let currentMatches = structuredClone(initialMatches);

    let { totalConflicts: bestScore } = validarFixture(currentMatches);
    let bestSolution = structuredClone(currentMatches);

    if (bestScore === 0) return currentMatches;

    const maxJornada = Math.max(...currentMatches.map((m) => m.jornadaIndex), 0);

    for (let i = 0; i < maxIterations; i++) {
        if (bestScore === 0) break;

        const { conflicts } = validarFixture(currentMatches);
        const conflictRounds = Object.keys(conflicts);

        if (conflictRounds.length === 0) break;

        const badRound = Number(conflictRounds[Math.floor(Math.random() * conflictRounds.length)]);
        const badTeams = conflicts[badRound];

        let conflictiveMatches = currentMatches.filter(
            (m) =>
                m.jornadaIndex === badRound &&
                !m.locked &&
                !m.roundLocked &&
                (badTeams.includes(m.local.id) || badTeams.includes(m.visitante.id))
        );

        if (conflictiveMatches.length === 0) {
            conflictiveMatches = currentMatches.filter(
                (m) => m.jornadaIndex === badRound && !m.locked && !m.roundLocked
            );
        }

        if (conflictiveMatches.length === 0) {
            continue;
        }

        const matchA = conflictiveMatches[Math.floor(Math.random() * conflictiveMatches.length)];
        const idxA = currentMatches.findIndex((m) => m.id === matchA.id);

        const targetRoundsToCheck = [];
        for (let r = 0; r <= maxJornada; r++) {
            const isDestLocked = currentMatches.some((m) => m.jornadaIndex === r && m.roundLocked);
            if (r !== badRound && !isDestLocked) targetRoundsToCheck.push(r);
        }

        if (targetRoundsToCheck.length === 0) break;

        let bestSwapCandidate = null;
        let minDelta = Infinity;

        for (const r of targetRoundsToCheck) {
            const candidatesB = currentMatches.filter(
                (m) =>
                    m.jornadaIndex === r &&
                    !m.locked &&
                    !m.roundLocked &&
                    m.isByeMatch === matchA.isByeMatch
            );

            for (const matchB of candidatesB) {
                const costAInR = countConflictsForMatchInRound(matchA, r, currentMatches, matchB.id);
                const costBInBad = countConflictsForMatchInRound(matchB, badRound, currentMatches, matchA.id);
                const totalCost = costAInR + costBInBad;

                if (totalCost < minDelta) {
                    minDelta = totalCost;
                    bestSwapCandidate = matchB;
                }
            }
        }

        if (bestSwapCandidate) {
            performSwap(currentMatches, idxA, bestSwapCandidate);
        } else {
            const randomR = targetRoundsToCheck[Math.floor(Math.random() * targetRoundsToCheck.length)];
            const candidatesB = currentMatches.filter(
                (m) =>
                    m.jornadaIndex === randomR &&
                    !m.locked &&
                    !m.roundLocked &&
                    m.isByeMatch === matchA.isByeMatch
            );
            if (candidatesB.length > 0) {
                const matchB = candidatesB[Math.floor(Math.random() * candidatesB.length)];
                performSwap(currentMatches, idxA, matchB);
            }
        }

        const { totalConflicts: currentTotal } = validarFixture(currentMatches);
        if (currentTotal < bestScore) {
            bestScore = currentTotal;
            bestSolution = structuredClone(currentMatches);
        }
    }

    return bestSolution;
};

function performSwap(matches, idxA, matchB) {
    const idxB = matches.findIndex((m) => m.id === matchB.id);
    const tempJornada = matches[idxA].jornadaIndex;
    matches[idxA].jornadaIndex = matches[idxB].jornadaIndex;
    matches[idxB].jornadaIndex = tempJornada;
}

function countConflictsForMatchInRound(match, roundIndex, allMatches, ignoreMatchId) {
    const isRoundLocked = allMatches.some((m) => m.jornadaIndex === roundIndex && m.roundLocked);
    if (isRoundLocked) return 9999;

    let conflicts = 0;
    const matchesInRound = allMatches.filter(
        (m) => m.jornadaIndex === roundIndex && m.id !== ignoreMatchId && m.id !== match.id
    );
    const teamsInRound = new Set();

    matchesInRound.forEach((m) => {
        if (m.local.id !== "BYE") teamsInRound.add(m.local.id);
        if (m.visitante.id !== "BYE") teamsInRound.add(m.visitante.id);
    });

    if (match.local.id !== "BYE" && teamsInRound.has(match.local.id)) conflicts++;
    if (match.visitante.id !== "BYE" && teamsInRound.has(match.visitante.id)) conflicts++;

    return conflicts;
}
