import assert from 'node:assert/strict';
import test from 'node:test';
import { getStandingsTeamResults } from '../src/utils/standingsTeamResults.js';

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
