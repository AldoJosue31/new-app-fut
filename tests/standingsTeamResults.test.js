import assert from 'node:assert/strict';
import test from 'node:test';
import { getStandingsTeamResults } from '../src/utils/standingsTeamResults.js';
import { buildTorneoStandingsSnapshot } from '../src/utils/standingsSnapshot.js';

const jornadas = [
  { id: 10, name: 'Jornada 1' },
  { id: 20, name: 'Jornada 2' },
  { id: 30, name: 'Jornada 3' },
  { id: 40, name: 'Reposición 1' },
];
const match = (overrides = {}) => ({
  id: 1, team1_id: 1, team2_id: 2, jornada_id: 10,
  status: 'finalizado', goals1: 2, goals2: 1, ...overrides,
});
const results = (partidos, overrides = {}) => getStandingsTeamResults({
  teamId: 1, partidos, jornadas, jornadaLimit: 3, ...overrides,
});

test('includes only completed matches involving the selected team and valid opponents', () => {
  const data = results([
    match(),
    match({ id: 2, team1_id: 3, team2_id: 4 }),
    match({ id: 3, status: 'pendiente', goals1: 0, goals2: 0 }),
    match({ id: 4, status: 'cancelado' }),
    match({ id: 5, team2_id: null }),
  ]);
  assert.deepEqual(data.map(({ id }) => id), [1]);
});

test('normalizes IDs, completed statuses and scores for home and away results', () => {
  const data = results([
    match({ goals1: '0', goals2: '0', status: ' Jugado ' }),
    match({ id: 2, team1_id: 2, team2_id: '1', goals1: 3, goals2: 1, status: 'completado' }),
    match({ id: 3, team1_id: 2, team2_id: 1, goals1: 0, goals2: 4, status: 'terminado' }),
  ]);
  assert.deepEqual(data.map(({ result }) => result), ['E', 'P', 'G']);
  assert.equal(data[0].goals1, 0);
});

test('does not invent results from missing or invalid scores', () => {
  const partidos = [null, '', ' ', 'abc', -1, 1.5, Infinity]
    .flatMap((value, index) => [
      match({ id: index * 2, goals1: value }),
      match({ id: index * 2 + 1, goals2: value }),
    ]);
  assert.deepEqual(results(partidos), []);
});

test('respects the table cutoff, excludes playoff rounds and sorts recent jornadas first', () => {
  const partidos = [
    match({ id: 1, jornada_id: 10 }),
    match({ id: 2, jornada_id: 30 }),
    match({ id: 3, jornada_id: 20, date: '2026-10-20' }),
    match({ id: 4, jornada_id: 20, date: '2026-10-21' }),
    match({ id: 5, jornada_id: 99, jornadas: { name: 'Final' } }),
  ];
  const originalOrder = partidos.map(({ id }) => id);
  assert.deepEqual(results(partidos, { jornadaLimit: 2 }).map(({ id }) => id), [4, 3, 1]);
  assert.deepEqual(partidos.map(({ id }) => id), originalOrder);
});

test('assigns rescheduled matches to their original official jornada', () => {
  const partidos = [match({ jornada_id: 40 })];
  const repositionMappings = [{ repositionJornadaId: 40, originalJornadaId: 10 }];
  assert.equal(results(partidos, { jornadaLimit: 1, repositionMappings })[0].jornadaNumber, 1);
  const repositionMatchMappings = [{ matchId: 1, originalJornadaId: 20 }];
  assert.deepEqual(results(partidos, { jornadaLimit: 1, repositionMappings, repositionMatchMappings }), []);
  assert.equal(results(partidos, { repositionMatchMappings })[0].jornadaNumber, 2);
});

test('preserves penalties and marks a double walkover as a loss despite a tied score', () => {
  const data = results([
    match({ goals1: 1, goals2: 1, observations: 'Penales: 4 - 3' }),
    match({ id: 2, goals1: 0, goals2: 0, observations: 'Doble W.O.' }),
  ]);
  assert.equal(data[0].penalties, '4 - 3');
  assert.equal(data[0].result, 'E');
  assert.equal(data[1].doubleWalkover, true);
  assert.equal(data[1].result, 'P');
});

test('handles teams without results', () => {
  assert.deepEqual(results([]), []);
  assert.deepEqual(results([match()], { teamId: 55 }), []);
  assert.deepEqual(results([match()], { teamId: null }), []);
});

