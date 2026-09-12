import assert from "node:assert/strict";
import test from "node:test";
import { corregirFixtureConDiagnostico } from "../src/utils/fixtureAutoCorrection.js";
import { validarFixture } from "../src/utils/fixtureValidation.js";

const team = (id) => ({ id, name: `Equipo ${id}` });
const teams = ["A", "B", "C", "D"].map(team);
const match = (id, local, visitante, jornadaIndex, flags = {}) => ({
    id, dbId: id, local: team(local), visitante: team(visitante), jornadaIndex,
    roundName: `Jornada ${jornadaIndex + 1}`, locked: false, roundLocked: false,
    isByeMatch: local === "BYE" || visitante === "BYE", ...flags,
});
const config = { vueltas: "1" };
const correct = (matches, criteria = null, options = { teams }) =>
    corregirFixtureConDiagnostico(matches, 3000, config, criteria, options);

test("conserva un fixture válido, orden de registros y entrada sin mutaciones", () => {
    const initial = [match("cd", "C", "D", 0), match("ab", "A", "B", 0)];
    const before = structuredClone(initial);
    const result = correct(initial);
    assert.equal(result.status, "resolved");
    assert.deepEqual(result.matches, before);
    assert.deepEqual(initial, before);
    assert.deepEqual(result.deletedMatchIds, []);
});

test("corrige autopartidos y recupera un equipo ausente usando el roster", () => {
    const initial = [match("aa", "A", "A", 0), match("cd", "C", "D", 0)];
    const result = correct(initial);
    assert.equal(result.status, "resolved");
    assert.equal(validarFixture(result.matches, config, null, { teams }).totalConflicts, 0);
    assert.deepEqual(new Set(result.matches.flatMap((m) => [m.local.id, m.visitante.id])), new Set(["A", "B", "C", "D"]));
});

test("sustituye rivales de un calendario parcial conservando un bloqueo de escaneo independiente", () => {
    const scanned = match("scan", "A", "B", 0, { scanLocked: true, date: "2026-09-20", time: "18:00" });
    const initial = [scanned, match("repeat", "B", "A", 1)];
    const result = correct(initial, { requireCompleteRounds: false });
    assert.equal(result.status, "resolved");
    assert.deepEqual(result.matches.find((m) => m.id === scanned.id), scanned);
    assert.equal(result.matches.length, initial.length);
    assert.equal(validarFixture(result.matches, config).totalConflicts, 0);
});

test("corrige equipos ajenos al torneo sin modificar IDs ni metadatos del registro", () => {
    const initial = [match("unknown", "X", "B", 0, { originalJornadaId: "j1" }), match("cd", "C", "D", 0)];
    const result = correct(initial);
    assert.equal(result.status, "resolved");
    assert.equal(result.matches.find((m) => m.id === "unknown").originalJornadaId, "j1");
    assert.deepEqual(new Set(result.matches.map((m) => m.dbId)), new Set(initial.map((m) => m.dbId)));
    assert.equal(result.matches.some((m) => m.local.id === "X" || m.visitante.id === "X"), false);
});

test("completa jornadas vacías declaradas sin inventar fechas adicionales", () => {
    const roundDefinitions = [0, 2, 5].map((roundIndex) => ({ roundIndex: String(roundIndex), title: `Fecha ${roundIndex}`, isLocked: false }));
    const result = correct([], null, { teams, roundDefinitions });
    assert.equal(result.status, "resolved");
    assert.equal(result.matches.length, 6);
    assert.deepEqual(new Set(result.matches.map((m) => m.jornadaIndex)), new Set([0, 2, 5]));
    assert.equal(new Set(result.matches.map((m) => m.id)).size, 6);
    assert.ok(result.matches.every((m) => m.dbId === null && m.roundName === `Fecha ${m.jornadaIndex}`));
});

test("retira sólo sobrantes editables y conserva los partidos bloqueados", () => {
    const fixed = match("fixed", "B", "D", 1, { locked: true });
    const initial = [
        match("ab", "A", "B", 0), match("cd", "C", "D", 0),
        match("ac", "A", "C", 1), fixed, match("extra", "A", "D", 1),
    ];
    const result = correct(initial);
    assert.equal(result.status, "resolved");
    assert.equal(result.matches.length, 4);
    assert.deepEqual(result.deletedMatchIds, ["extra"]);
    assert.deepEqual(result.matches.find((m) => m.id === "fixed"), fixed);
});

test("conserva toda una jornada confirmada aunque sólo un registro tenga roundLocked", () => {
    const confirmed = [match("ab", "A", "B", 0, { roundLocked: true }), match("cd", "C", "D", 0)];
    const result = correct([...confirmed, match("ba", "B", "A", 1), match("dc", "D", "C", 1)]);
    assert.equal(result.status, "resolved");
    assert.deepEqual(result.matches.filter((m) => m.jornadaIndex === 0), confirmed);
});

