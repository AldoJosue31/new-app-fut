import { resolveScannedSchedule } from "./scannedScheduleUtils.js";

export const normalizeFixtureByeMatch = (match) => {
    const localId = match.local?.id;
    const visitanteId = match.visitante?.id;
    const isByeMatch = localId === "BYE" || visitanteId === "BYE";

    if (localId === "BYE" && visitanteId && visitanteId !== "BYE") {
        return {
            ...match,
            local: match.visitante,
            visitante: match.local,
            isByeMatch: true,
        };
    }

    return {
        ...match,
        isByeMatch,
    };
};

export const isFixtureMatchLocked = (match) =>
    Boolean(match?.locked || match?.scanLocked || match?.roundLocked);

// Pair identity, rather than the line number, keeps protected matches intact
// when text is reordered or an editable match is removed.
export const buildFixtureRoundMatchesFromPairs = (
    roundIndex,
    roundMatches = [],
    pairs = [],
    options = {},
) => {
    const pairKey = (match) => JSON.stringify([
        String(match.local?.id ?? ""),
        String(match.visitante?.id ?? ""),
    ]);
    const normalizedPairs = pairs.map(normalizeFixtureByeMatch);
    const protectedMatches = roundMatches.filter(isFixtureMatchLocked);
    const reserved = new Map();

    for (const match of protectedMatches) {
        const index = normalizedPairs.findIndex(
            (pair, pairIndex) => !reserved.has(pairIndex) && pairKey(pair) === pairKey(normalizeFixtureByeMatch(match)),
        );
        if (index === -1) {
            return {
                matches: roundMatches,
                deletedMatchIds: [],
                error: `No se puede cambiar ni eliminar ${match.local?.name || "Local"} vs ${match.visitante?.name || "Visitante"}: ${match.roundLocked ? "su jornada está confirmada" : match.scanLocked ? "es un partido escaneado bloqueado" : "el partido está bloqueado"}. Desbloquéalo antes de editarlo.`,
            };
        }
        reserved.set(index, match);
    }
    if (roundMatches.some((match) => match.roundLocked)) {
        return { matches: roundMatches, deletedMatchIds: [], error: "La jornada está confirmada y no se puede editar." };
    }

    const editable = roundMatches.filter((match) => !isFixtureMatchLocked(match));
    const used = new Set();
    normalizedPairs.forEach((pair, index) => {
        if (reserved.has(index)) return;
        const current = editable.find((match) => !used.has(match) && pairKey(match) === pairKey(pair));
        if (current) {
            reserved.set(index, current);
            used.add(current);
        }
    });
    const nextMatches = normalizedPairs.map((pair, index) => {
        const current = reserved.get(index) || editable.find((match) => !used.has(match));
        if (current) used.add(current);
        if (isFixtureMatchLocked(current)) return current;

        const lockMatches = Boolean(options.lockMatches);
        const schedule = resolveScannedSchedule(pair);
        const acceptedSchedule = Boolean(lockMatches && options.preserveDetectedSchedule && !pair.isByeMatch && schedule.complete);
        return {
            ...(current || {}),
            id: current?.id || `temp_text_${roundIndex}_${index + 1}_${pairKey(pair)}`,
            dbId: current?.dbId || null,
            local: pair.local,
            visitante: pair.visitante,
            jornadaIndex: Number(roundIndex),
            locked: lockMatches,
            scanLocked: lockMatches,
            roundLocked: false,
            isByeMatch: pair.isByeMatch,
            isGeneratedRound: current?.isGeneratedRound || roundMatches[0]?.isGeneratedRound || false,
            roundType: current?.roundType || roundMatches[0]?.roundType,
            roundName: current?.roundName || roundMatches[0]?.roundName || `Jornada ${Number(roundIndex) + 1}`,
            ...(lockMatches ? {
                date: acceptedSchedule ? schedule.date : null,
                time: acceptedSchedule ? schedule.time : null,
                scannedDate: acceptedSchedule ? schedule.date : "",
                scannedTime: acceptedSchedule ? schedule.time : "",
                scanScheduleAccepted: acceptedSchedule,
                scanScheduleAction: acceptedSchedule ? "apply" : null,
                scanScheduleSource: acceptedSchedule ? "rol-juego" : null,
            } : {}),
        };
    });
    return {
        matches: nextMatches,
        deletedMatchIds: editable.filter((match) => !used.has(match) && match.dbId).map((match) => match.dbId),
        error: null,
    };
};

