import assert from "node:assert/strict";
import test from "node:test";
import {
    autoCorregirFixture,
    restaurarFixtureRoundRobin,
    restaurarFixtureRoundRobinCompleto,
} from "../src/utils/fixtureAutoCorrection.js";
import { validarFixture } from "../src/utils/fixtureValidation.js";

const team = (id) => ({ id, name: `Equipo ${id}` });
const match = (id, localId, visitanteId, jornadaIndex, overrides = {}) => ({
    id,
    local: team(localId),
    visitante: team(visitanteId),
    jornadaIndex,
    locked: false,
    roundLocked: false,
    isByeMatch: false,
    ...overrides,
});

const pairKey = (fixtureMatch) =>
    [String(fixtureMatch.local.id), String(fixtureMatch.visitante.id)].sort().join("::");

const buildRoundRobinFixture = (teamIds, legs = 1) => {
    const rotatingTeams = teamIds.map(team);
    const firstLeg = [];

    for (let roundIndex = 0; roundIndex < rotatingTeams.length - 1; roundIndex += 1) {
        const round = [];
        for (let pairIndex = 0; pairIndex < rotatingTeams.length / 2; pairIndex += 1) {
            round.push([
                rotatingTeams[pairIndex],
                rotatingTeams[rotatingTeams.length - 1 - pairIndex],
            ]);
        }
        firstLeg.push(round);
        rotatingTeams.splice(1, 0, rotatingTeams.pop());
    }

    const rounds = legs === 2
        ? [
            ...firstLeg,
            ...firstLeg.map((round) =>
                round.map(([local, visitante]) => [visitante, local]),
            ),
        ]
        : firstLeg;

    return rounds.flatMap((round, roundIndex) =>
        round.map(([local, visitante], matchIndex) => ({
            id: `rr-${roundIndex}-${matchIndex}`,
            local,
            visitante,
            jornadaIndex: roundIndex,
            locked: false,
            roundLocked: false,
            isByeMatch: false,
        })),
    );
};

test("reacomoda rivales editables para conservar una jornada escaneada", () => {
    const scannedRound = [
        match("scan-1", "A", "B", 2, { locked: true, scanLocked: true }),
        match("scan-2", "C", "D", 2, { locked: true, scanLocked: true }),
    ];
    const initial = [
        match("r1-1", "A", "B", 0),
        match("r1-2", "C", "D", 0),
        match("r2-1", "A", "C", 1),
        match("r2-2", "B", "D", 1),
        ...scannedRound,
    ];

    const corrected = autoCorregirFixture(initial, 5000, { vueltas: "1" });
    const validation = validarFixture(corrected, { vueltas: "1" });

    assert.equal(validation.totalConflicts, 0);
    assert.deepEqual(
        corrected.filter((fixtureMatch) => fixtureMatch.scanLocked),
        scannedRound,
    );
    assert.equal(new Set(corrected.map(pairKey)).size, corrected.length);
});

test("resuelve varios cruces repetidos con reacomodos consecutivos", () => {
    const initial = [
        match("r1-1", "A", "F", 0),
        match("r1-2", "B", "E", 0),
        match("r1-3", "C", "D", 0),
        match("r2-1", "A", "E", 1),
        match("r2-2", "F", "D", 1),
        match("r2-3", "B", "C", 1),
        match("r3-1", "A", "D", 2),
        match("r3-2", "E", "C", 2),
        match("r3-3", "F", "B", 2),
        match("r4-1", "A", "C", 3),
        match("r4-2", "D", "B", 3),
        match("r4-3", "E", "F", 3),
        match("scan-1", "A", "F", 4, { locked: true, scanLocked: true }),
        match("scan-2", "B", "E", 4, { locked: true, scanLocked: true }),
        match("scan-3", "C", "D", 4, { locked: true, scanLocked: true }),
    ];

    const corrected = autoCorregirFixture(initial, 5000, { vueltas: "1" });

    assert.equal(validarFixture(corrected, { vueltas: "1" }).totalConflicts, 0);
    assert.equal(new Set(corrected.map(pairKey)).size, corrected.length);
});

