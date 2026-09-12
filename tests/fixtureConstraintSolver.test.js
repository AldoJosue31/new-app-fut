import assert from "node:assert/strict";
import test from "node:test";
import { solveFixtureConstraints } from "../src/utils/fixtureConstraintSolver.js";
import { validarFixture } from "../src/utils/fixtureValidation.js";

const team = (id) => ({ id, name: `Equipo ${id}` });
const match = (id, home, away, round, extra = {}) => ({
    id, local: team(home), visitante: team(away), jornadaIndex: round,
    isByeMatch: home === "BYE" || away === "BYE", ...extra,
});
const roster = (count) => Array.from({ length: count }, (_, index) => team(index + 1));
const complete = (count, legs = 1) => {
    const rotating = roster(count);
    if (count % 2) rotating.push(team("BYE"));
    const first = [];
    for (let round = 0; round < rotating.length - 1; round += 1) {
        for (let index = 0; index < rotating.length / 2; index += 1) {
            first.push(match(`${round}-${index}`, rotating[index].id, rotating[rotating.length - 1 - index].id, round));
        }
        rotating.splice(1, 0, rotating.pop());
    }
    return legs === 1 ? first : [...first, ...first.map((entry) => ({
        ...entry, id: `return-${entry.id}`, local: entry.visitante, visitante: entry.local,
        jornadaIndex: entry.jornadaIndex + rotating.length - 1,
    }))];
};
const verify = (result, initial, config = { vueltas: "1" }, criteria = null) => {
    assert.ok(result.matches);
    assert.equal(result.exhausted, false);
    assert.equal(result.impossible, false);
    assert.equal(result.matches.length, initial.length);
    assert.equal(validarFixture(result.matches, config, criteria).totalConflicts, 0);
    const confirmed = new Set(initial.filter((entry) => entry.roundLocked).map((entry) => entry.jornadaIndex));
    result.matches.forEach((entry, index) => {
        assert.equal(entry.id, initial[index].id);
        assert.equal(entry.jornadaIndex, initial[index].jornadaIndex);
        if (initial[index].locked || initial[index].scanLocked || confirmed.has(entry.jornadaIndex)
            || initial[index].roundType === "extra" || initial[index].roundType === "reposition") {
            assert.deepEqual(entry, initial[index]);
        }
    });
};

test("encuentra un calendario general con varios bloqueos en jornadas diferentes", () => {
    // La factorización por XOR ofrece cruces de referencia independientes del círculo.
    const initial = [];
    for (let round = 1; round < 8; round += 1) {
        for (let home = 0; home < 8; home += 1) {
            const away = home ^ round;
            if (home > away) continue;
            const locked = home === 0 || (round % 2 === 0 && home === 2);
            initial.push(match(`${round}-${home}`, locked ? home + 1 : 1, locked ? away + 1 : 2, round,
                { scanLocked: locked, horario: "18:30", cancha: 4, roundName: `Jornada ${round}` }));
        }
    }
    const original = structuredClone(initial);
    const result = solveFixtureConstraints(initial, { vueltas: "1" }, null, { teams: roster(8) });
    verify(result, initial);
    assert.deepEqual(initial, original);
    result.matches.forEach((entry) => {
        assert.equal(entry.horario, "18:30");
        assert.equal(entry.cancha, 4);
        assert.equal(entry.roundName, `Jornada ${entry.jornadaIndex}`);
    });
});

test("corrige ida y vuelta e invierte localías alrededor de bloqueos", () => {
    const initial = complete(6, 2).map((entry, index) => index < 3
        ? { ...entry, roundLocked: index === 0 }
        : { ...entry, local: team(1), visitante: team(2) });
    const result = solveFixtureConstraints(initial, { vueltas: "2" }, null, { teams: roster(6) });
    verify(result, initial, { vueltas: "2" });
    const pairs = new Map();
    result.matches.forEach((entry) => {
        const key = [entry.local.id, entry.visitante.id].sort().join(":");
        const previous = pairs.get(key);
        if (previous) assert.equal(previous.local.id, entry.visitante.id);
        else pairs.set(key, entry);
    });
});

