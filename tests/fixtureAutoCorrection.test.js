import assert from "node:assert/strict";
import test from "node:test";
import { autoCorregirFixture } from "../src/utils/fixtureAutoCorrection.js";
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
