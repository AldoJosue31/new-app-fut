import test from "node:test";
import assert from "node:assert/strict";
import {
  getCedulaScoreDiscrepancies,
  getScannedPlayerScoreTotals,
  reconcileRostersToScores,
  resolveCedulaScores,
} from "../src/utils/cedulaScoreResolution.js";

test("cuenta goles y autogoles para el equipo beneficiado", () => {
  const totals = getScannedPlayerScoreTotals([
    { side: "local", goals: 3, ownGoals: 1 },
    { side: "visit", goals: 2, ownGoals: 2 },
  ]);
  assert.deepEqual(totals, { local: 5, visit: 3 });
});

test("detecta diferencias por equipo y permite elegir su origen", () => {
  const scores = { local: 9, visit: 1 };
  const players = [
    { side: "local", goals: 3, matched: { id: 1 } },
    { side: "visit", goals: 1, matched: { id: 2 } },
  ];
  assert.deepEqual(getCedulaScoreDiscrepancies(scores, players), [
    { side: "local", teamScore: 9, playerScore: 3, difference: 6 },
  ]);
  assert.deepEqual(resolveCedulaScores(scores, players, { local: "team" }), { local: 9, visit: 1 });
  assert.deepEqual(resolveCedulaScores(scores, players, { local: "players" }), { local: 3, visit: 1 });
});

test("no solicita resolución si el equipo no tiene jugadores coincidentes", () => {
  const scores = { local: 9, visit: 1 };
  const players = [
    { side: "local", goals: 3, matched: null },
    { side: "visit", goals: 1, matched: { id: 2 } },
  ];
  assert.deepEqual(getCedulaScoreDiscrepancies(scores, players), []);
  assert.deepEqual(resolveCedulaScores(scores, players, {}), { local: 9, visit: 1 });

  const result = reconcileRostersToScores([], [{ playerId: 2, goals: 1 }], scores);
  assert.deepEqual(result.unassignedGoals, { local: 9, visit: 0 });
});

test("detecta un autogol para el equipo beneficiado aunque el jugador sea rival", () => {
  const discrepancies = getCedulaScoreDiscrepancies(
    { local: 0, visit: 0 },
    [{ side: "local", goals: 0, ownGoals: 1, matched: { id: 1 } }],
  );

  assert.deepEqual(discrepancies, [
    { side: "visit", teamScore: 0, playerScore: 1, difference: 1 },
  ]);
});

test("los goles de filas no vinculadas no se ofrecen como desglose asignable", () => {
  const scores = { local: 4, visit: 0 };
  const players = [
    { side: "local", goals: 1, matched: { id: 1 } },
    { side: "local", goals: 3, matched: null },
  ];

  assert.deepEqual(getCedulaScoreDiscrepancies(scores, players), [
    { side: "local", teamScore: 4, playerScore: 1, difference: 3 },
  ]);
  assert.deepEqual(resolveCedulaScores(scores, players, { local: "players" }), {
    local: 1,
    visit: 0,
  });
});

test("crea goles sin asignar cuando el marcador supera el desglose", () => {
  const result = reconcileRostersToScores(
    [{ playerId: 1, goals: 3, ownGoals: 0 }],
    [{ playerId: 2, goals: 1, ownGoals: 0 }],
    { local: 9, visit: 1 },
  );
  assert.deepEqual(result.unassignedGoals, { local: 6, visit: 0 });
  assert.equal(result.localRoster[0].goals, 3);
});

test("descarta eventos individuales excedentes cuando se conserva el marcador", () => {
  const result = reconcileRostersToScores(
    [{ playerId: 1, goals: 5, ownGoals: 0 }, { playerId: 2, goals: 4, ownGoals: 0 }],
    [],
    { local: 3, visit: 0 },
  );
  assert.deepEqual(result.discardedIndividualGoals, { local: 6, visit: 0 });
  assert.deepEqual(result.localRoster.map(player => player.goals), [3, 0]);
  assert.deepEqual(result.unassignedGoals, { local: 0, visit: 0 });
});
