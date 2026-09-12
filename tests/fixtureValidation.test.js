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

test("round robin detecta autopartidos aun sin el criterio de equipos repetidos", () => {
    const result = validarFixture(
        [match("self", 1, "1", 0), match("double-bye", "BYE", "BYE", 1)],
        { vueltas: "1" },
        { preventDuplicateTeams: false },
    );

    assert.equal(result.totalConflicts, 2);
    assert.deepEqual(result.invalidMatches.map(({ reason }) => reason), ["self-match", "bye-vs-bye"]);
    assert.deepEqual(result.conflicts[0], ["1"]);
    assert.deepEqual(result.conflicts[1], ["BYE"]);
});

test("los partidos sin participantes conservan un marcador visible de conflicto", () => {
    const result = validarFixture([match("empty", null, undefined, 0)], { vueltas: "1" });

    assert.deepEqual(result.conflicts[0], ["__invalid__"]);
    assert.equal(result.totalConflicts, 1);
});

test("no interpreta equipos ausentes o IDs invalidos como descansos", () => {
    const result = validarFixture(
        [
            match("missing", "A", null, 0),
            match("empty", "B", " ", 1),
            match("invalid", "C", NaN, 2),
            match("zero", 0, "D", 3),
        ],
        { vueltas: "1" },
        { preventDuplicateTeams: false },
    );

    assert.equal(result.totalConflicts, 3);
    assert.deepEqual(result.invalidMatches.map(({ matchId }) => matchId), ["missing", "empty", "invalid"]);
    assert.equal(result.conflicts[3], undefined);
});

test("rechaza equipos fuera del roster y descansos en torneos pares", () => {
    const result = validarFixture(
        [match("unknown", "A", "OUT", 0), match("bye", "B", "BYE", 0)],
        { vueltas: "1" },
        { requireCompleteRounds: false },
        { teams: ["A", "B", "C", "D"].map(team) },
    );

    assert.deepEqual(result.invalidMatches.map(({ reason }) => reason), ["unknown-team", "unexpected-bye"]);
    assert.equal(result.totalConflicts, 2);
});

test("los descansos consumen una aparicion por vuelta sin exigir localia", () => {
    const byes = [match("bye-1", "A", "BYE", 0), match("bye-2", "A", "BYE", 1)];
    const singleLeg = validarFixture(byes, { vueltas: "1" });
    const returnLeg = validarFixture(byes, { vueltas: "2" });
    const thirdBye = validarFixture([...byes, match("bye-3", "BYE", "A", 2)], { vueltas: "2" });

    assert.equal(singleLeg.totalConflicts, 1);
    assert.deepEqual(singleLeg.repeatedByes, [{ teamId: "A", roundIndexes: ["0", "1"], exceedsByeLimit: true }]);
    assert.equal(returnLeg.totalConflicts, 0);
    assert.equal(thirdBye.totalConflicts, 1);
    assert.deepEqual(thirdBye.conflicts[2], ["A"]);
});

test("marca varios descansos en una jornada natural pero permite extras y reposiciones", () => {
    const result = validarFixture([
        match("bye-a", "A", "BYE", 0),
        match("bye-b", "B", "BYE", 0),
        match("extra", "A", "BYE", 1, { roundType: "extra" }),
        match("reposition", "A", "BYE", 2, { roundType: "reposition" }),
    ], { vueltas: "1" });

    assert.equal(result.totalConflicts, 1);
    assert.deepEqual(new Set(result.conflicts[0]), new Set(["A", "B", "BYE"]));
    assert.equal(result.repeatedByes.length, 0);
    assert.equal(result.conflicts[1], undefined);
    assert.equal(result.conflicts[2], undefined);
});

test("un descanso confirmado cuenta como historial contra uno editable", () => {
    const result = validarFixture([
        match("played", "A", "BYE", 0, { roundLocked: true, locked: true }),
        match("scanned", "A", "BYE", 1, { scanLocked: true, locked: true }),
    ], { vueltas: "1" });

    assert.equal(result.conflicts[0], undefined);
    assert.deepEqual(result.conflicts[1], ["A"]);
    assert.equal(result.totalConflicts, 1);
});

test("combina el exceso de cruces con la localia repetida en dos vueltas", () => {
    const result = validarFixture([
        match("ida-1", "A", "B", 0),
        match("ida-2", "A", "B", 1),
        match("vuelta", "B", "A", 2),
    ], { vueltas: "2" });

    // El tercer partido sí excede el límite global: las tres jornadas deben
    // señalarse aunque sólo dos repitan la dirección.
    assert.deepEqual(Object.keys(result.conflicts), ["0", "1", "2"]);
    assert.equal(result.repeatedMatchups[0].exceedsPairLimit, true);
    assert.equal(result.repeatedMatchups[0].repeatsSameHomeAway, true);
});

test("respeta por separado los limites de cruces y los equipos por jornada", () => {
    const fixture = [match("m1", "A", "B", 0), match("m2", "A", "C", 0)];
    assert.equal(validarFixture(fixture, { vueltas: "1" }, { preventDuplicateTeams: false }).totalConflicts, 0);
    assert.equal(validarFixture(fixture, { vueltas: "1" }, { enforceRoundRobin: false }).totalConflicts, 1);
    assert.equal(validarFixture([
        match("b1", "A", "BYE", 0), match("b2", "A", "BYE", 1),
    ], { vueltas: "1" }, { enforceRoundRobin: false }).totalConflicts, 0);
});

