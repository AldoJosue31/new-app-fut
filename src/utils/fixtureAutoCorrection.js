import { validarFixture } from "./fixtureValidation.js";

const TEAM_SIDES = ["local", "visitante"];
const MAX_CANDIDATES_PER_STEP = 900;
const MAX_PLATEAU_CANDIDATES = 18;
const MAX_SECOND_STEP_CANDIDATES = 120;
const MAX_PAIRING_SEARCH_NODES = 25000;
const MAX_GLOBAL_SCHEDULE_VARIANTS = 4096;
const MAX_MULTI_STEP_RESTARTS = 8;
const MAX_STAGNANT_MULTI_STEP_MOVES = 240;

const isNaturalRoundMatch = (match) =>
    match?.roundType !== "extra" && match?.roundType !== "reposition";

const isEditableMatch = (match) =>
    isNaturalRoundMatch(match) && !match?.locked && !match?.roundLocked;

const isHardLockedMatch = (match) =>
    isNaturalRoundMatch(match) && Boolean(match?.locked || match?.roundLocked);

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
    const firstRound = first.jornadaIndex;
    next[firstIndex] = { ...first, jornadaIndex: second.jornadaIndex };
    next[secondIndex] = { ...second, jornadaIndex: firstRound };
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

const buildMultiStepRepairContext = (matches, config) => {
    if (String(config?.vueltas ?? "1") !== "1") return null;

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
) => {
    const context = buildMultiStepRepairContext(initialMatches, config);
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

const assignGeneratedRounds = (roundInfos, generatedRounds) => {
    const generatedPairSets = generatedRounds.map(
        (pairs) => new Set(pairs.map(([firstTeam, secondTeam]) => matchupKey(firstTeam, secondTeam))),
    );
    const candidates = roundInfos.map((roundInfo) => ({
        roundKey: roundInfo.roundKey,
        generatedIndexes: generatedPairSets.reduce((indexes, pairSet, generatedIndex) => {
            if (roundInfo.lockedPairKeys.every((pairKey) => pairSet.has(pairKey))) {
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

const applyGeneratedSchedule = (matches, roundInfos, generatedRounds, assignment) => {
    const next = cloneMatches(matches);

    for (const roundInfo of roundInfos) {
        const generatedIndex = assignment.get(roundInfo.roundKey);
        const remainingPairs = (generatedRounds[generatedIndex] || []).map((pair) => [...pair]);

        for (const matchIndex of roundInfo.lockedIndexes) {
            const lockedMatch = matches[matchIndex];
            const lockedPairKey = matchupKey(lockedMatch.local, lockedMatch.visitante);
            const pairIndex = remainingPairs.findIndex(
                ([firstTeam, secondTeam]) => matchupKey(firstTeam, secondTeam) === lockedPairKey,
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
            const local = currentLocalId === secondId ? secondTeam : firstTeam;
            const visitante = currentLocalId === secondId ? firstTeam : secondTeam;

            next[matchIndex] = normalizeByeMatch({
                ...current,
                local,
                visitante,
            });
        }
    }

    return next;
};

const rebuildCompleteSingleLegSchedule = (matches, config) => {
    if (String(config?.vueltas ?? "1") !== "1") return null;

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
    const expectedRoundCount = scheduleTeams.length - 1;
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
        const lockedPairKeys = lockedIndexes.map((index) =>
            matchupKey(matches[index].local, matches[index].visitante),
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
            lockedPairKeys,
            hasUniqueParticipants: new Set(participantIds).size === participantIds.length,
            isScanned: lockedIndexes.some((index) => matches[index].scanLocked),
        };
    });

    if (roundInfos.some(({ indexes }) => indexes.length !== expectedMatchesPerRound)) return null;

    const anchorCandidates = roundInfos
        .filter(({ lockedIndexes, hasUniqueParticipants }) =>
            lockedIndexes.length === expectedMatchesPerRound && hasUniqueParticipants,
        )
        .sort((first, second) => Number(second.isScanned) - Number(first.isScanned));

    if (anchorCandidates.length === 0) return null;

    for (const anchor of anchorCandidates) {
        const anchorPairs = anchor.indexes.map((index) => [
            matches[index].local,
            matches[index].visitante,
        ]);
        const triedOrderings = new Set();

        for (let attempt = 0; attempt < MAX_GLOBAL_SCHEDULE_VARIANTS; attempt += 1) {
            const orderedTeams = buildAnchorOrdering(anchorPairs, attempt);
            const orderingKey = orderedTeams.map((team) => String(team.id)).join("::");
            if (triedOrderings.has(orderingKey)) continue;
            triedOrderings.add(orderingKey);

            const generatedRounds = buildRoundRobinRounds(orderedTeams);
            const assignment = assignGeneratedRounds(roundInfos, generatedRounds);
            if (!assignment) continue;

            const rebuilt = applyGeneratedSchedule(
                matches,
                roundInfos,
                generatedRounds,
                assignment,
            );
            if (rebuilt && validarFixture(rebuilt, config).totalConflicts === 0) {
                return rebuilt;
            }
        }
    }

    return null;
};

const rebuildRoundPairings = (matches, roundKey) => {
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
    const usedMatchups = new Set();

    matches.forEach((match, index) => {
        if (!isNaturalRoundMatch(match)) return;
        if (String(match.jornadaIndex) === roundKey && editableIndexSet.has(index)) return;

        const localId = String(match.local?.id ?? "");
        const visitanteId = String(match.visitante?.id ?? "");
        if (!localId || !visitanteId || localId === "BYE" || visitanteId === "BYE") return;

        usedMatchups.add(matchupKey(match.local, match.visitante));
    });

    const availableTeams = editableRoundIndexes.flatMap((index) => [
        matches[index].local,
        matches[index].visitante,
    ]);
    let searchNodes = 0;

    const canPair = (firstTeam, secondTeam) =>
        String(firstTeam.id) === "BYE" ||
        String(secondTeam.id) === "BYE" ||
        !usedMatchups.has(matchupKey(firstTeam, secondTeam));

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
        const currentLocalId = String(current.local?.id ?? "");
        const firstId = String(firstTeam.id);
        const secondId = String(secondTeam.id);
        const local = currentLocalId === secondId ? secondTeam : firstTeam;
        const visitante = currentLocalId === firstId ? secondTeam : (
            currentLocalId === secondId ? firstTeam : secondTeam
        );

        next[matchIndex] = normalizeByeMatch({
            ...current,
            local,
            visitante,
        });
    });

    return next;
};

function* generateCandidateFixtures(matches, validation) {
    const conflictRounds = new Set(Object.keys(validation.conflicts || {}).map(String));

    if ((validation.repeatedMatchups || []).length > 0) {
        for (const roundKey of conflictRounds) {
            const rebuiltRound = rebuildRoundPairings(matches, roundKey);
            if (rebuiltRound) yield rebuiltRound;
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
export const autoCorregirFixture = (
    initialMatches,
    maxEvaluations = 5000,
    config = null,
) => {
    let currentMatches = structuredClone(initialMatches || []);
    let currentValidation = validarFixture(currentMatches, config);
    let currentScore = currentValidation.totalConflicts;
    let bestMatches = structuredClone(currentMatches);
    let bestScore = currentScore;
    let evaluations = 0;
    const visited = new Set([fixtureSignature(currentMatches)]);

    const multiStepMatches = repairCompleteScheduleByMultiStepSearch(
        currentMatches,
        maxEvaluations,
        config,
    );
    if (multiStepMatches) {
        const multiStepValidation = validarFixture(multiStepMatches, config);
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

    const globallyRebuiltMatches = rebuildCompleteSingleLegSchedule(currentMatches, config);
    if (globallyRebuiltMatches) return globallyRebuiltMatches;

    while (currentScore > 0 && evaluations < maxEvaluations) {
        let bestDirectCandidate = null;
        const plateauCandidates = [];
        let candidatesThisStep = 0;

        for (const candidateMatches of generateCandidateFixtures(currentMatches, currentValidation)) {
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

            const validation = validarFixture(candidateMatches, config);
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

                    const validation = validarFixture(candidateMatches, config);
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