test("identifica cruces bloqueados incompatibles y no los altera", () => {
    const initial = [match("played", "A", "B", 0, { roundLocked: true }), match("scan", "B", "A", 1, { scanLocked: true })];
    const result = correct(initial, { requireCompleteRounds: false });
    assert.equal(result.status, "blocked");
    assert.equal(result.remainingConflicts, 1);
    assert.deepEqual(result.matches, initial);
    assert.deepEqual(new Set(result.blockingMatches.map((m) => m.id)), new Set(["played", "scan"]));
    assert.match(result.message, /Jornada 2/);
});

test("reporta un equipo inválido bloqueado indicando el partido", () => {
    const locked = match("unknown", "X", "B", 0, { locked: true });
    const result = correct([locked, match("cd", "C", "D", 0)]);
    assert.equal(result.status, "blocked");
    assert.ok(result.blockingMatches.some((m) => m.id === locked.id));
    assert.deepEqual(result.matches.find((m) => m.id === locked.id), locked);
});

test("no culpa a bloqueos inexistentes cuando faltan rivales para la cantidad de partidos", () => {
    const initial = [match("ab", "A", "B", 0), match("ba", "B", "A", 1)];
    const result = correct(initial, null, { teams: teams.slice(0, 2) });
    assert.equal(result.status, "incomplete");
    assert.deepEqual(result.blockingMatches, []);
    assert.ok(result.remainingConflicts > 0);
    assert.doesNotMatch(result.message, /sin modificar partidos bloqueados/);
});

test("no impone round robin ni completitud cuando esos criterios están desactivados", () => {
    const initial = [match("one", "A", "B", 1), match("two", "A", "B", 0)];
    const result = correct(initial, { preventDuplicateTeams: false, enforceRoundRobin: false, requireCompleteRounds: false });
    assert.equal(result.status, "resolved");
    assert.deepEqual(result.matches, initial);
});

test("reparte los descansos de un torneo impar sin repetir equipo", () => {
    const oddTeams = teams.slice(0, 3);
    const initial = [
        match("ab", "A", "B", 0), match("c-bye", "C", "BYE", 0, { scanLocked: true }),
        match("ac", "A", "C", 1), match("b-bye", "B", "BYE", 1),
        match("ab2", "A", "B", 2), match("c-bye2", "C", "BYE", 2),
    ];
    const result = correct(initial, null, { teams: oddTeams });
    assert.equal(result.status, "resolved");
    assert.deepEqual(new Set(result.matches.filter((m) => m.isByeMatch).map((m) => m.local.id)), new Set(["A", "B", "C"]));
    assert.deepEqual(result.matches.find((m) => m.id === "c-bye"), initial[1]);
});

test("respeta el descanso implícito de una jornada confirmada al corregir jornadas futuras", () => {
    const roster = [...teams, team("E")];
    const confirmed = [match("ab", "A", "B", 0, { roundLocked: true }), match("cd", "C", "D", 0, { roundLocked: true })];
    const result = correct([...confirmed, match("ac", "A", "C", 1), match("bd", "B", "D", 1), match("e-bye", "E", "BYE", 1)], null, { teams: roster });
    assert.equal(result.status, "resolved");
    assert.deepEqual(result.matches.filter((m) => m.jornadaIndex === 0), confirmed);
    assert.equal(validarFixture(result.matches, config, null, { teams: roster }).totalConflicts, 0);
    assert.equal(result.matches.some((m) => m.isByeMatch && m.local.id === "E"), false);
});

test("no interpreta un subconjunto bloqueado como una jornada completa con descanso implícito", () => {
    const roster = [...teams, team("E")];
    const initial = [
        match("ab", "A", "B", 0, { locked: true }), match("cd", "C", "D", 0, { locked: true }),
        match("ae", "A", "E", 0), match("ab2", "A", "B", 1), match("bye", "E", "BYE", 1, { locked: true }),
    ];
    const result = correct(initial, { preventDuplicateTeams: false, requireCompleteRounds: false }, { teams: roster });
    assert.equal(result.status, "resolved");
});

test("conserva extras indicadas por definición aunque el registro omita roundType", () => {
    const extra = match("extra", "A", "B", 0);
    const result = correct([extra, match("aa", "A", "A", 1), match("cd", "C", "D", 1)], null, {
        teams,
        roundDefinitions: [{ roundIndex: "0", roundType: "extra" }, { roundIndex: "1", roundType: "official" }],
    });
    assert.equal(result.status, "resolved");
    assert.deepEqual(result.matches.find((m) => m.id === extra.id), extra);
});

test("corrige descansos implícitos repetidos sin exigir jornadas completas", () => {
    const roster = [...teams, team("E")];
    const confirmed = [match("ab", "A", "B", 0, { roundLocked: true }), match("cd", "C", "D", 0, { roundLocked: true })];
    const result = correct([...confirmed, match("ac", "A", "C", 1), match("bd", "B", "D", 1)], { requireCompleteRounds: false }, { teams: roster });
    assert.equal(result.status, "resolved");
    assert.equal(result.matches.length, 4);
    assert.equal(validarFixture(result.matches, config, null, { teams: roster }).totalConflicts, 0);
});
