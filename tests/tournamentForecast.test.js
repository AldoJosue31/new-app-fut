import assert from "node:assert/strict";
import test from "node:test";
import { buildTournamentForecast, evaluateForecast, fitGoalModel, getCachedTournamentForecast, poissonDistribution, predictMatch } from "../src/server/analytics/tournamentForecast.js";
import { buildTorneoStandingsSnapshot } from "../src/utils/standingsSnapshot.js";
import { formatForecastPercent } from "../src/utils/forecastPresentation.js";
import { makeForecastFixture } from "./fixtures/tournamentForecast.js";

test("waits for an active tournament, own results and other teams' results", () => {
  assert.equal(buildTournamentForecast({ tournament: null }).available, false);
  const input = makeForecastFixture();
  input.matches[1].status = "Pendiente";
  assert.equal(buildTournamentForecast(input).available, false);
  input.matches[0].status = "Pendiente";
  input.matches[1].status = "Finalizado";
  assert.equal(buildTournamentForecast(input).available, false);
});

test("provides reproducible normalized match odds and season outcomes without mutating input", () => {
  const input = makeForecastFixture(); const original = structuredClone(input);
  const result = buildTournamentForecast(input);
  assert.deepEqual(input, original);
  assert.deepEqual(result, buildTournamentForecast(input));
  assert.equal(result.available, true);
  assert.equal(result.season.available, true);
  assert.equal(result.season.remainingMatches, 4);
  assert.equal(result.upcoming.length, 2);
  result.upcoming.forEach(({ probabilities, estimatedGoals }) => {
    assert.equal(Object.values(probabilities).reduce((sum, value) => sum + value), 100);
    assert.ok(estimatedGoals.every(Number.isFinite));
  });
  assert.equal(result.upcoming[0].difficulty, "Media");
  const objective = (id) => result.season.objectives.find((entry) => entry.id === id).percent;
  assert.ok(objective("qualified") >= objective("direct"));
  assert.equal(Math.round(objective("relegation") + objective("survival")), 100);
});

test("goal probabilities include high-scoring tails and are symmetric on neutral ground", () => {
  for (const rate of [0.05, 2.5, 15, 40]) assert.ok(Math.abs(poissonDistribution(rate).reduce((a, b) => a + b) - 1) < 1e-10);
  const input = makeForecastFixture();
  const model = fitGoalModel(input.teams, input.matches.slice(0, 2).map((match) => ({ ...match, round: 1 })));
  const a = predictMatch(model, 1, 2); const b = predictMatch(model, 2, 1);
  assert.ok(a.win > a.lose);
  assert.ok(Math.abs(a.win - b.lose) < 1e-10);
  for (let id = 2; id <= 4; id++) assert.equal(predictMatch(model, 1, id).percentages.reduce((x, y) => x + y), 100);
});

test("defaults count in standings but cannot inflate sporting strength", () => {
  const input = makeForecastFixture();
  input.matches[0].observations = "Victoria por default (W.O.)";
  input.matches[0].goals1 = 30;
  const result = buildTournamentForecast(input);
  assert.equal(result.excludedWalkovers, 1);
  assert.equal(result.own.played, 1);
  assert.equal(result.own.analyzed, 0);
  assert.equal(result.upcoming[0].limitedData, true);
  input.matches[1].observations = "Doble W.O. - ambos pierden por default";
  assert.equal(buildTournamentForecast(input).available, false);
});

test("does not invent the missing calendar or simulate custom/invalid schedules", () => {
  for (const alter of [
    (input) => input.matches.pop(),
    (input) => input.matches.push({ ...input.matches[2], id: 77 }),
    (input) => { input.tournament.config.fixtureCriteria = { enforceRoundRobin: false }; },
    (input) => { input.matches[5].status = "Cancelado"; },
    (input) => { input.matches[5].status = "Finalizado"; },
    (input) => { input.tournament.config.participatingIds.push(99); },
  ]) {
    const input = makeForecastFixture(); alter(input);
    const result = buildTournamentForecast(input);
    assert.equal(result.available, true);
    assert.equal(result.season.available, false);
    assert.ok(result.season.reason);
  }
});

test("preserves mapped reposiciones and ignores byes and foreign tournaments", () => {
  const input = makeForecastFixture();
  input.jornadas.push({ id: 10, name: "Reposicion 1", status: "Confirmada", tournament_id: 42 });
  input.matches[2].jornada_id = 10; input.matches[2].jornadas = input.jornadas[3];
  input.tournament.config.repositionMatchMappings = [{ matchId: 3, originalJornadaName: "Jornada 2" }];
  input.matches.push({ id: 20, team1_id: 1, team2_id: null, status: "Pendiente", jornadas: input.jornadas[0] });
  input.matches.push({ ...input.matches[0], id: 21, goals1: 99, jornadas: { name: "Jornada 1", tournament_id: 999 } });
  const result = buildTournamentForecast(input);
  assert.equal(result.analyzedMatches, 2);
  assert.equal(result.season.available, true);
  assert.equal(result.upcoming.find((match) => match.matchId === 3).round, 2);
});