test("distribuye un descanso por equipo y jornada con equipos impares", () => {
    const initial = complete(5).map((entry, index) => index < 3
        ? { ...entry, locked: true }
        : { ...entry, local: team(1), visitante: team(2), isByeMatch: false });
    const result = solveFixtureConstraints(initial, { vueltas: "1" }, null, { teams: roster(5) });
    verify(result, initial);
    const byes = result.matches.filter((entry) => entry.isByeMatch);
    assert.equal(byes.length, 5);
    assert.equal(new Set(byes.map((entry) => entry.local.id === "BYE" ? entry.visitante.id : entry.local.id)).size, 5);
    assert.equal(new Set(byes.map((entry) => entry.jornadaIndex)).size, 5);
});

test("acepta jornadas parciales e incluye equipos ausentes cuando se proporciona roster", () => {
    const initial = [match("locked", 1, 2, 0, { locked: true }), match("repair", 1, 2, 1)];
    const rules = { requireCompleteRounds: false };
    const result = solveFixtureConstraints(initial, { vueltas: "1" }, rules, { teams: roster(5) });
    verify(result, initial, { vueltas: "1" }, rules);
    assert.ok(result.matches[1].local.id !== 1 || result.matches[1].visitante.id !== 2);
});

test("mantiene un descanso implícito en jornadas impares sin añadir slots", () => {
    const initial = [match("one", 1, 2, 0), match("two", 1, 2, 0)];
    const result = solveFixtureConstraints(initial, { vueltas: "1" }, null, { teams: roster(5) });
    verify(result, initial);
    assert.equal(result.matches.filter((entry) => entry.isByeMatch).length, 0);
});

test("no impone equipos únicos cuando el criterio está desactivado", () => {
    const initial = [match("one", 1, 2, 0), match("two", 1, 3, 0), match("three", 2, 3, 0)];
    const rules = { preventDuplicateTeams: false, requireCompleteRounds: false };
    const result = solveFixtureConstraints(initial, { vueltas: "1" }, rules);
    verify(result, initial, { vueltas: "1" }, rules);
    assert.deepEqual(result.matches, initial);
});

test("permite repetir cruces si round robin está desactivado", () => {
    const initial = [match("one", 1, 2, 0), match("two", 1, 2, 1)];
    const rules = { enforceRoundRobin: false };
    const result = solveFixtureConstraints(initial, { vueltas: "1" }, rules);
    verify(result, initial, { vueltas: "1" }, rules);
    assert.deepEqual(result.matches, initial);
});

test("mantiene localías iguales si no se exige invertir la vuelta", () => {
    const initial = [match("one", 1, 2, 0), match("two", 1, 2, 1)];
    const rules = { enforceReturnLegHomeAway: false };
    const result = solveFixtureConstraints(initial, { vueltas: "2" }, rules);
    verify(result, initial, { vueltas: "2" }, rules);
    assert.deepEqual(result.matches, initial);
});

test("detecta bloqueos incompatibles y preserva extras y reposiciones", () => {
    const blocked = [match("one", 1, 2, 0, { locked: true }), match("two", 2, 1, 1, { scanLocked: true })];
    assert.deepEqual(solveFixtureConstraints(blocked, { vueltas: "1" }), {
        matches: null, exhausted: false, impossible: true,
    });
    const initial = [match("one", 1, 2, 0), match("two", 1, 2, 1, { roundType: "extra" }),
        match("three", 1, 2, 2, { roundType: "reposition" })];
    verify(solveFixtureConstraints(initial, { vueltas: "1" }), initial);
});

test("tolera historial confirmado incompleto y repetido sin contaminar lo editable", () => {
    const initial = [match("old-one", 1, 2, 0, { roundLocked: true }),
        match("old-two", 1, 2, 1, { roundLocked: true }),
        match("new-one", 1, 2, 2), match("new-two", 1, 2, 2)];
    const result = solveFixtureConstraints(initial, { vueltas: "1" }, null, { teams: roster(4) });
    verify(result, initial);
});

test("distingue el límite de búsqueda de una imposibilidad demostrada", () => {
    const initial = complete(4);
    assert.deepEqual(solveFixtureConstraints(initial, { vueltas: "1" }, null, { maxNodes: 0 }), {
        matches: null, exhausted: true, impossible: false,
    });
});

test("ofrece el mismo resultado determinista en llamadas repetidas", () => {
    const initial = complete(6).map((entry) => ({ ...entry, local: team(1), visitante: team(2) }));
    const options = { teams: roster(6) };
    const first = solveFixtureConstraints(initial, { vueltas: "1" }, null, options);
    verify(first, initial);
    assert.deepEqual(solveFixtureConstraints(initial, { vueltas: "1" }, null, options), first);
});