test("con roster exige todos los equipos y registros de cada jornada natural editable", () => {
    const options = {
        teams: ["A", "B", "C", "D"].map(team),
        roundDefinitions: [{ index: 0 }, { index: 1 }, { index: 2, isLocked: true }],
    };
    const result = validarFixture([match("r1", "A", "B", 0)], { vueltas: "1" }, null, options);

    assert.equal(result.totalConflicts, 2);
    assert.deepEqual(result.incompleteRounds, [
        { roundIndex: "0", missingTeamIds: ["C", "D"], expectedSlots: 2, actualSlots: 1, missingSlots: 1, extraSlots: 0 },
        { roundIndex: "1", missingTeamIds: ["A", "B", "C", "D"], expectedSlots: 2, actualSlots: 0, missingSlots: 2, extraSlots: 0 },
    ]);
    assert.equal(result.conflicts[2], undefined);
});

test("no infiere un roster ni obliga a generar jornadas que no existen", () => {
    const fixture = [match("partial", "A", "B", 3)];
    assert.equal(validarFixture(fixture, { vueltas: "1" }).totalConflicts, 0);
    assert.equal(validarFixture(fixture, { vueltas: "1" }, null, { teams: ["A", "B"].map(team) }).totalConflicts, 0);
    assert.equal(validarFixture(fixture, { vueltas: "1" }, { requireCompleteRounds: false }, {
        teams: ["A", "B", "C", "D"].map(team),
        roundDefinitions: [{ roundIndex: "0" }],
    }).totalConflicts, 0);
});

test("detecta registros sobrantes aun si los otros criterios se desactivan", () => {
    const result = validarFixture([
        match("r1", "A", "B", 0),
        match("r2", "C", "D", 0),
        match("extra-slot", "A", "C", 0),
    ], { vueltas: "1" }, { enforceRoundRobin: false, preventDuplicateTeams: false }, {
        teams: ["A", "B", "C", "D"].map(team),
    });

    assert.equal(result.totalConflicts, 1);
    assert.deepEqual(result.incompleteRounds[0], {
        roundIndex: "0", missingTeamIds: [], expectedSlots: 2, actualSlots: 3, missingSlots: 0, extraSlots: 1,
    });
});

test("jornadas completas no exige participantes unicos si ese criterio esta desactivado", () => {
    const result = validarFixture([
        match("r1", "A", "B", 0), match("r2", "A", "C", 0),
    ], { vueltas: "1" }, { preventDuplicateTeams: false }, {
        teams: ["A", "B", "C", "D"].map(team),
    });

    assert.equal(result.totalConflicts, 0);
    assert.deepEqual(result.incompleteRounds, []);
});

test("tolera un descanso implicito y lo cuenta para validar round robin", () => {
    const result = validarFixture([
        match("played", "A", "B", 0, { locked: true, roundLocked: true }),
        match("future", "A", "C", 1),
        match("bye-b", "B", "BYE", 1),
        match("last", "A", "B", 2, { roundType: "extra" }),
        match("bye-c", "C", "BYE", 3),
    ], { vueltas: "1" }, { requireCompleteRounds: false }, {
        teams: ["A", "B", "C"].map(team),
    });

    assert.equal(result.totalConflicts, 1);
    assert.deepEqual(result.repeatedByes, [{ teamId: "C", roundIndexes: ["0", "3"], exceedsByeLimit: true }]);
    assert.equal(result.conflicts[0], undefined);
    assert.deepEqual(result.conflicts[3], ["C"]);
});

test("una jornada impar completa admite descanso explicito o implicito", () => {
    const options = { teams: ["A", "B", "C"].map(team) };
    const implicit = validarFixture([match("r1", "A", "B", 0)], { vueltas: "1" }, null, options);
    const explicit = validarFixture([
        match("r1", "A", "B", 0), match("bye", "C", "BYE", 0),
    ], { vueltas: "1" }, null, options);

    assert.equal(implicit.totalConflicts, 0);
    assert.equal(explicit.totalConflicts, 0);
});

test("las definiciones respetan extras, reposiciones y jornadas confirmadas vacias", () => {
    const result = validarFixture([
        match("confirmed", "A", "B", 0),
        match("extra", "A", "B", 1),
        match("reposition", "A", "B", 2),
    ], { vueltas: "1" }, null, {
        teams: ["A", "B", "C", "D"].map(team),
        roundDefinitions: [
            { roundIndex: "0", isLocked: true },
            { roundIndex: "1", roundType: "extra" },
            { roundIndex: "2", type: "reposition" },
            { roundIndex: "3", isLocked: true },
        ],
    });

    assert.equal(result.totalConflicts, 0);
});

test("el historial confirmado invalido no se marca como editable", () => {
    const result = validarFixture([
        match("self", "A", "A", 0, { roundLocked: true }),
        match("same-round", "A", "B", 0),
        match("future", "A", "C", 1),
    ], { vueltas: "1" });

    assert.equal(result.totalConflicts, 0);
    assert.equal(result.invalidMatches.length, 0);
});
