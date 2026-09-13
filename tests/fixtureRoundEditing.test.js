import assert from "node:assert/strict";
import test from "node:test";
import { buildFixtureRoundMatchesFromPairs } from "../src/utils/fixtureRoundEditing.js";

const team = (id) => ({ id, name: id });
const pair = (local, visitante) => ({ local: team(local), visitante: team(visitante) });
const match = (id, local, visitante, overrides = {}) => ({
    ...pair(local, visitante),
    id,
    dbId: `db-${id}`,
    jornadaIndex: 2,
    roundName: "Jornada 3",
    locked: false,
    ...overrides,
});

test("reordenar texto conserva exactamente los partidos bloqueados y sus horarios", () => {
    const scanned = Object.freeze(match("scan", "A", "B", {
        scanLocked: true,
        date: "2026-09-11",
        time: "19:30",
        scanScheduleAccepted: true,
        originalJornadaId: 77,
    }));
    const manual = Object.freeze(match("manual", "C", "D", { locked: true }));
    const editable = match("editable", "E", "F");
    const result = buildFixtureRoundMatchesFromPairs(2, [scanned, manual, editable], [
        pair("F", "E"), pair("C", "D"), pair("A", "B"),
    ]);

    assert.equal(result.error, null);
    assert.equal(result.matches[1], manual);
    assert.equal(result.matches[2], scanned);
    assert.equal(result.matches[0].dbId, editable.dbId);
    assert.deepEqual(result.deletedMatchIds, []);
});

test("cambiar, invertir o eliminar un cruce bloqueado rechaza todo el reemplazo", () => {
    for (const lock of [{ locked: true }, { scanLocked: true }, { roundLocked: true }]) {
        const original = [match("protected", "A", "B", lock), match("free", "C", "D")];
        for (const pairs of [[], [pair("B", "A"), pair("C", "D")], [pair("A", "C"), pair("B", "D")]]) {
            const result = buildFixtureRoundMatchesFromPairs(2, original, pairs);
            assert.match(result.error, /No se puede cambiar ni eliminar A vs B/);
            assert.equal(result.matches, original);
            assert.deepEqual(result.deletedMatchIds, []);
        }
    }
});

test("una jornada confirmada no admite cruces nuevos", () => {
    const original = [match("confirmed", "A", "B", { roundLocked: true })];
    const result = buildFixtureRoundMatchesFromPairs(2, original, [pair("A", "B"), pair("C", "D")]);
    assert.match(result.error, /confirmada/);
    assert.equal(result.matches, original);
});

test("quitar una línea libre registra sólo su dbId y conserva identidades al reordenar", () => {
    const removed = match("removed", "A", "B");
    const retained = match("retained", "C", "D");
    const protectedMatch = match("protected", "E", "F", { scanLocked: true });
    const result = buildFixtureRoundMatchesFromPairs(2, [removed, retained, protectedMatch], [
        pair("E", "F"), pair("C", "D"),
    ]);
    assert.equal(result.error, null);
    assert.equal(result.matches[0], protectedMatch);
    assert.equal(result.matches[1].dbId, retained.dbId);
    assert.deepEqual(result.deletedMatchIds, [removed.dbId]);
});

test("no asigna a una línea cambiada el id de otro cruce que aún existe", () => {
    const original = [match("first", "A", "B"), match("second", "C", "D")];
    const result = buildFixtureRoundMatchesFromPairs(2, original, [pair("E", "F"), pair("A", "B")]);
    assert.deepEqual(result.matches.map((entry) => entry.id), ["second", "first"]);
    assert.deepEqual(result.deletedMatchIds, []);
});

test("un descanso bloqueado conserva su orientación y todos sus metadatos", () => {
    const bye = Object.freeze(match("bye", "BYE", "A", { scanLocked: true }));
    const result = buildFixtureRoundMatchesFromPairs(2, [bye], [pair("BYE", "A")]);
    assert.equal(result.error, null);
    assert.equal(result.matches[0], bye);
});

test("el escaneo bloquea cruces nuevos y aplica horarios únicamente a partidos jugables", () => {
    const result = buildFixtureRoundMatchesFromPairs(2, [], [
        { ...pair("A", "B"), date: "2026-09-11", time: "19:30" },
        { ...pair("C", "BYE"), date: "2026-09-11", time: "20:30" },
    ], { lockMatches: true, preserveDetectedSchedule: true });
    assert.equal(result.error, null);
    assert.equal(result.matches[0].scanScheduleAccepted, true);
    assert.equal(result.matches[0].date, "2026-09-11");
    assert.equal(result.matches[0].time, "19:30");
    assert.equal(result.matches[1].scanScheduleAccepted, false);
    assert.equal(result.matches[1].date, null);
    assert.equal(result.matches.every((entry) => entry.locked && entry.scanLocked), true);
});