test("reconstruye globalmente todas las jornadas alrededor de la escaneada", () => {
    const rawMatches = [
        ["0-0", "1", "10", 0], ["0-1", "2", "9", 0], ["0-2", "3", "8", 0],
        ["0-3", "4", "7", 0], ["0-4", "5", "6", 0], ["1-0", "1", "9", 1],
        ["1-1", "10", "8", 1], ["1-2", "2", "7", 1], ["1-3", "3", "6", 1],
        ["1-4", "4", "5", 1], ["2-0", "1", "8", 2], ["2-1", "9", "7", 2],
        ["2-2", "5", "6", 2], ["2-3", "2", "10", 2], ["2-4", "3", "4", 2],
        ["3-0", "1", "7", 3], ["3-1", "8", "6", 3], ["3-2", "9", "5", 3],
        ["3-3", "10", "4", 3], ["3-4", "2", "3", 3], ["4-0", "9", "8", 4],
        ["4-1", "7", "5", 4], ["4-2", "6", "4", 4], ["4-3", "1", "3", 4],
        ["4-4", "10", "2", 4], ["5-0", "1", "6", 5], ["5-1", "4", "9", 5],
        ["5-2", "7", "3", 5], ["5-3", "8", "2", 5], ["5-4", "5", "10", 5],
        ["6-0", "3", "4", 6], ["6-1", "9", "8", 6], ["6-2", "6", "5", 6],
        ["6-3", "7", "10", 6], ["6-4", "2", "1", 6], ["7-0", "1", "3", 7],
        ["7-1", "4", "2", 7], ["7-2", "5", "10", 7], ["7-3", "6", "9", 7],
        ["7-4", "7", "8", 7], ["8-0", "1", "2", 8], ["8-1", "3", "10", 8],
        ["8-2", "4", "6", 8], ["8-3", "5", "8", 8], ["8-4", "9", "7", 8],
    ];
    const initial = rawMatches.map(([id, localId, visitanteId, jornadaIndex]) =>
        match(id, localId, visitanteId, jornadaIndex, jornadaIndex === 3
            ? { locked: true, scanLocked: true }
            : (jornadaIndex === 0 ? { locked: true, roundLocked: true } : {})),
    );
    const scannedBefore = initial.filter(({ scanLocked }) => scanLocked);
    const confirmedBefore = initial.filter(({ roundLocked }) => roundLocked);

    assert.equal(validarFixture(initial, { vueltas: "1" }).totalConflicts, 9);

    const corrected = autoCorregirFixture(initial, 15000, { vueltas: "1" });

    assert.equal(validarFixture(corrected, { vueltas: "1" }).totalConflicts, 0);
    assert.deepEqual(corrected.filter(({ scanLocked }) => scanLocked), scannedBefore);
    assert.deepEqual(corrected.filter(({ roundLocked }) => roundLocked), confirmedBefore);
});

test("reacomoda tambien jornadas con equipo que descansa", () => {
    const bye = { id: "BYE", name: "DESCANSA", isBye: true };
    const byeMatch = (id, localId, jornadaIndex, overrides = {}) => ({
        ...match(id, localId, "BYE", jornadaIndex, overrides),
        visitante: bye,
        isByeMatch: true,
    });
    const initial = [
        match("r1-1", "A", "B", 0),
        match("r1-2", "C", "D", 0),
        byeMatch("r1-bye", "E", 0),
        match("r2-1", "A", "C", 1),
        match("r2-2", "B", "E", 1),
        byeMatch("r2-bye", "D", 1),
        match("scan-1", "A", "B", 2, { locked: true, scanLocked: true }),
        match("scan-2", "C", "D", 2, { locked: true, scanLocked: true }),
        byeMatch("scan-bye", "E", 2, { locked: true, scanLocked: true }),
    ];

    const corrected = autoCorregirFixture(initial, 15000, { vueltas: "1" });
    const roundZeroTeamIds = corrected
        .filter(({ jornadaIndex }) => jornadaIndex === 0)
        .flatMap(({ local, visitante }) => [String(local.id), String(visitante.id)]);

    assert.equal(validarFixture(corrected, { vueltas: "1" }).totalConflicts, 0);
    assert.equal(new Set(roundZeroTeamIds).size, roundZeroTeamIds.length);
    assert.equal(roundZeroTeamIds.filter((id) => id === "BYE").length, 1);
});

test("mantiene el conflicto cuando ambos cruces repetidos son inmutables", () => {
    const initial = [
        match("played", "A", "B", 0, { locked: true, roundLocked: true }),
        match("scanned", "B", "A", 1, { locked: true, scanLocked: true }),
    ];

    const corrected = autoCorregirFixture(initial, 5000, { vueltas: "1" });

    assert.deepEqual(corrected, initial);
    assert.equal(validarFixture(corrected, { vueltas: "1" }).totalConflicts, 1);
});

test("intercambia partidos entre jornadas para eliminar equipos duplicados", () => {
    const initial = [
        match("r1-1", "A", "B", 0),
        match("r1-2", "A", "C", 0),
        match("r2-1", "D", "C", 1),
        match("r2-2", "B", "D", 1),
    ];

    const corrected = autoCorregirFixture(initial, 5000, { vueltas: "1" });

    assert.equal(validarFixture(corrected, { vueltas: "1" }).totalConflicts, 0);
});

