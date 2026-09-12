import {
    DEFAULT_FIXTURE_CRITERIA,
    resolveFixtureCriteria,
    validarFixture,
} from "./fixtureValidation.js";
import { isOfficialJornadaName, sortJornadas } from "./jornadaUtils.js";
import { solveFixtureConstraints } from "./fixtureConstraintSolver.js";

const TEAM_SIDES = ["local", "visitante"];
const MAX_CANDIDATES_PER_STEP = 900;
const MAX_PLATEAU_CANDIDATES = 18;
const MAX_SECOND_STEP_CANDIDATES = 120;
const MAX_PAIRING_SEARCH_NODES = 25000;
const MAX_GLOBAL_SCHEDULE_VARIANTS = 4096;
const MAX_SOFT_ANCHOR_VARIANTS = 32;
const MAX_MULTI_STEP_RESTARTS = 8;
const MAX_STAGNANT_MULTI_STEP_MOVES = 240;

const isNaturalRoundMatch = (match) =>
    match?.roundType !== "extra" && match?.roundType !== "reposition";

const isEditableMatch = (match) =>
    isNaturalRoundMatch(match) && !match?.locked && !match?.scanLocked && !match?.roundLocked;

const isHardLockedMatch = (match) =>
    isNaturalRoundMatch(match) && Boolean(match?.locked || match?.scanLocked || match?.roundLocked);

const normalizeByeMatch = (match) => {
    const localId = String(match?.local?.id ?? "");
    const visitanteId = String(match?.visitante?.id ?? "");
    const isByeMatch = localId === "BYE" || visitanteId === "BYE";

    if (localId === "BYE" && visitanteId !== "BYE") {
        return {
            ...match,
            local: match.visitante,
            visitante: match.local,
            isByeMatch: true,
        };
    }

    return { ...match, isByeMatch };
};

const cloneMatches = (matches) => matches.map((match) => ({ ...match }));

const matchupKey = (firstTeam, secondTeam) =>
    [String(firstTeam.id), String(secondTeam.id)].sort().join("::");

const getLegCount = (config) =>
    String(config?.vueltas ?? "1") === "2" ? 2 : 1;

const directedMatchupKey = (firstTeam, secondTeam) =>
    `${String(firstTeam.id)}::${String(secondTeam.id)}`;

const scheduledMatchupKey = (firstTeam, secondTeam, config, criteria) =>
    getLegCount(config) === 2 && criteria?.enforceReturnLegHomeAway !== false
        ? directedMatchupKey(firstTeam, secondTeam)
        : matchupKey(firstTeam, secondTeam);

const fixtureSignature = (matches) =>
    matches
        .map((match) =>
            [
                match.id,
                match.jornadaIndex,
                match.local?.id,
                match.visitante?.id,
            ].join(":"),
        )
        .join("|");

const swapTeamSlots = (matches, firstIndex, firstSide, secondIndex, secondSide) => {
    const firstTeam = matches[firstIndex]?.[firstSide];
    const secondTeam = matches[secondIndex]?.[secondSide];

    if (!firstTeam || !secondTeam || String(firstTeam.id) === String(secondTeam.id)) {
        return null;
    }

    const next = cloneMatches(matches);
    next[firstIndex] = normalizeByeMatch({
        ...next[firstIndex],
        [firstSide]: secondTeam,
    });
    next[secondIndex] = normalizeByeMatch({
        ...next[secondIndex],
        [secondSide]: firstTeam,
    });

    return next;
};

const swapMatchRounds = (matches, firstIndex, secondIndex) => {
    const first = matches[firstIndex];
    const second = matches[secondIndex];

    if (
        !first ||
        !second ||
        Number(first.jornadaIndex) === Number(second.jornadaIndex) ||
        Boolean(first.isByeMatch) !== Boolean(second.isByeMatch)
    ) {
        return null;
    }

    const next = cloneMatches(matches);
    // El registro y su horario pertenecen a la jornada; intercambiar los
    // cruces conserva también dbId, roundName y los metadatos de persistencia.
    next[firstIndex] = normalizeByeMatch({ ...first, local: second.local, visitante: second.visitante });
    next[secondIndex] = normalizeByeMatch({ ...second, local: first.local, visitante: first.visitante });
    return next;
};

const reverseMatchHomeAway = (matches, matchIndex) => {
    const match = matches[matchIndex];
    if (!match || match.isByeMatch || !match.local || !match.visitante) return null;

    const next = cloneMatches(matches);
    next[matchIndex] = normalizeByeMatch({
        ...match,
        local: match.visitante,
        visitante: match.local,
    });
    return next;
};