test('shows earned points and running totals from the first jornada with the newest result first', () => {
  const data = results([
    match({ id: 3, jornada_id: 30, team1_id: 2, team2_id: 1, goals1: 3, goals2: 0 }),
    match({ id: 1, jornada_id: 10 }),
    match({ id: 2, jornada_id: 20, goals1: 1, goals2: 1 }),
  ]);
  assert.deepEqual(data.map(({ id, pointsEarned, accumulatedPoints }) => [id, pointsEarned, accumulatedPoints]), [
    [3, 0, 4], [2, 1, 4], [1, 3, 3],
  ]);
});

test('uses recorded penalty bonuses and negative points for the selected home or away team', () => {
  const data = results([
    match({ id: 1, jornada_id: 10 }),
    match({ id: 2, jornada_id: 20, goals1: 2, goals2: 2, puntos1: '2', puntos2: '1', observations: 'Penales: 4 - 3' }),
    match({ id: 3, jornada_id: 30, team1_id: 2, team2_id: 1, goals1: 2, goals2: 0, puntos1: 3, puntos2: -1 }),
  ]);
  assert.deepEqual(data.map(({ pointsEarned, accumulatedPoints }) => [pointsEarned, accumulatedPoints]), [
    [-1, 4], [2, 5], [3, 3],
  ]);
});

test('falls back to the tournament rules when stored points are absent or both zero', () => {
  const data = results([
    match({ id: 1, jornada_id: 10, puntos1: 0, puntos2: 0 }),
    match({ id: 2, jornada_id: 20, goals1: 1, goals2: 1 }),
    match({ id: 3, jornada_id: 30, goals1: 0, goals2: 3 }),
  ], { config: { winPoints: 5, drawPoints: 2, lossPoints: -1 } });
  assert.deepEqual(data.map(({ pointsEarned, accumulatedPoints }) => [pointsEarned, accumulatedPoints]), [
    [-1, 6], [2, 7], [5, 5],
  ]);
});

test('preserves a zero-point draw and awards no points for a double default', () => {
  const data = results([
    match({ id: 1, jornada_id: 10 }),
    match({ id: 2, jornada_id: 20, goals1: 0, goals2: 0, puntos1: 0, puntos2: 0 }),
    match({ id: 3, jornada_id: 30, goals1: 0, goals2: 0, puntos1: 3, puntos2: 3, observations: 'Doble W.O.' }),
  ], { config: { winPoints: 3, drawPoints: 0, lossPoints: 1 } });
  assert.deepEqual(data.map(({ pointsEarned, accumulatedPoints }) => [pointsEarned, accumulatedPoints]), [
    [0, 3], [0, 3], [3, 3],
  ]);
});

test('accumulates by official jornada after rescheduling and excludes results beyond the cutoff', () => {
  const partidos = [
    match({ id: 1, jornada_id: 40, date: '2026-10-29' }),
    match({ id: 2, jornada_id: 20, date: '2026-10-01', goals1: 1, goals2: 1 }),
    match({ id: 3, jornada_id: 30 }),
  ];
  const data = results(partidos, {
    jornadaLimit: 2,
    repositionMappings: [{ repositionJornadaId: 40, originalJornadaId: 10 }],
  });
  assert.deepEqual(data.map(({ id, accumulatedPoints }) => [id, accumulatedPoints]), [[2, 4], [1, 3]]);
});

test('latest accumulated points agree with the standings snapshot for default and custom rules', () => {
  const partidos = [
    match({ id: 1, jornada_id: 10 }),
    match({ id: 2, jornada_id: 20, goals1: 1, goals2: 1, puntos1: 2, puntos2: 1 }),
    match({ id: 3, jornada_id: 30, goals1: 0, goals2: 0, observations: 'Doble W.O.' }),
  ].map((item) => ({ ...item, tournament_id: 99 }));

  for (const config of [{}, { winPoints: 5, drawPoints: 0, lossPoints: -1 }]) {
    const data = results(partidos, { config });
    const snapshot = buildTorneoStandingsSnapshot({
      torneo: { id: 99, config },
      equipos: [{ id: 1, name: 'Local' }, { id: 2, name: 'Visitante' }],
      partidos, jornadasProp: jornadas, selectedJornadaView: '3',
    });
    assert.equal(data[0].accumulatedPoints, snapshot.tablaGeneral.find((team) => team.id === 1).pts);
  }
});
