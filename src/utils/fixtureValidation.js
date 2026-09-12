const BYE_TEAM_ID = "BYE";

export const DEFAULT_FIXTURE_CRITERIA = Object.freeze({
    preventDuplicateTeams: true,
    enforceRoundRobin: true,
    enforceReturnLegHomeAway: true,
    requireCompleteRounds: true,
});

export const resolveFixtureCriteria = (criteria = null) => {
    const resolved = {
        ...DEFAULT_FIXTURE_CRITERIA,
    };

    Object.keys(DEFAULT_FIXTURE_CRITERIA).forEach((criterion) => {
        if (typeof criteria?.[criterion] === "boolean") {
            resolved[criterion] = criteria[criterion];
        }
    });

    if (!resolved.enforceRoundRobin) {
        resolved.enforceReturnLegHomeAway = false;
    }

    return resolved;
};

export const serializeFixtureCriteria = (criteria = null) => ({
    version: 1,
    ...resolveFixtureCriteria(criteria),
});

const addRoundConflict = (conflictsByRound, roundIndex, teamIds) => {
    const roundKey = String(roundIndex);
    const roundConflicts = conflictsByRound.get(roundKey) || new Set();

    teamIds.forEach((teamId) => roundConflicts.add(teamId));
    conflictsByRound.set(roundKey, roundConflicts);
};

const normalizedTeamId = (rawTeamId) => {
    if (typeof rawTeamId === "number") {
        return Number.isFinite(rawTeamId) ? String(rawTeamId) : null;
    }
    return typeof rawTeamId === "string" && rawTeamId.trim() !== ""
        ? rawTeamId
        : null;
};

const allowsRepeatedMatchup = (match) =>
    match?.roundType === "extra" || match?.roundType === "reposition";

const getLegCount = (config) =>
    String(config?.vueltas ?? "1") === "2" ? 2 : 1;

const directedMatchupKey = (match) =>
    `${String(match.local.id)}::${String(match.visitante.id)}`;

/**
 * Valida equipos repetidos dentro de una jornada y los limites propios de un
 * round robin en las jornadas naturales. En ida, cada rival puede aparecer una
 * vez; en ida y vuelta puede aparecer dos veces, pero una con cada localia.
 *
 * Las jornadas confirmadas no se pueden corregir, pero sirven como historial:
 * si una jornada editable repite uno de sus cruces, la editable queda marcada.
 * Las jornadas extra admiten cruces ya jugados y las reposiciones representan
 * un traslado del partido original, no un encuentro adicional. El roster y las
 * definiciones de jornada son opcionales: sólo con ese contexto se validan
 * equipos ajenos, jornadas incompletas y descansos implícitos de torneos impares.
 */