const hashFixtureSignature = (signature) => {
    let hash = 2166136261;

    for (let index = 0; index < signature.length; index += 1) {
        hash ^= signature.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
};

const createDeterministicRandom = (seed) => {
    let state = seed || 0x9e3779b9;

    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const playableMatchupKey = (firstTeam, secondTeam) => {
    if (!firstTeam || !secondTeam) return null;

    const firstId = String(firstTeam.id ?? "");
    const secondId = String(secondTeam.id ?? "");
    if (
        !firstId ||
        !secondId ||
        firstId === "BYE" ||
        secondId === "BYE" ||
        firstId === secondId
    ) {
        return null;
    }

    return [firstId, secondId].sort().join("::");
};

const buildMatchupUsage = (matches, excludedIndexes) => {
    const excluded = excludedIndexes || new Set();
    const usage = new Map();

    matches.forEach((match, index) => {
        if (excluded.has(index) || !isNaturalRoundMatch(match)) return;

        const pairKey = playableMatchupKey(match.local, match.visitante);
        if (!pairKey) return;

        const current = usage.get(pairKey) || {
            count: 0,
            directions: new Set(),
        };
        current.count += 1;
        current.directions.add(directedMatchupKey(match.local, match.visitante));
        usage.set(pairKey, current);
    });

    return usage;
};

const selectAllowedPairing = (firstTeam, secondTeam, usage, config, criteria) => {
    if (String(firstTeam.id) === "BYE" || String(secondTeam.id) === "BYE") {
        return [firstTeam, secondTeam];
    }

    if (!criteria.enforceRoundRobin) return [firstTeam, secondTeam];

    const pairKey = playableMatchupKey(firstTeam, secondTeam);
    const current = usage.get(pairKey) || { count: 0, directions: new Set() };
    if (current.count >= getLegCount(config)) return null;

    if (getLegCount(config) === 1) return [firstTeam, secondTeam];

    if (!criteria.enforceReturnLegHomeAway) return [firstTeam, secondTeam];

    const directKey = directedMatchupKey(firstTeam, secondTeam);
    if (!current.directions.has(directKey)) return [firstTeam, secondTeam];

    const reverseKey = directedMatchupKey(secondTeam, firstTeam);
    return current.directions.has(reverseKey) ? null : [secondTeam, firstTeam];
};

const duplicateContribution = (count) => Math.max(0, count - 1);

const buildMatchupCounts = (matches) => {
    const counts = new Map();

    matches.forEach((match) => {
        if (!isNaturalRoundMatch(match)) return;

        const pairKey = playableMatchupKey(match.local, match.visitante);
        if (!pairKey) return;
        counts.set(pairKey, (counts.get(pairKey) || 0) + 1);
    });

    return counts;
};

const countDuplicateMatchups = (counts) =>
    [...counts.values()].reduce(
        (total, count) => total + duplicateContribution(count),
        0,
    );

const adjustMatchupCount = (counts, pairKey, difference) => {
    if (!pairKey) return;

    const nextCount = (counts.get(pairKey) || 0) + difference;
    if (nextCount > 0) counts.set(pairKey, nextCount);
    else counts.delete(pairKey);
};

const matchupCountDelta = (counts, removedKeys, addedKeys) => {
    const differences = new Map();

    removedKeys.forEach((pairKey) => {
        if (pairKey) differences.set(pairKey, (differences.get(pairKey) || 0) - 1);
    });
    addedKeys.forEach((pairKey) => {
        if (pairKey) differences.set(pairKey, (differences.get(pairKey) || 0) + 1);
    });

    let delta = 0;
    differences.forEach((difference, pairKey) => {
        const currentCount = counts.get(pairKey) || 0;
        delta +=
            duplicateContribution(currentCount + difference) -
            duplicateContribution(currentCount);
    });

    return delta;
};

const buildMultiStepRepairContext = (matches, config, criteria) => {
    if (String(config?.vueltas ?? "1") !== "1" || !criteria.enforceRoundRobin) return null;

    const roundMap = new Map();
    const allParticipantIds = new Set();

    matches.forEach((match, index) => {
        if (!isNaturalRoundMatch(match)) return;

        const roundKey = String(match.jornadaIndex);
        const indexes = roundMap.get(roundKey) || [];
        indexes.push(index);
        roundMap.set(roundKey, indexes);

        [match.local, match.visitante].forEach((team) => {
            if (team?.id !== undefined && team?.id !== null) {
                allParticipantIds.add(String(team.id));
            }
        });
    });

    if (roundMap.size < 2 || allParticipantIds.size < 4) return null;

    const editableByRound = new Map();
    for (const [roundKey, indexes] of roundMap) {
        const participantIds = indexes.flatMap((index) => [
            String(matches[index].local?.id ?? ""),
            String(matches[index].visitante?.id ?? ""),
        ]);

        // El 2-switch conserva exactamente un participante por jornada. Si el
        // fixture ya tiene equipos duplicados dentro de una fecha, lo deja para
        // el solucionador general que también puede mover partidos de jornada.
        if (
            participantIds.length !== allParticipantIds.size ||
            new Set(participantIds).size !== participantIds.length ||
            participantIds.some((teamId) => !allParticipantIds.has(teamId))
        ) {
            return null;
        }

        const editableIndexes = indexes.filter((index) => isEditableMatch(matches[index]));
        if (editableIndexes.length >= 2) editableByRound.set(roundKey, editableIndexes);
    }

    if (editableByRound.size === 0) return null;
    return { editableByRound };
};

const createTwoSwitchCandidate = (
    matches,
    counts,
    firstIndex,
    secondIndex,
    reconnectOpposite,
) => {
    const firstMatch = matches[firstIndex];
    const secondMatch = matches[secondIndex];
    if (!firstMatch || !secondMatch) return null;

    const firstLocal = firstMatch.local;
    const firstVisitante = firstMatch.visitante;
    const secondLocal = secondMatch.local;
    const secondVisitante = secondMatch.visitante;
    const participantIds = [
        firstLocal?.id,
        firstVisitante?.id,
        secondLocal?.id,
        secondVisitante?.id,
    ].map((teamId) => String(teamId ?? ""));

    if (participantIds.some((teamId) => !teamId) || new Set(participantIds).size !== 4) {
        return null;
    }

    const firstNextVisitante = reconnectOpposite ? secondVisitante : secondLocal;
    const secondNextLocal = firstVisitante;
    const secondNextVisitante = reconnectOpposite ? secondLocal : secondVisitante;
    const firstNextLocal = firstLocal;
    const removedKeys = [
        playableMatchupKey(firstLocal, firstVisitante),
        playableMatchupKey(secondLocal, secondVisitante),
    ];
    const addedKeys = [
        playableMatchupKey(firstNextLocal, firstNextVisitante),
        playableMatchupKey(secondNextLocal, secondNextVisitante),
    ];

    return {
        firstIndex,
        secondIndex,
        removedKeys,
        addedKeys,
        delta: matchupCountDelta(counts, removedKeys, addedKeys),
        firstMatch: normalizeByeMatch({
            ...firstMatch,
            local: firstNextLocal,
            visitante: firstNextVisitante,
        }),
        secondMatch: normalizeByeMatch({
            ...secondMatch,
            local: secondNextLocal,
            visitante: secondNextVisitante,
        }),
    };
};

const applyTwoSwitchCandidate = (matches, counts, candidate) => {
    candidate.removedKeys.forEach((pairKey) => adjustMatchupCount(counts, pairKey, -1));
    candidate.addedKeys.forEach((pairKey) => adjustMatchupCount(counts, pairKey, 1));
    matches[candidate.firstIndex] = candidate.firstMatch;
    matches[candidate.secondIndex] = candidate.secondMatch;
};

const perturbMultiStepState = (matches, context, random, moveCount) => {
    const roundEntries = [...context.editableByRound.values()];
    const counts = buildMatchupCounts(matches);

    for (let moveIndex = 0; moveIndex < moveCount; moveIndex += 1) {
        const editableIndexes = roundEntries[Math.floor(random() * roundEntries.length)];
        if (!editableIndexes || editableIndexes.length < 2) continue;

        const firstPosition = Math.floor(random() * editableIndexes.length);
        let secondPosition = Math.floor(random() * (editableIndexes.length - 1));
        if (secondPosition >= firstPosition) secondPosition += 1;

        const candidate = createTwoSwitchCandidate(
            matches,
            counts,
            editableIndexes[firstPosition],
            editableIndexes[secondPosition],
            random() < 0.5,
        );
        if (candidate) applyTwoSwitchCandidate(matches, counts, candidate);
    }
};

/**
 * Repara calendarios completos mediante cadenas de 2-switches. Cada movimiento
 * cambia dos rivales dentro de una misma jornada, así que nunca altera fechas
 * confirmadas/escaneadas ni duplica participantes dentro de la jornada.
 *
 * A diferencia de la reconstrucción circular, esta búsqueda puede atravesar
 * mesetas y empeoramientos temporales; eso permite completar factorizaciones
 * válidas que requieren tres o más intercambios consecutivos.
 */
const repairCompleteScheduleByMultiStepSearch = (
    initialMatches,
    maxEvaluations,
    config,
    criteria,
) => {
    const context = buildMultiStepRepairContext(initialMatches, config, criteria);
    if (!context) return null;

    const random = createDeterministicRandom(
        hashFixtureSignature(fixtureSignature(initialMatches)),
    );
    let bestMatches = structuredClone(initialMatches);
    let bestScore = countDuplicateMatchups(buildMatchupCounts(bestMatches));
    let evaluations = 0;

    if (bestScore === 0) return bestMatches;

    for (
        let restart = 0;
        restart < MAX_MULTI_STEP_RESTARTS && evaluations < maxEvaluations;
        restart += 1
    ) {
        const currentMatches = structuredClone(bestMatches);
        if (restart > 0) {
            perturbMultiStepState(
                currentMatches,
                context,
                random,
                4 + restart * 3,
            );
        }

        const counts = buildMatchupCounts(currentMatches);
        let currentScore = countDuplicateMatchups(counts);
        let stagnantMoves = 0;

        while (currentScore > 0 && evaluations < maxEvaluations) {
            const conflictIndexes = [];
            context.editableByRound.forEach((editableIndexes) => {
                editableIndexes.forEach((matchIndex) => {
                    const match = currentMatches[matchIndex];
                    const pairKey = playableMatchupKey(match.local, match.visitante);
                    if (pairKey && (counts.get(pairKey) || 0) > 1) {
                        conflictIndexes.push(matchIndex);
                    }
                });
            });

            // Los conflictos restantes sólo están en partidos inmutables.
            if (conflictIndexes.length === 0) break;

            const conflictIndex = conflictIndexes[
                Math.floor(random() * conflictIndexes.length)
            ];
            const roundKey = String(currentMatches[conflictIndex].jornadaIndex);
            const editableIndexes = context.editableByRound.get(roundKey) || [];
            const candidates = [];

            for (const partnerIndex of editableIndexes) {
                if (partnerIndex === conflictIndex) continue;

                for (const reconnectOpposite of [false, true]) {
                    if (evaluations >= maxEvaluations) break;
                    const candidate = createTwoSwitchCandidate(
                        currentMatches,
                        counts,
                        conflictIndex,
                        partnerIndex,
                        reconnectOpposite,
                    );
                    evaluations += 1;
                    if (candidate) candidates.push(candidate);
                }
            }

            if (candidates.length === 0) break;

            const bestDelta = Math.min(...candidates.map(({ delta }) => delta));
            const bestCandidates = candidates.filter(({ delta }) => delta === bestDelta);
            const candidate = bestCandidates[Math.floor(random() * bestCandidates.length)];
            const progress = Math.min(1, evaluations / Math.max(1, maxEvaluations));
            const temperature = Math.max(0.08, 0.9 * (1 - progress));
            const acceptsTemporaryConflict =
                candidate.delta <= 0 || random() < Math.exp(-candidate.delta / temperature);

            if (!acceptsTemporaryConflict) {
                stagnantMoves += 1;
            } else {
                applyTwoSwitchCandidate(currentMatches, counts, candidate);
                currentScore += candidate.delta;
                stagnantMoves = candidate.delta < 0 ? 0 : stagnantMoves + 1;

                if (currentScore < bestScore) {
                    bestScore = currentScore;
                    bestMatches = structuredClone(currentMatches);
                    stagnantMoves = 0;
                    if (bestScore === 0) return bestMatches;
                }
            }

            if (stagnantMoves >= MAX_STAGNANT_MULTI_STEP_MOVES) break;
        }
    }

    return bestMatches;
};

const buildRoundRobinRounds = (orderedTeams) => {
    const rotatingTeams = [...orderedTeams];
    const rounds = [];

    for (let roundIndex = 0; roundIndex < rotatingTeams.length - 1; roundIndex += 1) {
        const pairs = [];

        for (let pairIndex = 0; pairIndex < rotatingTeams.length / 2; pairIndex += 1) {
            pairs.push([
                rotatingTeams[pairIndex],
                rotatingTeams[rotatingTeams.length - 1 - pairIndex],
            ]);
        }

        rounds.push(pairs);
        rotatingTeams.splice(1, 0, rotatingTeams.pop());
    }

    return rounds;
};

const buildRoundRobinSchedule = (orderedTeams, config) => {
    const firstLeg = buildRoundRobinRounds(orderedTeams);
    if (getLegCount(config) === 1) return firstLeg;

    return [
        ...firstLeg,
        ...firstLeg.map((round) =>
            round.map(([local, visitante]) => [visitante, local]),
        ),
    ];
};

const buildFixtureOrdering = (teams, attempt) => {
    const orderedTeams = [...teams];
    if (attempt === 0) return orderedTeams;

    const random = createDeterministicRandom(
        hashFixtureSignature(
            `${attempt}:${orderedTeams.map((team) => String(team.id)).join("::")}`,
        ),
    );

    for (let index = orderedTeams.length - 1; index > 0; index -= 1) {
        const target = Math.floor(random() * (index + 1));
        [orderedTeams[index], orderedTeams[target]] = [
            orderedTeams[target],
            orderedTeams[index],
        ];
    }

    return orderedTeams;
};

const buildAnchorOrdering = (anchorPairs, attempt) => {
    const pairs = anchorPairs.map(([firstTeam, secondTeam]) => [firstTeam, secondTeam]);

    if (attempt > 0) {
        let randomState = (attempt * 2654435761) >>> 0;
        const random = () => {
            randomState = (randomState * 1664525 + 1013904223) >>> 0;
            return randomState / 4294967296;
        };

        for (let index = pairs.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [pairs[index], pairs[target]] = [pairs[target], pairs[index]];
        }

        pairs.forEach((pair) => {
            if (random() < 0.5) [pair[0], pair[1]] = [pair[1], pair[0]];
        });
    }

    const orderedTeams = Array(pairs.length * 2);
    pairs.forEach(([firstTeam, secondTeam], pairIndex) => {
        orderedTeams[pairIndex] = firstTeam;
        orderedTeams[orderedTeams.length - 1 - pairIndex] = secondTeam;
    });
    return orderedTeams;
};

const assignGeneratedRounds = (roundInfos, generatedRounds, config, criteria) => {
    const generatedPairSets = generatedRounds.map(
        (pairs) => new Set(
            pairs.map(([firstTeam, secondTeam]) =>
                scheduledMatchupKey(firstTeam, secondTeam, config, criteria),
            ),
        ),
    );
    const candidates = roundInfos.map((roundInfo) => ({
        roundKey: roundInfo.roundKey,
        generatedIndexes: generatedPairSets.reduce((indexes, pairSet, generatedIndex) => {
            if (
                new Set(roundInfo.lockedMatchKeys).size === roundInfo.lockedMatchKeys.length &&
                roundInfo.lockedMatchKeys.every((matchKey) => pairSet.has(matchKey))
            ) {
                indexes.push(generatedIndex);
            }
            return indexes;
        }, []),
    }));

    if (candidates.some(({ generatedIndexes }) => generatedIndexes.length === 0)) return null;

    candidates.sort((first, second) =>
        first.generatedIndexes.length - second.generatedIndexes.length,
    );

    const assignment = new Map();
    const usedGeneratedRounds = new Set();

    const assignNext = (candidateIndex) => {
        if (candidateIndex >= candidates.length) return true;

        const candidate = candidates[candidateIndex];
        for (const generatedIndex of candidate.generatedIndexes) {
            if (usedGeneratedRounds.has(generatedIndex)) continue;

            assignment.set(candidate.roundKey, generatedIndex);
            usedGeneratedRounds.add(generatedIndex);

            if (assignNext(candidateIndex + 1)) return true;

            assignment.delete(candidate.roundKey);
            usedGeneratedRounds.delete(generatedIndex);
        }

        return false;
    };

    return assignNext(0) ? assignment : null;
};

const applyGeneratedSchedule = (
    matches,
    roundInfos,
    generatedRounds,
    assignment,
    config,
    criteria,
) => {
    const next = cloneMatches(matches);

    for (const roundInfo of roundInfos) {
        const generatedIndex = assignment.get(roundInfo.roundKey);
        const remainingPairs = (generatedRounds[generatedIndex] || []).map((pair) => [...pair]);

        for (const matchIndex of roundInfo.lockedIndexes) {
            const lockedMatch = matches[matchIndex];
            const lockedMatchKey = scheduledMatchupKey(
                lockedMatch.local,
                lockedMatch.visitante,
                config,
                criteria,
            );
            const pairIndex = remainingPairs.findIndex(
                ([firstTeam, secondTeam]) =>
                    scheduledMatchupKey(firstTeam, secondTeam, config, criteria) === lockedMatchKey,
            );

            if (pairIndex === -1) return null;
            remainingPairs.splice(pairIndex, 1);
        }

        if (remainingPairs.length !== roundInfo.editableIndexes.length) return null;

        for (const matchIndex of roundInfo.editableIndexes) {
            const current = matches[matchIndex];
            const currentTeamIds = new Set([
                String(current.local?.id ?? ""),
                String(current.visitante?.id ?? ""),
            ]);
            let bestPairIndex = 0;
            let bestPairScore = -1;

            remainingPairs.forEach(([firstTeam, secondTeam], pairIndex) => {
                const score = Number(currentTeamIds.has(String(firstTeam.id))) +
                    Number(currentTeamIds.has(String(secondTeam.id)));
                if (score > bestPairScore) {
                    bestPairScore = score;
                    bestPairIndex = pairIndex;
                }
            });

            const [firstTeam, secondTeam] = remainingPairs.splice(bestPairIndex, 1)[0];
            const currentLocalId = String(current.local?.id ?? "");
            const secondId = String(secondTeam.id);
            const [local, visitante] = getLegCount(config) === 2
                ? [firstTeam, secondTeam]
                : currentLocalId === secondId
                    ? [secondTeam, firstTeam]
                    : [firstTeam, secondTeam];

            next[matchIndex] = normalizeByeMatch({
                ...current,
                local,
                visitante,
            });
        }
    }

    return next;
};

const rebuildCompleteRoundRobinSchedule = (matches, config, criteria) => {
    // Una reconstruccion global tambien fuerza que cada equipo aparezca una
    // sola vez por jornada. Si esa regla esta desactivada, el autocorrector
    // debe limitarse a correcciones locales y no imponer un criterio ajeno.
    if (!criteria.enforceRoundRobin || !criteria.preventDuplicateTeams) return null;
    const naturalIndexes = matches.reduce((indexes, match, index) => {
        if (isNaturalRoundMatch(match)) indexes.push(index);
        return indexes;
    }, []);
    const teamById = new Map();
    let existingByeTeam = null;

    naturalIndexes.forEach((matchIndex) => {
        [matches[matchIndex].local, matches[matchIndex].visitante].forEach((team) => {
            if (team?.id === undefined || team?.id === null) return;
            if (String(team.id) === "BYE") {
                existingByeTeam = team;
                return;
            }
            if (!teamById.has(String(team.id))) teamById.set(String(team.id), team);
        });
    });

    const realTeams = [...teamById.values()];
    if (realTeams.length < 2) return null;

    const needsBye = realTeams.length % 2 !== 0;
    const scheduleTeams = needsBye
        ? [...realTeams, existingByeTeam || { id: "BYE", name: "DESCANSA", isBye: true }]
        : realTeams;
    const expectedRoundCount = (scheduleTeams.length - 1) * getLegCount(config);
    const expectedMatchesPerRound = scheduleTeams.length / 2;
    const roundMap = new Map();

    naturalIndexes.forEach((matchIndex) => {
        const roundKey = String(matches[matchIndex].jornadaIndex);
        const indexes = roundMap.get(roundKey) || [];
        indexes.push(matchIndex);
        roundMap.set(roundKey, indexes);
    });

    if (roundMap.size !== expectedRoundCount) return null;

    const roundInfos = [...roundMap.entries()].map(([roundKey, indexes]) => {
        const lockedIndexes = indexes.filter((index) => isHardLockedMatch(matches[index]));
        const editableIndexes = indexes.filter((index) => !isHardLockedMatch(matches[index]));
        const lockedMatchKeys = lockedIndexes.map((index) =>
            scheduledMatchupKey(
                matches[index].local,
                matches[index].visitante,
                config,
                criteria,
            ),
        );
        const participantIds = indexes.flatMap((index) => [
            String(matches[index].local?.id ?? ""),
            String(matches[index].visitante?.id ?? ""),
        ]);

        return {
            roundKey,
            indexes,
            lockedIndexes,
            editableIndexes,
            lockedMatchKeys,
            hasUniqueParticipants: new Set(participantIds).size === participantIds.length,
            isScanned: lockedIndexes.some((index) => matches[index].scanLocked),
        };
    });

    if (roundInfos.some(({ indexes }) => indexes.length !== expectedMatchesPerRound)) return null;

    const hardAnchorCandidates = roundInfos
        .filter(({ lockedIndexes, hasUniqueParticipants }) =>
            lockedIndexes.length === expectedMatchesPerRound && hasUniqueParticipants,
        )
        .sort((first, second) => Number(second.isScanned) - Number(first.isScanned));

    const hasLockedMatches = roundInfos.some(({ lockedIndexes }) => lockedIndexes.length > 0);
    const hardAnchorKeys = new Set(hardAnchorCandidates.map(({ roundKey }) => roundKey));
    const softAnchorCandidates = roundInfos
        .filter(({ roundKey, hasUniqueParticipants }) =>
            hasUniqueParticipants && !hardAnchorKeys.has(roundKey),
        )
        .sort((first, second) =>
            second.lockedIndexes.length - first.lockedIndexes.length ||
            Number(second.isScanned) - Number(first.isScanned),
        );
    const orderingSources = [
        ...hardAnchorCandidates.map((roundInfo) => ({
            roundInfo,
            variantLimit: MAX_GLOBAL_SCHEDULE_VARIANTS,
        })),
        ...softAnchorCandidates.map((roundInfo) => ({
            roundInfo,
            variantLimit: MAX_SOFT_ANCHOR_VARIANTS,
        })),
        { roundInfo: null, variantLimit: MAX_GLOBAL_SCHEDULE_VARIANTS },
    ];
    let remainingVariants = hasLockedMatches ? MAX_GLOBAL_SCHEDULE_VARIANTS : 1;

    for (const { roundInfo: anchor, variantLimit } of orderingSources) {
        if (remainingVariants <= 0) break;

        const anchorPairs = anchor
            ? anchor.indexes.map((index) => [
                matches[index].local,
                matches[index].visitante,
            ])
            : null;
        const triedOrderings = new Set();
        const maxVariants = Math.min(
            remainingVariants,
            variantLimit,
        );

        for (let attempt = 0; attempt < maxVariants; attempt += 1) {
            remainingVariants -= 1;
            const orderedTeams = anchor
                ? buildAnchorOrdering(anchorPairs, attempt)
                : buildFixtureOrdering(scheduleTeams, attempt);
            const orderingKey = orderedTeams.map((team) => String(team.id)).join("::");
            if (triedOrderings.has(orderingKey)) continue;
            triedOrderings.add(orderingKey);

            const generatedRounds = buildRoundRobinSchedule(orderedTeams, config);
            const assignment = assignGeneratedRounds(
                roundInfos,
                generatedRounds,
                config,
                criteria,
            );
            if (!assignment) continue;

            const rebuilt = applyGeneratedSchedule(
                matches,
                roundInfos,
                generatedRounds,
                assignment,
                config,
                criteria,
            );
            if (rebuilt && validarFixture(rebuilt, config, criteria).totalConflicts === 0) {
                return rebuilt;
            }
        }
    }

    return null;
};

const rebuildRoundPairings = (matches, roundKey, config, criteria) => {
    const roundIndexes = matches.reduce((indexes, match, index) => {
        if (String(match.jornadaIndex) === roundKey && isNaturalRoundMatch(match)) {
            indexes.push(index);
        }
        return indexes;
    }, []);
    const editableRoundIndexes = roundIndexes.filter((index) => isEditableMatch(matches[index]));

    if (editableRoundIndexes.length < 2) return null;

    const allRoundTeamIds = roundIndexes.flatMap((index) => [
        String(matches[index].local?.id ?? ""),
        String(matches[index].visitante?.id ?? ""),
    ]);

    if (new Set(allRoundTeamIds).size !== allRoundTeamIds.length) {
        return null;
    }

    const editableIndexSet = new Set(editableRoundIndexes);
    const matchupUsage = buildMatchupUsage(matches, editableIndexSet);

    const availableTeams = editableRoundIndexes.flatMap((index) => [
        matches[index].local,
        matches[index].visitante,
    ]);
    let searchNodes = 0;

    const canPair = (firstTeam, secondTeam) =>
        Boolean(selectAllowedPairing(firstTeam, secondTeam, matchupUsage, config, criteria));

    const findPairings = (remainingTeams, pairings = []) => {
        searchNodes += 1;
        if (searchNodes > MAX_PAIRING_SEARCH_NODES) return null;
        if (remainingTeams.length === 0) return pairings;

        let selectedIndex = 0;
        let selectedPartners = [];

        for (let firstIndex = 0; firstIndex < remainingTeams.length; firstIndex += 1) {
            const partners = [];
            for (let secondIndex = 0; secondIndex < remainingTeams.length; secondIndex += 1) {
                if (
                    firstIndex !== secondIndex &&
                    canPair(remainingTeams[firstIndex], remainingTeams[secondIndex])
                ) {
                    partners.push(secondIndex);
                }
            }

            if (partners.length === 0) return null;
            if (selectedPartners.length === 0 || partners.length < selectedPartners.length) {
                selectedIndex = firstIndex;
                selectedPartners = partners;
            }
        }

        for (const partnerIndex of selectedPartners) {
            const firstTeam = remainingTeams[selectedIndex];
            const secondTeam = remainingTeams[partnerIndex];
            const nextRemaining = remainingTeams.filter(
                (_, index) => index !== selectedIndex && index !== partnerIndex,
            );
            const result = findPairings(nextRemaining, [
                ...pairings,
                [firstTeam, secondTeam],
            ]);

            if (result) return result;
        }

        return null;
    };

    const pairings = findPairings(availableTeams);
    if (!pairings) return null;

    const next = cloneMatches(matches);
    editableRoundIndexes.forEach((matchIndex, pairingIndex) => {
        const current = matches[matchIndex];
        const [firstTeam, secondTeam] = pairings[pairingIndex];
        const [local, visitante] = selectAllowedPairing(
            firstTeam,
            secondTeam,
            matchupUsage,
            config,
            criteria,
        ) || [firstTeam, secondTeam];

        next[matchIndex] = normalizeByeMatch({
            ...current,
            local,
            visitante,
        });
    });

    return next;
};

function* generateCandidateFixtures(matches, validation, config, criteria) {
    const conflictRounds = new Set(Object.keys(validation.conflicts || {}).map(String));

    if ((validation.repeatedMatchups || []).length > 0) {
        for (const roundKey of conflictRounds) {
            const rebuiltRound = rebuildRoundPairings(matches, roundKey, config, criteria);
            if (rebuiltRound) yield rebuiltRound;
        }
    }

    // En ida y vuelta, un rival no puede repetirse con la misma localia.
    // Invertir el partido es la correccion minima cuando el cruce ya es valido.
    if (getLegCount(config) === 2 && criteria.enforceReturnLegHomeAway) {
        for (const roundKey of conflictRounds) {
            for (let index = 0; index < matches.length; index += 1) {
                const match = matches[index];
                if (
                    String(match.jornadaIndex) === roundKey &&
                    isEditableMatch(match) &&
                    !match.isByeMatch
                ) {
                    const candidate = reverseMatchHomeAway(matches, index);
                    if (candidate) yield candidate;
                }
            }
        }
    }

    // Cambiar equipos entre dos partidos de la misma jornada conserva la lista
    // de participantes de esa fecha, pero permite formar rivales distintos.
    for (const roundKey of conflictRounds) {
        const editableIndexes = matches.reduce((indexes, match, index) => {
            if (
                String(match.jornadaIndex) === roundKey &&
                isEditableMatch(match)
            ) {
                indexes.push(index);
            }
            return indexes;
        }, []);

        for (let first = 0; first < editableIndexes.length; first += 1) {
            for (let second = first + 1; second < editableIndexes.length; second += 1) {
                for (const firstSide of TEAM_SIDES) {
                    for (const secondSide of TEAM_SIDES) {
                        const candidate = swapTeamSlots(
                            matches,
                            editableIndexes[first],
                            firstSide,
                            editableIndexes[second],
                            secondSide,
                        );
                        if (candidate) yield candidate;
                    }
                }
            }
        }
    }

    // Los conflictos de equipos duplicados dentro de una jornada pueden requerir
    // intercambiar partidos completos entre dos fechas.
    const conflictMatchIndexes = matches.reduce((indexes, match, index) => {
        if (conflictRounds.has(String(match.jornadaIndex)) && isEditableMatch(match)) {
            indexes.push(index);
        }
        return indexes;
    }, []);
    const editableIndexes = matches.reduce((indexes, match, index) => {
        if (isEditableMatch(match)) indexes.push(index);
        return indexes;
    }, []);
    const generatedRoundSwaps = new Set();

    for (const firstIndex of conflictMatchIndexes) {
        for (const secondIndex of editableIndexes) {
            if (firstIndex === secondIndex) continue;

            const swapKey = [firstIndex, secondIndex].sort((a, b) => a - b).join(":");
            if (generatedRoundSwaps.has(swapKey)) continue;
            generatedRoundSwaps.add(swapKey);

            const candidate = swapMatchRounds(matches, firstIndex, secondIndex);
            if (candidate) yield candidate;
        }
    }
}

const rememberPlateauCandidate = (candidates, candidate) => {
    candidates.push(candidate);
    candidates.sort((a, b) => a.score - b.score);
    if (candidates.length > MAX_PLATEAU_CANDIDATES) candidates.pop();
};

/**
 * Reacomoda únicamente partidos editables. Busca primero una mejora directa y,
 * si queda en un mínimo local, permite un paso intermedio controlado antes de
 * volver a exigir una reducción real del total de conflictos.
 */
const repairFixtureHeuristically = (
    initialMatches,
    maxEvaluations = 5000,
    config = null,
    criteria = null,
) => {
    const activeCriteria = resolveFixtureCriteria(criteria);
    let currentMatches = structuredClone(initialMatches || []);
    let currentValidation = validarFixture(currentMatches, config, activeCriteria);
    let currentScore = currentValidation.totalConflicts;
    if (currentScore === 0 || !currentMatches.some(isEditableMatch)) return currentMatches;
    let bestMatches = structuredClone(currentMatches);
    let bestScore = currentScore;
    let evaluations = 0;
    const visited = new Set([fixtureSignature(currentMatches)]);

    const multiStepMatches = repairCompleteScheduleByMultiStepSearch(
        currentMatches,
        maxEvaluations,
        config,
        activeCriteria,
    );
    if (multiStepMatches) {
        const multiStepValidation = validarFixture(multiStepMatches, config, activeCriteria);
        if (multiStepValidation.totalConflicts === 0) return multiStepMatches;

        if (multiStepValidation.totalConflicts < currentScore) {
            currentMatches = multiStepMatches;
            currentValidation = multiStepValidation;
            currentScore = multiStepValidation.totalConflicts;
            bestMatches = structuredClone(multiStepMatches);
            bestScore = currentScore;
            visited.add(fixtureSignature(currentMatches));
        }
    }

    const globallyRebuiltMatches = rebuildCompleteRoundRobinSchedule(
        currentMatches,
        config,
        activeCriteria,
    );
    if (globallyRebuiltMatches) return globallyRebuiltMatches;

    while (currentScore > 0 && evaluations < maxEvaluations) {
        let bestDirectCandidate = null;
        const plateauCandidates = [];
        let candidatesThisStep = 0;

        for (const candidateMatches of generateCandidateFixtures(
            currentMatches,
            currentValidation,
            config,
            activeCriteria,
        )) {
            if (
                evaluations >= maxEvaluations ||
                candidatesThisStep >= MAX_CANDIDATES_PER_STEP
            ) {
                break;
            }

            const signature = fixtureSignature(candidateMatches);
            if (visited.has(signature)) continue;

            visited.add(signature);
            evaluations += 1;
            candidatesThisStep += 1;

            const validation = validarFixture(candidateMatches, config, activeCriteria);
            const candidate = {
                matches: candidateMatches,
                validation,
                score: validation.totalConflicts,
            };

            if (
                candidate.score < currentScore &&
                (!bestDirectCandidate || candidate.score < bestDirectCandidate.score)
            ) {
                bestDirectCandidate = candidate;
            } else if (candidate.score <= currentScore + 1) {
                rememberPlateauCandidate(plateauCandidates, candidate);
            }
        }

        if (bestDirectCandidate) {
            currentMatches = bestDirectCandidate.matches;
            currentValidation = bestDirectCandidate.validation;
            currentScore = bestDirectCandidate.score;
        } else {
            let bestTwoStepCandidate = null;

            for (const plateau of plateauCandidates) {
                let secondStepCount = 0;

                for (const candidateMatches of generateCandidateFixtures(
                    plateau.matches,
                    plateau.validation,
                    config,
                    activeCriteria,
                )) {
                    if (
                        evaluations >= maxEvaluations ||
                        secondStepCount >= MAX_SECOND_STEP_CANDIDATES
                    ) {
                        break;
                    }

                    const signature = fixtureSignature(candidateMatches);
                    if (visited.has(signature)) continue;

                    visited.add(signature);
                    evaluations += 1;
                    secondStepCount += 1;

                    const validation = validarFixture(candidateMatches, config, activeCriteria);
                    if (
                        validation.totalConflicts < currentScore &&
                        (
                            !bestTwoStepCandidate ||
                            validation.totalConflicts < bestTwoStepCandidate.score
                        )
                    ) {
                        bestTwoStepCandidate = {
                            matches: candidateMatches,
                            validation,
                            score: validation.totalConflicts,
                        };
                    }
                }
            }

            if (!bestTwoStepCandidate) break;

            currentMatches = bestTwoStepCandidate.matches;
            currentValidation = bestTwoStepCandidate.validation;
            currentScore = bestTwoStepCandidate.score;
        }

        if (currentScore < bestScore) {
            bestScore = currentScore;
            bestMatches = structuredClone(currentMatches);
        }
    }

    return bestMatches;
};

const getRoundKey = (round) => String(round.roundIndex ?? round.index);

const getFixtureTeams = (matches, teams) => {
    const candidates = teams?.length
        ? teams
        : matches.filter(isNaturalRoundMatch).flatMap((match) => [match.local, match.visitante]);
    const byId = new Map();
    candidates.forEach((team) => {
        const id = String(team?.id ?? "");
        if (id.trim() && id !== "BYE" && !byId.has(id)) byId.set(id, team);
    });
    return [...byId.values()];
};

// Completa los lugares de jornadas ya existentes. Nunca inventa jornadas ni
// elimina bloqueos; los registros sobrantes se devuelven para borrar al guardar.
const prepareCorrectionSlots = (matches, criteria, options) => {
    if (!criteria.enforceRoundRobin ||
        !criteria.requireCompleteRounds || !options.teams?.length) return matches;

    const teams = getFixtureTeams(matches, options.teams);
    if (teams.length < 2) return matches;
    const expectedSlots = Math.ceil(teams.length / 2);
    const rounds = new Map();
    const definitions = new Map((options.roundDefinitions || []).map((round) => [getRoundKey(round), round]));
    definitions.forEach((definition, key) => {
        if (!definition.isLocked && isNaturalRoundMatch({ roundType: definition.roundType ?? definition.type })) {
            rounds.set(key, []);
        }
    });
    matches.forEach((match) => {
        if (!isNaturalRoundMatch(match)) return;
        const key = String(match.jornadaIndex);
        const entries = rounds.get(key) || [];
        entries.push(match);
        rounds.set(key, entries);
    });
    const removedIds = new Set();
    const additions = [];
    const ids = new Set(matches.map((match) => String(match.id)));
    rounds.forEach((entries, key) => {
        const definition = definitions.get(key);
        if (definition?.isLocked || entries.some((match) => match.roundLocked)) return;
        const immutable = entries.filter(isHardLockedMatch);
        if (immutable.length > expectedSlots) return;
        const editable = entries.filter(isEditableMatch);
        editable.slice(Math.max(0, expectedSlots - immutable.length)).forEach((match) => removedIds.add(match.id));
        for (let slot = entries.length; slot < expectedSlots; slot += 1) {
            const baseId = `temp_autofix_${key}_${slot + 1}`;
            let id = baseId;
            for (let suffix = 1; ids.has(id); suffix += 1) id = `${baseId}_${suffix}`;
            ids.add(id);
            const template = entries[0];
            additions.push(normalizeByeMatch({
                id,
                dbId: null,
                jornadaIndex: Number(key),
                local: teams[(slot * 2) % teams.length],
                visitante: slot * 2 + 1 < teams.length
                    ? teams[slot * 2 + 1]
                    : { id: "BYE", name: "DESCANSA", isBye: true },
                locked: false,
                roundLocked: false,
                roundName: template?.roundName || definition?.title || definition?.name || `Jornada ${Number(key) + 1}`,
                roundType: template?.roundType || definition?.roundType || definition?.type,
                isGeneratedRound: template?.isGeneratedRound ?? definition?.isGenerated ?? false,
            }));
        }
    });
    return [...matches.filter((match) => !removedIds.has(match.id)), ...additions];
};

const describeBlockingMatches = (matches) => {
    const descriptions = matches.slice(0, 6).map((match) =>
        `${match.roundName || `Jornada ${Number(match.jornadaIndex) + 1}`}: ${match.local?.name || match.local?.id || "Equipo sin identificar"} vs ${match.visitante?.name || match.visitante?.id || "Equipo sin identificar"}`,
    );
    if (matches.length > 6) descriptions.push(`y ${matches.length - 6} partidos más`);
    return descriptions.join("; ");
};

/**
 * Resultado verificable de la corrección. "blocked" sólo se devuelve cuando
 * hay una contradicción entre partidos inmutables o se encuentra una solución
 * al liberar esos bloqueos. Agotar la búsqueda nunca demuestra imposibilidad.
 */
export const corregirFixtureConDiagnostico = (
    initialMatches = [],
    maxEvaluations = 5000,
    config = null,
    criteria = null,
    options = {},
) => {
    const original = structuredClone(initialMatches || []);
    const activeCriteria = resolveFixtureCriteria(criteria);
    const validationOptions = { teams: options.teams || [], roundDefinitions: options.roundDefinitions || [] };
    const validate = (matches) => validarFixture(matches, config, activeCriteria, validationOptions);
    const initialValidation = validate(original);
    const lockedRounds = new Set(validationOptions.roundDefinitions.filter((round) => round.isLocked).map(getRoundKey));
    const nonNaturalRounds = new Map(validationOptions.roundDefinitions
        .filter((round) => !isNaturalRoundMatch({ roundType: round.roundType ?? round.type }))
        .map((round) => [getRoundKey(round), round.roundType ?? round.type]));
    original.forEach((match) => {
        if (match.roundLocked) lockedRounds.add(String(match.jornadaIndex));
    });
    const protectedById = new Map(original.filter((match) =>
        !isEditableMatch(match) || lockedRounds.has(String(match.jornadaIndex)) || nonNaturalRounds.has(String(match.jornadaIndex)),
    ).map((match) => [match.id, match]));
    const protect = (matches) => matches.map((match) => ({
        ...match,
        ...(lockedRounds.has(String(match.jornadaIndex)) ? { roundLocked: true } : {}),
        ...(nonNaturalRounds.has(String(match.jornadaIndex)) ? { roundType: nonNaturalRounds.get(String(match.jornadaIndex)) } : {}),
    }));
    const restore = (matches) => matches.map((match) => protectedById.get(match.id) || match);
    let bestMatches = original;
    let bestValidation = initialValidation;
    const accept = (candidate) => {
        if (!candidate) return;
        const restored = restore(candidate);
        const validation = validate(restored);
        if (validation.totalConflicts < bestValidation.totalConflicts) {
            bestMatches = restored;
            bestValidation = validation;
        }
    };
    let searchResult = null;
    let workingMatches = original;
    if (initialValidation.totalConflicts > 0) {
        workingMatches = prepareCorrectionSlots(protect(original), activeCriteria, validationOptions);
        accept(workingMatches);
        if (bestValidation.totalConflicts > 0) {
            const hasInvalidParticipants = validate(restore(workingMatches)).invalidMatches.length > 0;
            const heuristic = hasInvalidParticipants
                ? workingMatches
                : repairFixtureHeuristically(workingMatches, maxEvaluations, config, activeCriteria);
            accept(heuristic);
            // Un calendario circular es sólo una familia de soluciones. La
            // búsqueda general permite también fijaciones parciales arbitrarias.
            if (bestValidation.totalConflicts > 0) {
                searchResult = solveFixtureConstraints(heuristic, config, {
                    ...activeCriteria,
                    requireCompleteRounds: activeCriteria.requireCompleteRounds && validationOptions.teams.length > 0,
                }, {
                    teams: getFixtureTeams(original, validationOptions.teams),
                    maxNodes: options.maxNodes ?? Math.min(250000, Math.max(1000, maxEvaluations * 10)),
                });
                accept(searchResult.matches);
            }
        }
    }

    let blockingMatches = [];
    let status = bestValidation.totalConflicts === 0 ? "resolved" : "incomplete";
    if (status !== "resolved") {
        const immutable = protect(original).filter(isHardLockedMatch);
        const lockedValidation = validarFixture(immutable, config, {
            ...activeCriteria, requireCompleteRounds: false,
        }, { teams: validationOptions.teams, inferImplicitByes: false });
        const expectedSlots = Math.ceil(getFixtureTeams(original, validationOptions.teams).length / 2);
        const oversizedLockedRounds = new Set();
        if (activeCriteria.requireCompleteRounds && validationOptions.teams.length > 0) {
            const counts = new Map();
            immutable.filter((match) => !match.roundLocked).forEach((match) => {
                const key = String(match.jornadaIndex);
                counts.set(key, (counts.get(key) || 0) + 1);
                if (counts.get(key) > expectedSlots) oversizedLockedRounds.add(key);
            });
        }
        if (lockedValidation.totalConflicts > 0 || oversizedLockedRounds.size > 0) {
            blockingMatches = immutable.filter((match) => {
                const ids = lockedValidation.conflicts[String(match.jornadaIndex)] || [];
                return ids.includes(String(match.local?.id ?? "")) || ids.includes(String(match.visitante?.id ?? "")) ||
                    oversizedLockedRounds.has(String(match.jornadaIndex)) ||
                    lockedValidation.invalidMatches?.some((invalid) => invalid.matchId === match.id) ||
                    lockedValidation.repeatedByes?.some((bye) => bye.roundIndexes.includes(String(match.jornadaIndex)) &&
                        [String(match.local?.id), String(match.visitante?.id)].includes(bye.teamId)) ||
                    lockedValidation.repeatedMatchups.some((pair) => pair.roundIndexes.includes(String(match.jornadaIndex)) &&
                        pair.teamIds.includes(String(match.local?.id)) && pair.teamIds.includes(String(match.visitante?.id)));
            }).map((match) => protectedById.get(match.id) || match);
            status = "blocked";
        } else if (searchResult?.impossible && immutable.length > 0) {
            const relaxed = solveFixtureConstraints(workingMatches.map((match) => isNaturalRoundMatch(match)
                ? { ...match, locked: false, scanLocked: false, roundLocked: false }
                : match), config, {
                ...activeCriteria,
                requireCompleteRounds: activeCriteria.requireCompleteRounds && validationOptions.teams.length > 0,
            }, { teams: getFixtureTeams(original, validationOptions.teams), maxNodes: 25000 });
            if (relaxed.matches) {
                status = "blocked";
                blockingMatches = immutable.map((match) => protectedById.get(match.id) || match);
            }
        }
    }
    const remainingIds = new Set(bestMatches.map((match) => match.id));
    const deletedMatchIds = original.filter((match) => match.dbId != null && !remainingIds.has(match.id)).map((match) => match.dbId);
    const remainingConflicts = bestValidation.totalConflicts;
    const message = status === "resolved"
        ? "Fixture ordenado. Se resolvieron los conflictos de los criterios activos y se conservaron los partidos bloqueados."
        : status === "blocked"
            ? `Quedan ${remainingConflicts} conflictos que no se pueden resolver sin modificar partidos bloqueados, escaneados o jornadas confirmadas. Revisa estos bloqueos: ${describeBlockingMatches(blockingMatches)}.`
            : searchResult?.exhausted
                ? `Quedan ${remainingConflicts} conflictos. Se alcanzó el límite de búsqueda sin encontrar una solución completa. Se conservaron los partidos bloqueados; revisa las jornadas señaladas y los criterios activos.`
                : `Quedan ${remainingConflicts} conflictos. No se encontró un calendario compatible con los equipos, la cantidad de partidos y los criterios activos. Revisa las jornadas señaladas.`;
    return {
        matches: bestMatches === original ? original : bestMatches.slice().sort((first, second) => Number(first.jornadaIndex) - Number(second.jornadaIndex)),
        status,
        initialConflicts: initialValidation.totalConflicts,
        remainingConflicts,
        blockingMatches,
        deletedMatchIds: [...new Set(deletedMatchIds)],
        message,
    };
};

// Conserva la API de quienes sólo necesitan el arreglo corregido.
export const autoCorregirFixture = (...args) => corregirFixtureConDiagnostico(...args).matches;

/**
 * Restaura las jornadas editables a un calendario Round Robin completo.
 * Las jornadas confirmadas siguen siendo inmutables; los bloqueos manuales o
 * provenientes de un escaneo en las demas jornadas se descartan para que no
 * impidan reconstruir el calendario.
 */
export const restaurarFixtureRoundRobin = (
    initialMatches,
    maxEvaluations = 15000,
    config = null,
) => {
    const cleanMatches = structuredClone(initialMatches || []).map((match) => {
        if (!isNaturalRoundMatch(match) || match?.roundLocked) return match;

        return {
            ...match,
            locked: false,
            scanLocked: false,
            scanScheduleAccepted: false,
            scanScheduleAction: null,
            scanScheduleSource: null,
        };
    });

    return autoCorregirFixture(
        cleanMatches,
        maxEvaluations,
        config,
        DEFAULT_FIXTURE_CRITERIA,
    );
};

const buildCompleteRoundRobinFixture = (teams = [], config = null) => {
    const validTeams = teams.filter(
        (team) => team?.id !== undefined && team?.id !== null
    );
    if (validTeams.length < 2) return [];

    const scheduleTeams = validTeams.length % 2 === 0
        ? validTeams
        : [...validTeams, { id: "BYE", name: "DESCANSA", isBye: true }];

    return buildRoundRobinSchedule(scheduleTeams, config).flatMap((round, roundIndex) =>
        round.map(([local, visitante], matchIndex) =>
            normalizeByeMatch({
                id: `temp_restore_${roundIndex}_${matchIndex + 1}`,
                dbId: null,
                local,
                visitante,
                jornadaIndex: roundIndex,
                locked: false,
                roundLocked: false,
                isByeMatch: false,
            })
        )
    );
};

const createRestoreError = (error) => ({
    matches: [],
    deletedMatchIds: [],
    error,
});

/**
 * Genera de nuevo todos los lugares de las jornadas oficiales. A diferencia de
 * una autocorreccion normal, no depende de que cada jornada tenga el mismo
 * numero de registros: reutiliza los registros editables disponibles, crea los
 * faltantes y devuelve los sobrantes para eliminarlos al guardar.
 */
export const restaurarFixtureRoundRobinCompleto = ({
    teams = [],
    config = null,
    existingData = null,
}) => {
    const jornadas = Array.isArray(existingData?.jornadas)
        ? existingData.jornadas
        : [];
    const matchesDB = Array.isArray(existingData?.matches)
        ? existingData.matches
        : [];
    const generatedFixture = buildCompleteRoundRobinFixture(teams, config);
    const expectedRoundCount = new Set(
        generatedFixture.map((match) => Number(match.jornadaIndex))
    ).size;
    const officialJornadas = sortJornadas(jornadas).filter((jornada) =>
        isOfficialJornadaName(jornada?.name)
    );
    const originalRoundIndexById = new Map(
        jornadas.map((jornada, index) => [String(jornada?.id), index])
    );
    const officialJornadaById = new Map(
        officialJornadas.map((jornada) => [String(jornada?.id), jornada])
    );
    const teamById = new Map(
        teams
            .filter((team) => team?.id !== undefined && team?.id !== null)
            .map((team) => [String(team.id), team])
    );

    if (generatedFixture.length === 0) {
        return createRestoreError(
            "Se requieren al menos dos equipos para reconstruir el fixture."
        );
    }

    if (officialJornadas.length !== expectedRoundCount) {
        return createRestoreError(
            "No se puede reconstruir el Round Robin porque la cantidad de jornadas oficiales no coincide con la configuracion del torneo."
        );
    }

    const generatedByRound = generatedFixture.map((match) => {
        const jornada = officialJornadas[Number(match.jornadaIndex)];
        return {
            ...match,
            jornadaIndex: originalRoundIndexById.get(String(jornada?.id)),
            roundName: jornada?.name || `Jornada ${Number(match.jornadaIndex) + 1}`,
        };
    });
    const slotIndexesByRound = generatedByRound.reduce((acc, match, index) => {
        const roundIndex = Number(match.jornadaIndex);
        const indexes = acc.get(roundIndex) || [];
        indexes.push(index);
        acc.set(roundIndex, indexes);
        return acc;
    }, new Map());
    const confirmedByRound = new Map();

    for (const jornada of officialJornadas) {
        if (jornada?.status !== "Confirmada" && jornada?.status !== "Finalizada") {
            continue;
        }

        const roundIndex = originalRoundIndexById.get(String(jornada.id));
        const confirmedMatches = [];
        const participantIds = new Set();
        let hasInvalidTeam = false;

        matchesDB
            .filter((match) => String(match?.jornada_id) === String(jornada.id))
            .forEach((match) => {
                const local = teamById.get(String(match?.team1_id));
                const visitante = match?.team2_id === null || match?.team2_id === undefined
                    ? { id: "BYE", name: "DESCANSA", isBye: true }
                    : teamById.get(String(match.team2_id));

                if (!local || !visitante) {
                    hasInvalidTeam = true;
                    return;
                }

                participantIds.add(String(local.id));
                if (String(visitante.id) !== "BYE") {
                    participantIds.add(String(visitante.id));
                }
                confirmedMatches.push(
                    normalizeByeMatch({
                        id: match.id,
                        dbId: match.id,
                        local,
                        visitante,
                        jornadaIndex: roundIndex,
                        locked: true,
                        roundLocked: true,
                        isByeMatch: false,
                        roundName: jornada.name || "",
                    })
                );
            });

        const expectedSlots = slotIndexesByRound.get(Number(roundIndex)) || [];
        const hasByeMatch = confirmedMatches.some((match) => match.isByeMatch);
        if (
            !hasInvalidTeam &&
            !hasByeMatch &&
            teams.length % 2 !== 0 &&
            confirmedMatches.length === expectedSlots.length - 1
        ) {
            const restingTeam = teams.find(
                (team) => !participantIds.has(String(team?.id))
            );
            if (restingTeam) {
                confirmedMatches.push({
                    id: `temp_confirmed_bye_${roundIndex}_${restingTeam.id}`,
                    dbId: null,
                    local: restingTeam,
                    visitante: { id: "BYE", name: "DESCANSA", isBye: true },
                    jornadaIndex: roundIndex,
                    locked: true,
                    roundLocked: true,
                    isByeMatch: true,
                    roundName: jornada.name || "",
                });
            }
        }

        if (hasInvalidTeam) {
            return createRestoreError(
                "No se puede completar el Round Robin porque una jornada confirmada tiene partidos incompatibles. Esta jornada se conserva sin cambios."
            );
        }

        confirmedByRound.set(roundIndex, confirmedMatches);
    }

    const fixtureToRestore = [
        ...generatedByRound.filter(
            (match) => !confirmedByRound.has(Number(match.jornadaIndex))
        ),
        ...[...confirmedByRound.values()].flat(),
    ];

    const restoredMatches = restaurarFixtureRoundRobin(
        fixtureToRestore,
        15000,
        config,
    );
    if (validarFixture(restoredMatches, config).totalConflicts > 0) {
        return createRestoreError(
            "No se puede completar el Round Robin sin modificar jornadas confirmadas que ya contienen cruces incompatibles."
        );
    }

    const editableRowsByRound = matchesDB.reduce((acc, match) => {
        const jornada = officialJornadaById.get(String(match?.jornada_id));
        if (
            !jornada ||
            jornada.status === "Confirmada" ||
            jornada.status === "Finalizada"
        ) {
            return acc;
        }

        const roundIndex = originalRoundIndexById.get(String(jornada.id));
        const rows = acc.get(roundIndex) || [];
        rows.push(match);
        acc.set(roundIndex, rows);
        return acc;
    }, new Map());
    const slotCounterByRound = new Map();
    const matches = restoredMatches.map((match) => {
        if (match.roundLocked) return match;

        const roundIndex = Number(match.jornadaIndex);
        const rows = editableRowsByRound.get(roundIndex) || [];
        const rowIndex = slotCounterByRound.get(roundIndex) || 0;
        const row = rows[rowIndex] || null;
        slotCounterByRound.set(roundIndex, rowIndex + 1);

        return {
            ...match,
            id: row?.id || `temp_restore_${roundIndex}_${rowIndex + 1}`,
            dbId: row?.id || null,
            locked: false,
            scanLocked: false,
            scanScheduleAccepted: false,
            scanScheduleAction: null,
            scanScheduleSource: null,
        };
    });
    const deletedMatchIds = [...editableRowsByRound.entries()].flatMap(
        ([roundIndex, rows]) => rows
            .slice(slotCounterByRound.get(roundIndex) || 0)
            .map((match) => match.id)
            .filter((id) => id !== undefined && id !== null)
    );

    return { matches, deletedMatchIds, error: null };
};
