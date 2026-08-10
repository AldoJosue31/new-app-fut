import assert from "node:assert/strict";
import test from "node:test";
import {
    resolveFixtureCriteria,
    serializeFixtureCriteria,
    validarFixture,
} from "../src/utils/fixtureValidation.js";

const team = (id) => ({ id, name: `Equipo ${id}` });
const match = (id, localId, visitanteId, jornadaIndex, overrides = {}) => ({
    id,
    local: team(localId),
    visitante: team(visitanteId),
    jornadaIndex,
    locked: false,
    roundLocked: false,
    ...overrides,
});

test("bloquea un cruce repetido entre jornadas en modalidad de solo ida", () => {
    const result = validarFixture(
        [
            match("m1", 1, 2, 0),
            match("m2", 2, 1, 3, { locked: true, scanLocked: true }),
        ],
        { vueltas: "1" },
    );

    assert.deepEqual(result.conflicts[0], ["1", "2"]);
    assert.deepEqual(result.conflicts[3], ["1", "2"]);
    assert.equal(result.repeatedMatchups.length, 1);
});

test("una jornada escaneada se valida contra una jornada confirmada", () => {
    const result = validarFixture(
        [
            match("played", "a", "b", 0, { locked: true, roundLocked: true }),
            match("scanned", "b", "a", 4, { locked: true, scanLocked: true }),
        ],
        { vueltas: "1" },
    );

    assert.equal(result.conflicts[0], undefined);
    assert.deepEqual(result.conflicts[4], ["a", "b"]);
});

test("permite repetir el cruce cuando la nueva jornada es extra", () => {
    const result = validarFixture(
        [
            match("m1", 1, 2, 0),
            match("extra", 2, 1, 5, { roundType: "extra" }),
        ],
        { vueltas: "1" },
    );

    assert.deepEqual(result.conflicts, {});
    assert.equal(result.repeatedMatchups.length, 0);
});

test("permite ida y vuelta cuando el torneo tiene dos vueltas", () => {
    const result = validarFixture(
        [match("ida", 1, 2, 0), match("vuelta", 2, 1, 4)],
        { vueltas: "2" },
    );

    assert.deepEqual(result.conflicts, {});
});

test("bloquea una ida y vuelta repetida con la misma localia", () => {
    const result = validarFixture(
        [match("ida", 1, 2, 0), match("vuelta-invalida", 1, 2, 4)],
        { vueltas: "2" },
    );

    assert.deepEqual(result.conflicts[0], ["1", "2"]);
    assert.deepEqual(result.conflicts[4], ["1", "2"]);
    assert.equal(result.repeatedMatchups.length, 1);
    assert.equal(result.repeatedMatchups[0].repeatsSameHomeAway, true);
});

test("permite conservar la misma localia cuando ese criterio se desactiva", () => {
    const result = validarFixture(
        [match("ida", 1, 2, 0), match("vuelta-personalizada", 1, 2, 4)],
        { vueltas: "2" },
        { enforceReturnLegHomeAway: false },
    );

    assert.deepEqual(result.conflicts, {});
    assert.equal(result.repeatedMatchups.length, 0);
});

test("el modo libre no marca equipos repetidos ni cruces fuera del formato", () => {
    const result = validarFixture(
        [match("m1", 1, 2, 0), match("m2", 1, 2, 0)],
        { vueltas: "1" },
        {
            preventDuplicateTeams: false,
            enforceRoundRobin: false,
        },
    );

    assert.deepEqual(result.conflicts, {});
});

test("serializa criterios persistidos sin campos ajenos y respeta dependencias", () => {
    const criteria = serializeFixtureCriteria({
        preventDuplicateTeams: false,
        enforceRoundRobin: false,
        requireCompleteRounds: false,
        unexpectedValue: true,
    });

    assert.deepEqual(criteria, {
        version: 1,
        preventDuplicateTeams: false,
        enforceRoundRobin: false,
        enforceReturnLegHomeAway: false,
        requireCompleteRounds: false,
    });
    assert.deepEqual(resolveFixtureCriteria(criteria), {
        preventDuplicateTeams: false,
        enforceRoundRobin: false,
        enforceReturnLegHomeAway: false,
        requireCompleteRounds: false,
    });
});

test("conserva la validacion de equipos repetidos dentro de una jornada", () => {
    const result = validarFixture(
        [match("m1", 1, 2, 0), match("m2", 1, 3, 0)],
        { vueltas: "1" },
    );

    assert.deepEqual(result.conflicts[0], ["1"]);
});