export const validarFixture = (matches = [], config = null, criteria = null, options = {}) => {
    const activeCriteria = resolveFixtureCriteria(criteria);
    const conflictsByRound = new Map();
    const byRound = new Map();
    const repeatedMatchups = [];
    const repeatedByes = [];
    const invalidMatches = [];
    const incompleteRounds = [];
    const teamIds = [...new Set((options?.teams || [])
        .map((team) => normalizedTeamId(team?.id))
        .filter((teamId) => teamId !== null && teamId !== BYE_TEAM_ID))];
    const roster = teamIds.length > 0 ? new Set(teamIds) : null;
    const definitions = new Map((options?.roundDefinitions || []).map((round) => [
        String(round.roundIndex ?? round.index),
        round,
    ]));
    const invalidMatchSet = new Set();
    const implicitByes = [];
    const lockedRounds = new Set();
    let totalConflicts = 0;

    matches.forEach((match) => {
        const roundKey = String(match?.jornadaIndex);
        const roundMatches = byRound.get(roundKey) || [];
        roundMatches.push(match);
        byRound.set(roundKey, roundMatches);
    });

    definitions.forEach((definition, roundKey) => {
        if (!byRound.has(roundKey)) byRound.set(roundKey, []);
        if (definition.isLocked) lockedRounds.add(roundKey);
    });
    byRound.forEach((roundMatches, roundKey) => {
        if (roundMatches.some((match) => match?.roundLocked)) lockedRounds.add(roundKey);
    });
    const isNaturalRound = (roundKey, roundMatches) => {
        const type = definitions.get(roundKey)?.type ?? definitions.get(roundKey)?.roundType;
        return type !== "extra" && type !== "reposition" &&
            !roundMatches.some(allowsRepeatedMatchup);
    };
    const isHistory = (match) => lockedRounds.has(String(match?.jornadaIndex));

    byRound.forEach((roundMatches, roundKey) => {
        const isLocked = lockedRounds.has(roundKey);
        const naturalRound = isNaturalRound(roundKey, roundMatches);
        const participants = new Set();
        const duplicates = new Set();
        const byeMatches = [];

        roundMatches.forEach((match) => {
            const ids = [match?.local?.id, match?.visitante?.id].map(normalizedTeamId);
            const realIds = ids.filter((id) => id !== null && id !== BYE_TEAM_ID);
            const reason = ids.includes(null)
                ? "missing-team"
                : ids[0] === ids[1]
                    ? (ids[0] === BYE_TEAM_ID ? "bye-vs-bye" : "self-match")
                    : roster && realIds.some((id) => !roster.has(id))
                        ? "unknown-team"
                        : roster && naturalRound && activeCriteria.enforceRoundRobin &&
                            teamIds.length % 2 === 0 && ids.includes(BYE_TEAM_ID)
                            ? "unexpected-bye"
                            : null;

            if (reason) {
                invalidMatchSet.add(match);
                if (!isLocked && (activeCriteria.preventDuplicateTeams || activeCriteria.enforceRoundRobin)) {
                    invalidMatches.push({ matchId: match?.id, roundIndex: roundKey, teamIds: [...new Set(realIds)], reason });
                    const conflictTeamIds = realIds.length > 0
                        ? realIds
                        : [ids.includes(BYE_TEAM_ID) ? BYE_TEAM_ID : "__invalid__"];
                    addRoundConflict(conflictsByRound, roundKey, conflictTeamIds);
                    totalConflicts += 1;
                }
            }

            // Un autopartido ya tiene su propio diagnóstico; cuenta sólo una
            // aparición para no cobrar dos veces ese mismo error.
            new Set(realIds).forEach((teamId) => {
                if (participants.has(teamId)) duplicates.add(teamId);
                participants.add(teamId);
            });
            if (!reason && ids.includes(BYE_TEAM_ID)) byeMatches.push(match);
        });

        if (!isLocked && activeCriteria.preventDuplicateTeams && duplicates.size > 0) {
            addRoundConflict(conflictsByRound, roundKey, duplicates);
            totalConflicts += duplicates.size;
        }
        if (!isLocked && naturalRound && activeCriteria.enforceRoundRobin && byeMatches.length > 1) {
            addRoundConflict(conflictsByRound, roundKey, byeMatches.flatMap((match) =>
                [String(match.local.id), String(match.visitante.id)]));
            totalConflicts += 1;
        }

        if (!roster || !naturalRound) return;

        const missingTeamIds = teamIds.filter((teamId) => !participants.has(teamId));
        const isImplicitBye = teamIds.length % 2 === 1 && missingTeamIds.length === 1 &&
            byeMatches.length === 0 && roundMatches.length === Math.floor(teamIds.length / 2) &&
            duplicates.size === 0 && roundMatches.every((match) => !invalidMatchSet.has(match));

        // Los descansos no siempre tienen registro en BD: una fecha impar con
        // todos sus partidos jugables también consume el descanso del ausente.
        if (isImplicitBye && options?.inferImplicitByes !== false) {
            implicitByes.push({ teamId: missingTeamIds[0], roundIndex: roundKey, roundLocked: isLocked });
        }
        if (isLocked || !activeCriteria.requireCompleteRounds || isImplicitBye) return;

        const expectedSlots = Math.ceil(teamIds.length / 2);
        const actualSlots = roundMatches.length;
        const missingSlots = Math.max(0, expectedSlots - actualSlots);
        const extraSlots = Math.max(0, actualSlots - expectedSlots);
        const hasMissingParticipants = activeCriteria.preventDuplicateTeams && missingTeamIds.length > 0;
        if (!hasMissingParticipants && missingSlots === 0 && extraSlots === 0) return;

        incompleteRounds.push({ roundIndex: roundKey, missingTeamIds, expectedSlots, actualSlots, missingSlots, extraSlots });
        addRoundConflict(conflictsByRound, roundKey, missingTeamIds.length > 0 ? missingTeamIds : participants);
        totalConflicts += 1;
    });

    if (config !== null && activeCriteria.enforceRoundRobin) {
        const legCount = getLegCount(config);
        const matchesByPair = new Map();
        const byesByTeam = new Map();

        matches.forEach((match) => {
            if (invalidMatchSet.has(match) || allowsRepeatedMatchup(match) ||
                !isNaturalRound(String(match?.jornadaIndex), byRound.get(String(match?.jornadaIndex)) || [])) return;

            const teamIds = [String(match.local.id), String(match.visitante.id)].sort();
            if (teamIds.includes(BYE_TEAM_ID)) {
                const teamId = teamIds.find((id) => id !== BYE_TEAM_ID);
                const byes = byesByTeam.get(teamId) || [];
                byes.push({ teamId, roundIndex: String(match.jornadaIndex), roundLocked: isHistory(match) });
                byesByTeam.set(teamId, byes);
                return;
            }

            const pairKey = teamIds.join("::");
            const pairMatches = matchesByPair.get(pairKey) || [];
            pairMatches.push({ match, teamIds });
            matchesByPair.set(pairKey, pairMatches);
        });

        matchesByPair.forEach((pairMatches, pairKey) => {
            const directedCounts = pairMatches.reduce((counts, { match }) => {
                const directionKey = directedMatchupKey(match);
                counts.set(directionKey, (counts.get(directionKey) || 0) + 1);
                return counts;
            }, new Map());
            const exceedsPairLimit = pairMatches.length > legCount;
            const repeatsSameHomeAway =
                activeCriteria.enforceReturnLegHomeAway &&
                legCount === 2 &&
                [...directedCounts.values()].some((count) => count > 1);

            if (!exceedsPairLimit && !repeatsSameHomeAway) return;

            const editableOccurrences = pairMatches.filter(
                ({ match }) => !isHistory(match) && (exceedsPairLimit || directedCounts.get(directedMatchupKey(match)) > 1)
            );

            if (editableOccurrences.length === 0) return;

            editableOccurrences.forEach(({ match, teamIds }) => {
                addRoundConflict(conflictsByRound, match.jornadaIndex, teamIds);
            });

            repeatedMatchups.push({
                pairKey,
                teamIds: pairMatches[0].teamIds,
                roundIndexes: [
                    ...new Set(pairMatches.map(({ match }) => String(match.jornadaIndex))),
                ],
                exceedsPairLimit,
                repeatsSameHomeAway,
            });
            totalConflicts += 1;
        });

        implicitByes.forEach((bye) => {
            const byes = byesByTeam.get(bye.teamId) || [];
            byes.push(bye);
            byesByTeam.set(bye.teamId, byes);
        });
        byesByTeam.forEach((byes, teamId) => {
            if (byes.length <= legCount) return;
            const editableByes = byes.filter((bye) => !bye.roundLocked);
            if (editableByes.length === 0) return;
            editableByes.forEach((bye) => addRoundConflict(conflictsByRound, bye.roundIndex, [teamId]));
            repeatedByes.push({
                teamId,
                roundIndexes: [...new Set(byes.map((bye) => bye.roundIndex))]
                    .sort((first, second) => Number(first) - Number(second) || first.localeCompare(second)),
                exceedsByeLimit: true,
            });
            totalConflicts += 1;
        });
    }

    const conflicts = Object.fromEntries(
        [...conflictsByRound.entries()].map(([roundKey, teamIds]) => [
            roundKey,
            [...teamIds],
        ])
    );

    return { conflicts, totalConflicts, repeatedMatchups, repeatedByes, invalidMatches, incompleteRounds };
};
