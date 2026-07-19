const BYE_TEAM_ID = "BYE";

const addRoundConflict = (conflictsByRound, roundIndex, teamIds) => {
    const roundKey = String(roundIndex);
    const roundConflicts = conflictsByRound.get(roundKey) || new Set();

    teamIds.forEach((teamId) => roundConflicts.add(teamId));
    conflictsByRound.set(roundKey, roundConflicts);
};

const isNonPlayableMatch = (match) => {
    const localId = match?.local?.id;
    const visitanteId = match?.visitante?.id;

    return (
        localId === undefined ||
        localId === null ||
        visitanteId === undefined ||
        visitanteId === null ||
        String(localId) === BYE_TEAM_ID ||
        String(visitanteId) === BYE_TEAM_ID
    );
};

const allowsRepeatedMatchup = (match) =>
    match?.roundType === "extra" || match?.roundType === "reposition";

/**
 * Valida equipos repetidos dentro de una jornada y, en torneos de solo ida,
 * cruces repetidos entre jornadas naturales.
 *
 * Las jornadas confirmadas no se pueden corregir, pero sirven como historial:
 * si una jornada editable repite uno de sus cruces, la editable queda marcada.
 * Las jornadas extra admiten cruces ya jugados y las reposiciones representan
 * un traslado del partido original, no un encuentro adicional.
 */
export const validarFixture = (matches = [], config = null) => {
    const conflictsByRound = new Map();
    const byRound = new Map();
    const repeatedMatchups = [];
    let totalConflicts = 0;

    matches.forEach((match) => {
        const roundKey = String(match?.jornadaIndex);
        const roundMatches = byRound.get(roundKey) || [];
        roundMatches.push(match);
        byRound.set(roundKey, roundMatches);
    });

    byRound.forEach((roundMatches, roundKey) => {
        const isRoundLocked = roundMatches.some((match) => match?.roundLocked);
        if (isRoundLocked) return;

        const teamsInRound = new Set();
        const duplicates = new Set();

        roundMatches.forEach((match) => {
            [match?.local?.id, match?.visitante?.id].forEach((rawTeamId) => {
                if (rawTeamId === undefined || rawTeamId === null) return;

                const teamId = String(rawTeamId);
                if (teamId === BYE_TEAM_ID) return;

                if (teamsInRound.has(teamId)) duplicates.add(teamId);
                teamsInRound.add(teamId);
            });
        });

        if (duplicates.size > 0) {
            addRoundConflict(conflictsByRound, roundKey, duplicates);
            totalConflicts += duplicates.size;
        }
    });

    const isSingleLeg = config !== null && String(config?.vueltas ?? "1") === "1";

    if (isSingleLeg) {
        const matchesByPair = new Map();

        matches.forEach((match) => {
            if (isNonPlayableMatch(match) || allowsRepeatedMatchup(match)) return;

            const teamIds = [String(match.local.id), String(match.visitante.id)].sort();
            if (teamIds[0] === teamIds[1]) return;

            const pairKey = teamIds.join("::");
            const pairMatches = matchesByPair.get(pairKey) || [];
            pairMatches.push({ match, teamIds });
            matchesByPair.set(pairKey, pairMatches);
        });

        matchesByPair.forEach((pairMatches, pairKey) => {
            const distinctRounds = new Set(
                pairMatches.map(({ match }) => String(match.jornadaIndex))
            );

            if (distinctRounds.size < 2) return;

            const editableOccurrences = pairMatches.filter(
                ({ match }) => !match.roundLocked
            );

            if (editableOccurrences.length === 0) return;

            editableOccurrences.forEach(({ match, teamIds }) => {
                addRoundConflict(conflictsByRound, match.jornadaIndex, teamIds);
            });

            repeatedMatchups.push({
                pairKey,
                teamIds: pairMatches[0].teamIds,
                roundIndexes: [...distinctRounds],
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

    return { conflicts, totalConflicts, repeatedMatchups };
};