test("no modifica jornadas extra ni partidos bloqueados", () => {
    const extra = match("extra", "A", "B", 3, {
        roundType: "extra",
        locked: false,
    });
    const locked = match("locked", "A", "B", 0, {
        locked: true,
        scanLocked: true,
    });
    const initial = [
        locked,
        match("editable", "B", "A", 1),
        extra,
    ];

    const corrected = autoCorregirFixture(initial, 5000, { vueltas: "1" });

    assert.deepEqual(corrected.find(({ id }) => id === extra.id), extra);
    assert.deepEqual(corrected.find(({ id }) => id === locked.id), locked);
});

test("reconstruye conflictos complejos de ida y vuelta sin tocar una jornada escaneada", () => {
    const scannedRound = [
        match("scan-1", "A", "B", 0, { locked: true, scanLocked: true }),
        match("scan-2", "C", "D", 0, { locked: true, scanLocked: true }),
    ];
    const initial = [
        ...scannedRound,
        match("r2-1", "A", "D", 1),
        match("r2-2", "B", "C", 1),
        match("r3-1", "A", "C", 2),
        match("r3-2", "D", "B", 2),
        match("r4-1", "B", "A", 3),
        match("r4-2", "D", "C", 3),
        match("r5-1", "C", "A", 4),
        match("r5-2", "B", "D", 4),
        // Esta jornada repite la vuelta de la primera y deja dos cruces sin vuelta.
        match("r6-1", "B", "A", 5),
        match("r6-2", "D", "C", 5),
    ];

    assert.ok(validarFixture(initial, { vueltas: "2" }).totalConflicts > 0);

    const corrected = autoCorregirFixture(initial, 15000, { vueltas: "2" });
    const directedCounts = corrected.reduce((counts, fixtureMatch) => {
        const key = `${fixtureMatch.local.id}::${fixtureMatch.visitante.id}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
    }, new Map());

    assert.equal(validarFixture(corrected, { vueltas: "2" }).totalConflicts, 0);
    assert.deepEqual(corrected.filter(({ scanLocked }) => scanLocked), scannedRound);
    assert.ok([...directedCounts.values()].every((count) => count === 1));
});

test("usa jornadas editables coherentes para reconstruir una ida y vuelta con bloqueos parciales", () => {
    const initial = buildRoundRobinFixture(
        ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
        2,
    );
    const lockedIndexes = new Set([4, 8, 21, 22, 51, 55, 57, 66, 67, 83]);
    const swaps = [
        [81, "local", 85, "local"],
        [32, "visitante", 1, "visitante"],
        [39, "visitante", 43, "local"],
        [0, "visitante", 32, "local"],
        [27, "local", 19, "visitante"],
        [44, "visitante", 54, "visitante"],
        [42, "visitante", 27, "visitante"],
        [56, "visitante", 40, "local"],
    ];

    initial.forEach((fixtureMatch, index) => {
        if (!lockedIndexes.has(index)) return;
        fixtureMatch.locked = true;
        fixtureMatch.scanLocked = true;
    });
    swaps.forEach(([firstIndex, firstSide, secondIndex, secondSide]) => {
        [initial[firstIndex][firstSide], initial[secondIndex][secondSide]] = [
            initial[secondIndex][secondSide],
            initial[firstIndex][firstSide],
        ];
    });

    const immutableBefore = initial.filter(({ locked }) => locked);
    assert.ok(validarFixture(initial, { vueltas: "2" }).totalConflicts > 0);

    const corrected = autoCorregirFixture(initial, 15000, { vueltas: "2" });
    const directedCounts = corrected.reduce((counts, fixtureMatch) => {
        const key = `${fixtureMatch.local.id}::${fixtureMatch.visitante.id}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
    }, new Map());

    assert.equal(validarFixture(corrected, { vueltas: "2" }).totalConflicts, 0);
    assert.deepEqual(corrected.filter(({ locked }) => locked), immutableBefore);
    assert.equal(directedCounts.size, corrected.length);
    assert.ok([...directedCounts.values()].every((count) => count === 1));
});

test("no fuerza reglas de round robin desactivadas en una jornada personalizada", () => {
    const initial = [
        match("m1", "A", "B", 0),
        match("m2", "A", "B", 0),
    ];
    const criteria = {
        preventDuplicateTeams: false,
        enforceRoundRobin: false,
    };

    const corrected = autoCorregirFixture(initial, 5000, { vueltas: "1" }, criteria);

    assert.deepEqual(corrected, initial);
    assert.equal(validarFixture(corrected, { vueltas: "1" }, criteria).totalConflicts, 0);
});

