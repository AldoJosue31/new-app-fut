import assert from "node:assert/strict";
import test from "node:test";
import {
    getTextRoundMatchStats,
    isTextRoundComplete,
    shouldBlockTextCompleteness,
} from "../src/utils/fixtureTextValidation.js";

const team = (id) => ({ id, name: String(id) });

test("un descanso no vuelve incompleta una jornada de número impar de equipos", () => {
    const pairs = [
        { local: team("A"), visitante: team("B") },
        { local: team("C"), visitante: team("BYE") },
    ];
    const stats = getTextRoundMatchStats(
        "A vs B,\nC vs DESCANSA",
        pairs,
    );

    assert.deepEqual(stats, { detected: 1, attempted: 1 });
    assert.equal(isTextRoundComplete({ ...stats, expected: 1 }), true);
});

test("un borrador de texto incompleto no bloquea la vista de tarjetas", () => {
    const invalidRoundIndexes = [6, 7, 8];

    assert.equal(
        shouldBlockTextCompleteness({
            viewMode: "cards",
            requireCompleteRounds: true,
            invalidRoundIndexes,
        }),
        false,
    );
    assert.equal(
        shouldBlockTextCompleteness({
            viewMode: "text",
            requireCompleteRounds: true,
            invalidRoundIndexes,
        }),
        true,
    );
});
