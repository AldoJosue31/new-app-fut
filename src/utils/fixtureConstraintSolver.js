import { resolveFixtureCriteria } from "./fixtureValidation.js";

const BYE = "BYE";
const isNatural = (match) => match?.roundType !== "extra" && match?.roundType !== "reposition";
const teamId = (team) => {
    const id = team?.id;
    if (typeof id === "number") return Number.isFinite(id) ? String(id) : null;
    return typeof id === "string" && id.trim() ? id : null;
};
const unsuccessful = (exhausted = false) => ({ matches: null, exhausted, impossible: !exhausted });

/**
 * Completa los slots naturales existentes mediante búsqueda por restricciones.
 * Las jornadas son conjuntos de slots equivalentes: elegir primero el rival de
 * un equipo obligado evita explorar todas las permutaciones del mismo resultado.
 * La orientación se decide después, pues no cambia la viabilidad de los pares.
 * Nunca altera los identificadores, el orden ni los metadatos de los partidos.
 */
export const solveFixtureConstraints = (
    matches = [],
    config = null,
    criteria = null,
    { teams = [], maxNodes = 150000 } = {},
) => {
    const rules = resolveFixtureCriteria(criteria);
    const roundRobin = rules.enforceRoundRobin && config !== null;
    const uniqueTeams = rules.preventDuplicateTeams;
    const legs = String(config?.vueltas ?? "1") === "2" ? 2 : 1;
    const opposite = roundRobin && legs === 2 && rules.enforceReturnLegHomeAway;
    if (!roundRobin && !uniqueTeams && !rules.requireCompleteRounds) {
        return { matches: matches.slice(), exhausted: false, impossible: false };
    }

    const teamMap = new Map();
    const sourceTeams = teams.length > 0
        ? teams
        : matches.filter(isNatural).flatMap((match) => [match.local, match.visitante]);
    sourceTeams.forEach((team) => {
        const id = teamId(team);
        if (id !== null && id !== BYE && !teamMap.has(id)) teamMap.set(id, team);
    });
    const roster = [...teamMap.values()];
    const ids = roster.map(teamId);
    const numberOfTeams = roster.length;
    const odd = numberOfTeams % 2 === 1;
    const byeIndex = numberOfTeams;
    const indexById = new Map(ids.map((id, index) => [id, index]));
    indexById.set(BYE, byeIndex);
    const byeTeam = matches.flatMap((match) => [match.local, match.visitante])
        .find((team) => teamId(team) === BYE)
        || { id: BYE, name: "DESCANSA", img: null, isBye: true };
    const allTeams = [...roster, byeTeam];
    const roundMap = new Map();
    matches.forEach((match, index) => {
        const key = String(match.jornadaIndex);
        if (!roundMap.has(key)) {
            roundMap.set(key, {
                indexes: [], slots: [], fixed: [], confirmed: false,
                used: new Uint32Array(numberOfTeams), byes: 0, playable: 0,
                chosen: [], naturalCount: 0,
            });
        }
        const round = roundMap.get(key);
        round.indexes.push(index);
        round.confirmed ||= Boolean(match.roundLocked);
        if (isNatural(match)) round.naturalCount += 1;
    });
    const rounds = [...roundMap.values()];
    rounds.forEach((round) => {
        round.indexes.forEach((index) => {
            const match = matches[index];
            const fixed = round.confirmed || !isNatural(match) || match.locked || match.scanLocked;
            (fixed ? round.fixed : round.slots).push(index);
        });
    });

    const edges = [];
    const edgeByEndpoints = new Map();
    const endpointKey = (a, b) => a <= b ? `${a}:${b}` : `${b}:${a}`;
    for (let a = 0; a < numberOfTeams; a += 1) {
        for (let b = a + (uniqueTeams || roundRobin ? 1 : 0); b < numberOfTeams; b += 1) {
            const edge = { a, b, bye: false, index: edges.length, used: 0, directions: [0, 0] };
            edges.push(edge);
            edgeByEndpoints.set(endpointKey(a, b), edge);
        }
        if (odd) {
            const edge = { a, b: byeIndex, bye: true, index: edges.length, used: 0, directions: [0, 0] };
            edges.push(edge);
            edgeByEndpoints.set(endpointKey(a, byeIndex), edge);
        }
    }
    const edgeForMatch = (match) => {
        const a = indexById.get(teamId(match.local));
        const b = indexById.get(teamId(match.visitante));
        return edgeByEndpoints.get(endpointKey(a, b));
    };
    const implicitByeEdge = (round) => {
        if (!roundRobin || !odd || round.byes !== 0 ||
            round.indexes.length !== Math.floor(numberOfTeams / 2) ||
            round.naturalCount !== round.indexes.length ||
            !round.used.every((count) => count <= 1) ||
            round.used.reduce((sum, count) => sum + count, 0) !== numberOfTeams - 1) return null;
        return edgeByEndpoints.get(endpointKey(round.used.findIndex((count) => count === 0), byeIndex));
    };

    // El historial confirmado consume los cupos, pero no exige corregir errores
    // históricos que el validador excluye. Todo otro bloqueo debe ser compatible.
    const fixedOrder = rounds.slice().sort((a, b) => Number(b.confirmed) - Number(a.confirmed));
    for (const round of fixedOrder) {
        const seenIds = new Set();
        for (const index of round.fixed) {
            const match = matches[index];
            const localId = teamId(match.local);
            const awayId = teamId(match.visitante);
            for (const id of [localId, awayId]) {
                if (id === null || id === BYE) continue;
                if (uniqueTeams && !round.confirmed && seenIds.has(id)) return unsuccessful();
                seenIds.add(id);
                const rosterIndex = indexById.get(id);
                if (rosterIndex !== undefined) round.used[rosterIndex] += 1;
            }
            if (!isNatural(match)) continue;
            const isBye = localId === BYE || awayId === BYE;
            if (isBye) round.byes += 1;
            else if (localId !== null && awayId !== null) round.playable += 1;
            const edge = edgeForMatch(match);
            if (!round.confirmed && (roundRobin || uniqueTeams) && !edge) return unsuccessful();
            if (!edge || !roundRobin) continue;
            const direction = indexById.get(localId) === edge.a ? 0 : 1;
            if (!round.confirmed && (
                edge.used >= legs
                || (edge.bye && round.byes > 1)
                || (!edge.bye && opposite && edge.directions[direction] > 0)
            )) return unsuccessful();
            edge.used += 1;
            if (!edge.bye) edge.directions[direction] += 1;
        }
        // Los partidos guardados pueden omitir el registro de descanso. Una
        // jornada fija con todos sus encuentros jugables también consume ese BYE.
        const implicit = round.slots.length === 0 ? implicitByeEdge(round) : null;
        if (implicit) {
            if (!round.confirmed && implicit.used >= legs) return unsuccessful();
            implicit.used += 1;
        }
    }

    const activeRounds = rounds.filter((round) => round.naturalCount > 0 && !round.confirmed);
    const requiredPlayable = rules.requireCompleteRounds ? Math.floor(numberOfTeams / 2) : 0;
    for (const round of activeRounds) {
        if (round.playable + round.slots.length < requiredPlayable) return unsuccessful();
    }
    const variableRounds = activeRounds.filter((round) => round.slots.length > 0);
    const totalSlots = variableRounds.reduce((sum, round) => sum + round.slots.length, 0);
    if (totalSlots === 0) return { matches: matches.slice(), exhausted: false, impossible: false };
    if (edges.length === 0) return unsuccessful();

    for (const round of variableRounds) {
        round.originalEdges = new Map();
        round.slots.forEach((index) => {
            const edge = edgeForMatch(matches[index]);
            if (edge) round.originalEdges.set(edge.index, (round.originalEdges.get(edge.index) || 0) + 1);
        });
    }

    let nodes = 0;
    let exhausted = false;
    const nodeLimit = Number.isFinite(maxNodes) ? Math.max(0, Math.floor(maxNodes)) : 150000;
    const remainingCapacity = (edge) => roundRobin ? Math.max(0, legs - edge.used) : totalSlots;

    const search = (remaining) => {
        if (remaining === 0) return true;
        if (nodes >= nodeLimit) {
            exhausted = true;
            return false;
        }
        nodes += 1;
        let chosenRound = null;
        let chosenCandidates = null;
        const teamDemand = new Uint32Array(numberOfTeams);
        const edgeSupport = new Uint32Array(edges.length);

        for (const round of variableRounds) {
            const left = round.slots.length - round.chosen.length;
            if (left === 0) continue;
            const needPlayable = Math.max(0, requiredPlayable - round.playable);
            if (needPlayable > left) return false;
            const permitBye = odd && needPlayable < left && (!roundRobin || round.byes === 0);
            let availableReal = 0;
            for (let team = 0; team < numberOfTeams; team += 1) {
                if (round.used[team] === 0) availableReal += 1;
            }
            const availableByes = permitBye ? (roundRobin ? 1 : left) : 0;
            if (uniqueTeams && availableReal + availableByes < left * 2) return false;
            const mustCoverAll = uniqueTeams && availableByes <= 1
                && availableReal + availableByes === left * 2;
            const degrees = new Uint32Array(numberOfTeams + 1);
            let capacity = 0;
            const candidates = [];
            for (const edge of edges) {
                const edgeCapacity = remainingCapacity(edge);
                if (edgeCapacity === 0 || (edge.bye && !permitBye)) continue;
                if (uniqueTeams && (round.used[edge.a] > 0 || (!edge.bye && round.used[edge.b] > 0))) continue;
                candidates.push(edge);
                degrees[edge.a] += 1;
                degrees[edge.b] += 1;
                capacity += uniqueTeams ? 1 : edgeCapacity;
                edgeSupport[edge.index] += 1;
            }
            if (capacity < left || candidates.length === 0) return false;
            let domain = candidates;
            if (mustCoverAll) {
                let pivot = -1;
                for (let team = 0; team <= numberOfTeams; team += 1) {
                    if (team === byeIndex ? !permitBye : round.used[team] > 0) continue;
                    if (degrees[team] === 0) return false;
                    if (team < numberOfTeams) teamDemand[team] += 1;
                    if (pivot < 0 || degrees[team] < degrees[pivot]) pivot = team;
                }
                domain = candidates.filter((edge) => edge.a === pivot || edge.b === pivot);
            }
            if (!chosenCandidates || domain.length < chosenCandidates.length) {
                chosenRound = round;
                chosenCandidates = domain;
            }
        }

        if (roundRobin) {
            let capacity = 0;
            const availableByTeam = new Uint32Array(numberOfTeams);
            for (const edge of edges) {
                if (edgeSupport[edge.index] === 0) continue;
                const available = Math.min(remainingCapacity(edge), uniqueTeams ? edgeSupport[edge.index] : remaining);
                capacity += available;
                availableByTeam[edge.a] += available;
                if (!edge.bye) availableByTeam[edge.b] += available;
            }
            if (capacity < remaining) return false;
            for (let team = 0; team < numberOfTeams; team += 1) {
                if (availableByTeam[team] < teamDemand[team]) return false;
            }
        }

        const round = chosenRound;
        const originalScore = (edge) => (round.originalEdges.get(edge.index) || 0)
            - round.chosen.filter((selected) => selected.index === edge.index).length;
        chosenCandidates.sort((a, b) =>
            Number(originalScore(b) > 0) - Number(originalScore(a) > 0)
            || edgeSupport[a.index] - edgeSupport[b.index]
            || a.index - b.index,
        );
        for (const edge of chosenCandidates) {
            round.chosen.push(edge);
            round.used[edge.a] += 1;
            if (edge.bye) round.byes += 1;
            else {
                round.used[edge.b] += 1;
                round.playable += 1;
            }
            edge.used += 1;
            const implicit = round.chosen.length === round.slots.length ? implicitByeEdge(round) : null;
            const byeAvailable = !implicit || implicit.used < legs;
            if (implicit) implicit.used += 1;
            if (byeAvailable && search(remaining - 1)) return true;
            if (implicit) implicit.used -= 1;
            edge.used -= 1;
            round.chosen.pop();
            round.used[edge.a] -= 1;
            if (edge.bye) round.byes -= 1;
            else {
                round.used[edge.b] -= 1;
                round.playable -= 1;
            }
            if (exhausted) return false;
        }
        return false;
    };

    if (!search(totalSlots)) return unsuccessful(exhausted);

    const result = matches.slice();
    const slotsByEdge = new Map();
    const attach = (index, edge) => {
        if (!slotsByEdge.has(edge.index)) slotsByEdge.set(edge.index, []);
        slotsByEdge.get(edge.index).push(index);
    };
    for (const round of variableRounds) {
        const pendingEdges = round.chosen.slice();
        const pendingSlots = [];
        // Conserva primero los cruces originales; el resto ocupa los slots libres.
        for (const index of round.slots) {
            const original = edgeForMatch(matches[index]);
            const found = pendingEdges.findIndex((edge) => edge === original);
            if (found < 0) pendingSlots.push(index);
            else attach(index, pendingEdges.splice(found, 1)[0]);
        }
        pendingSlots.forEach((index) => {
            const original = matches[index];
            let best = 0;
            let bestCost = Infinity;
            pendingEdges.forEach((edge, edgeIndex) => {
                const edgeIds = [teamId(allTeams[edge.a]), teamId(allTeams[edge.b])];
                const cost = Number(!edgeIds.includes(teamId(original.local)))
                    + Number(!edgeIds.includes(teamId(original.visitante)));
                if (cost < bestCost) {
                    best = edgeIndex;
                    bestCost = cost;
                }
            });
            attach(index, pendingEdges.splice(best, 1)[0]);
        });
    }
    const directionCost = (index, edge, direction) => {
        const [a, b] = direction === 0 ? [edge.a, edge.b] : [edge.b, edge.a];
        return Number(teamId(matches[index].local) !== teamId(allTeams[a]))
            + Number(teamId(matches[index].visitante) !== teamId(allTeams[b]));
    };
    const write = (index, edge, direction) => {
        const original = matches[index];
        const [a, b] = direction === 0 ? [edge.a, edge.b] : [edge.b, edge.a];
        result[index] = {
            ...original,
            local: teamId(original.local) === teamId(allTeams[a]) ? original.local : allTeams[a],
            visitante: teamId(original.visitante) === teamId(allTeams[b]) ? original.visitante : allTeams[b],
            isByeMatch: edge.bye,
        };
    };
    for (const [edgeIndex, indexes] of slotsByEdge) {
        const edge = edges[edgeIndex];
        if (edge.bye) {
            indexes.forEach((index) => write(index, edge, 0));
        } else if (opposite && indexes.length === 2) {
            const directCost = directionCost(indexes[0], edge, 0) + directionCost(indexes[1], edge, 1);
            const reverseCost = directionCost(indexes[0], edge, 1) + directionCost(indexes[1], edge, 0);
            const firstDirection = reverseCost < directCost ? 1 : 0;
            write(indexes[0], edge, firstDirection);
            write(indexes[1], edge, 1 - firstDirection);
        } else {
            indexes.forEach((index) => {
                const preferred = directionCost(index, edge, 1) < directionCost(index, edge, 0) ? 1 : 0;
                const direction = opposite && edge.directions[preferred] > 0 ? 1 - preferred : preferred;
                write(index, edge, direction);
            });
        }
    }
    return { matches: result, exhausted: false, impossible: false };
};