test("retains all official points, including penalties and double defaults", () => {
  const input = makeForecastFixture();
  input.matches[0] = { ...input.matches[0], goals1: 1, goals2: 1, puntos1: 2, puntos2: 1, observations: "Pen: 5-4" };
  input.matches[1] = { ...input.matches[1], goals1: 0, goals2: 0, puntos1: 0, puntos2: 0, observations: "Doble W.O." };
  const table = buildTorneoStandingsSnapshot({ torneo: input.tournament, equipos: input.teams, partidos: input.matches, jornadasProp: input.jornadas }).tablaGeneral;
  assert.equal(table.find((row) => row.id === 1).pts, 2);
  assert.equal(table.find((row) => row.id === 3).dg, -3);
  assert.equal(table.find((row) => row.id === 3).pts, 0);
  const result = buildTournamentForecast(input);
  assert.equal(result.own.pointsPerGame, 2);
});

test("common opponents and direct meetings are real score comparisons", () => {
  const input = makeForecastFixture();
  input.matches[2] = { ...input.matches[2], status: "Finalizado", goals1: 2, goals2: 1, puntos1: 3, puntos2: 0 };
  const result = buildTournamentForecast(input);
  assert.equal(result.upcoming[0].rival.id, 4);
  assert.equal(result.upcoming[0].commonOpponents[0].id, 3);
  assert.deepEqual(result.upcoming[0].commonOpponents[0].own.results, ["2–1"]);
  assert.deepEqual(result.upcoming[0].commonOpponents[0].rival.results, ["0–3"]);
});

test("recent form orders postponed games by playing date, with undated games first", () => {
  const input = makeForecastFixture();
  Object.assign(input.matches[0], { date: "2026-11-20T18:00:00Z", goals1: 0, goals2: 1, puntos1: 0, puntos2: 3 });
  Object.assign(input.matches[2], { date: "2026-11-03T18:00:00Z", status: "Finalizado", goals1: 2, goals2: 0, puntos1: 3, puntos2: 0 });
  Object.assign(input.matches[4], { date: "2026-11-05T18:00:00Z", status: "Finalizado", goals1: 1, goals2: 1, puntos1: 1, puntos2: 1 });
  assert.deepEqual(buildTournamentForecast(input).own.form, ["G", "E", "P"]);
  input.matches[4].date = null;
  assert.deepEqual(buildTournamentForecast(input).own.form, ["E", "G", "P"]);
});

test("finished seasons only claim certainty when official criteria resolve the position", () => {
  const input = makeForecastFixture();
  input.tournament.config.repechajeTeams = 0;
  input.matches.forEach((match) => Object.assign(match, { status: "Finalizado", goals1: 3, goals2: 0, puntos1: 3, puntos2: 0 }));
  const result = buildTournamentForecast(input);
  assert.equal(result.season.exact, true);
  assert.deepEqual(result.season.positionRange, [1, 1]);
  assert.equal(result.season.expectedPoints, 9);
  assert.equal(result.season.objectives.find((entry) => entry.id === "promotion").percent, 100);
  input.matches.forEach((match) => Object.assign(match, { goals1: 0, goals2: 0, puntos1: 1, puntos2: 1 }));
  const tied = buildTournamentForecast(input);
  assert.equal(tied.season.exact, false);
  assert.equal(tied.season.unresolvedTie, true);
  assert.ok(tied.season.objectives.find((entry) => entry.id === "promotion").percent > 10);
  assert.equal(formatForecastPercent(0), "<1 %");
  assert.equal(formatForecastPercent(100), ">99 %");
  assert.equal(formatForecastPercent(100, true), "100 %");
});

test("cache invalidates on score and configuration corrections", () => {
  const input = makeForecastFixture();
  const original = getCachedTournamentForecast(input);
  assert.equal(original, getCachedTournamentForecast(input));
  input.matches[0].goals1 = 0; input.matches[0].goals2 = 6;
  const corrected = getCachedTournamentForecast(input);
  assert.notEqual(original, corrected);
  assert.notDeepEqual(original.upcoming[0].probabilities, corrected.upcoming[0].probabilities);
  input.tournament.config.vueltas = "2";
  assert.equal(getCachedTournamentForecast(input).season.available, false);
});

test("playoff opponents remain available while regular-season forecasting is closed", () => {
  const input = makeForecastFixture();
  input.tournament.config.playoffState = { currentPhaseKey: "semifinals" };
  input.jornadas.push({ id: 11, name: "Semifinales", status: "Confirmada", tournament_id: 42 });
  input.matches.push({ ...input.matches[2], id: 30, jornada_id: 11, jornadas: input.jornadas[3] });
  const result = buildTournamentForecast(input);
  assert.equal(result.season.available, false);
  assert.equal(result.upcoming.find((match) => match.matchId === 30).stageName, "Semifinales");
});

test("backtesting only uses earlier rounds and reports a probability score", () => {
  const input = makeForecastFixture();
  const games = Array.from({ length: 16 }, (_, i) => ({ ...input.matches[i % 2], round: 1 + Math.floor(i / 2), date: `2026-11-${String(1 + Math.floor(i / 2)).padStart(2, "0")}T18:00:00Z`, goals1: i % 3, goals2: i % 2, status: "Finalizado" }));
  const validation = evaluateForecast(input.teams, games);
  assert.equal(validation.matches, 10);
  assert.ok(validation.brier >= 0 && validation.brier <= 2);
  assert.ok(Math.abs(validation.baselineBrier - 0.667) < 0.001);
  const renumbered = games.map((game, index) => ({ ...game, round: index % 2 ? 1 : 20 }));
  assert.deepEqual(evaluateForecast(input.teams, renumbered), validation);
  assert.equal(evaluateForecast(input.teams, games.map((game) => ({ ...game, date: null }))).matches, 0);
});