test("restaurar regenera las jornadas no confirmadas y elimina bloqueos temporales", () => {
    const confirmedRound = [
        match("confirmed-1", "A", "B", 0, { locked: true, roundLocked: true }),
        match("confirmed-2", "C", "D", 0, { locked: true, roundLocked: true }),
    ];
    const initial = [
        ...confirmedRound,
        match("future-1", "A", "C", 1, {
            locked: true,
            scanLocked: true,
            scanScheduleAccepted: true,
            scanScheduleAction: "apply",
        }),
        match("future-2", "B", "D", 1, { locked: true, scanLocked: true }),
        match("future-3", "A", "C", 2, { locked: true, scanLocked: true }),
        match("future-4", "B", "D", 2, { locked: true, scanLocked: true }),
    ];

    const restored = restaurarFixtureRoundRobin(initial, 15000, { vueltas: "1" });
    const futureMatches = restored.filter(({ roundLocked }) => !roundLocked);

    assert.equal(validarFixture(restored, { vueltas: "1" }).totalConflicts, 0);
    assert.deepEqual(
        restored.filter(({ roundLocked }) => roundLocked),
        confirmedRound,
    );
    assert.ok(futureMatches.every(({ locked, scanLocked }) => !locked && !scanLocked));
    assert.ok(futureMatches.every(({ scanScheduleAccepted, scanScheduleAction }) =>
        !scanScheduleAccepted && scanScheduleAction === null,
    ));
});

test("restaurar reconstruye jornadas con partidos faltantes y sobrantes", () => {
    const teams = ["A", "B", "C", "D"].map(team);
    const jornadas = [
        { id: "j1", name: "Jornada 1", status: "Confirmada" },
        { id: "j2", name: "Jornada 2", status: "Pendiente" },
        { id: "j3", name: "Jornada 3", status: "Pendiente" },
    ];
    const matches = [
        { id: "confirmed-1", jornada_id: "j1", team1_id: "A", team2_id: "B" },
        { id: "confirmed-2", jornada_id: "j1", team1_id: "C", team2_id: "D" },
        { id: "future-1", jornada_id: "j2", team1_id: "A", team2_id: "C" },
        { id: "future-2", jornada_id: "j2", team1_id: "B", team2_id: "D" },
        { id: "future-extra", jornada_id: "j2", team1_id: "A", team2_id: "D" },
        { id: "future-3", jornada_id: "j3", team1_id: "A", team2_id: "D" },
    ];

    const restored = restaurarFixtureRoundRobinCompleto({
        teams,
        config: { vueltas: "1" },
        existingData: { jornadas, matches },
    });
    const matchesByRound = restored.matches.reduce((acc, fixtureMatch) => {
        const roundMatches = acc.get(fixtureMatch.jornadaIndex) || [];
        roundMatches.push(fixtureMatch);
        acc.set(fixtureMatch.jornadaIndex, roundMatches);
        return acc;
    }, new Map());

    assert.equal(restored.error, null);
    assert.equal(validarFixture(restored.matches, { vueltas: "1" }).totalConflicts, 0);
    assert.deepEqual(restored.deletedMatchIds, ["future-extra"]);
    assert.equal(matchesByRound.get(0).length, 2);
    assert.equal(matchesByRound.get(1).length, 2);
    assert.equal(matchesByRound.get(2).length, 2);
    assert.ok(matchesByRound.get(2).some((fixtureMatch) => fixtureMatch.dbId === null));
    assert.ok(
        restored.matches
            .filter(({ roundLocked }) => !roundLocked)
            .every(({ locked, scanLocked }) => !locked && !scanLocked),
    );
});

test("restaurar no bloquea la correccion futura por una jornada confirmada incompleta", () => {
    const teams = ["A", "B", "C", "D"].map(team);
    const jornadas = [
        { id: "j1", name: "Jornada 1", status: "Confirmada" },
        { id: "j2", name: "Jornada 2", status: "Pendiente" },
        { id: "j3", name: "Jornada 3", status: "Pendiente" },
    ];
    const matches = [
        { id: "confirmed-1", jornada_id: "j1", team1_id: "A", team2_id: "B" },
        { id: "future-1", jornada_id: "j2", team1_id: "A", team2_id: "C" },
        { id: "future-2", jornada_id: "j2", team1_id: "B", team2_id: "D" },
        { id: "future-3", jornada_id: "j3", team1_id: "A", team2_id: "D" },
        { id: "future-4", jornada_id: "j3", team1_id: "B", team2_id: "C" },
    ];

    const restored = restaurarFixtureRoundRobinCompleto({
        teams,
        config: { vueltas: "1" },
        existingData: { jornadas, matches },
    });

    assert.equal(restored.error, null);
    assert.equal(validarFixture(restored.matches, { vueltas: "1" }).totalConflicts, 0);
    assert.equal(restored.matches.filter(({ roundLocked }) => roundLocked).length, 1);
    assert.equal(restored.matches.filter(({ jornadaIndex }) => jornadaIndex === 1).length, 2);
    assert.equal(restored.matches.filter(({ jornadaIndex }) => jornadaIndex === 2).length, 2);
});
