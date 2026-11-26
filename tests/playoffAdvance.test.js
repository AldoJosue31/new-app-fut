import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPlayoffAdvanceReview,
  getPlayoffPreviewKey,
  hasNewPendingPlayoffResults,
} from "../src/utils/playoffUtils.js";

const torneo = { id: 10 };
const teams = ["Halcones", "Leones", "Tigres", "Pumas"].map((name, index) => ({
  id: index + 1,
  name,
}));
const config = { zonaLiguilla: true, clasificados: 4 };
const regularRound = { id: 21, name: "Jornada 1", status: "Confirmada" };
const match = (jornadaId, home, away, goals1, goals2, extra = {}) => ({
  jornada_id: jornadaId,
  team1_id: home,
  team2_id: away,
  goals1,
  goals2,
  status: "Finalizado",
  ...extra,
});

test("prepara cruces y pendientes con los datos que ya tiene el torneo", () => {
  const review = buildPlayoffAdvanceReview({
    torneo,
    teams,
    config,
    jornadas: [regularRound, { id: 22, name: "Jornada 2", status: "Pendiente" }],
    matches: [
      match(21, 1, 2, 0, 0),
      match(21, 3, 4, 2, 0),
      match(22, 2, 3, null, null, { status: "Programado" }),
      match(22, 1, 4, null, null, { status: "Cancelado" }),
    ],
  });

  assert.deepEqual(review.pending, { pendingJornadas: 1, pendingMatches: 1 });
  assert.equal(review.currentPhaseKey, null);
  assert.equal(review.preview.phaseKey, "semifinals");
  assert.deepEqual(review.preview.pairs.map(({ home, away }) => [home.id, away.id]), [[3, 4], [1, 2]]);
});

test("avanza una semifinal de ida y vuelta con el desempate por penales guardado", () => {
  const semifinals = [
    { id: 31, name: "Semifinales (ida)", status: "Confirmada" },
    { id: 32, name: "Semifinales (vuelta)", status: "Confirmada" },
  ];
  const seededTeams = teams.map((team, index) => ({ ...team, seed: index + 1 }));
  const input = {
    torneo,
    teams,
    config: {
      ...config,
      playoffReseed: false,
      playoffTieBreaker: "penalties",
      playoffLegsSemifinals: "double",
      playoffState: {
        currentPhaseKey: "semifinals",
        stages: [{
          phaseKey: "semifinals",
          pairs: [
            { home: seededTeams[0], away: seededTeams[3] },
            { home: seededTeams[1], away: seededTeams[2] },
          ],
        }],
      },
    },
    jornadas: [regularRound, ...semifinals],
    matches: [
      match(31, 1, 4, 1, 0),
      match(31, 2, 3, 2, 0),
      match(32, 4, 1, 1, 0, { observations: "Pen: 5 - 4" }),
      match(32, 3, 2, 0, 0),
    ],
  };
  const review = buildPlayoffAdvanceReview(input);
  assert.equal(review.currentPhaseKey, "semifinals");
  assert.deepEqual(review.pending, { pendingJornadas: 0, pendingMatches: 0 });
  assert.equal(review.preview.phaseKey, "final");
  assert.equal(review.preview.settings.reseed, false);
  assert.equal(review.preview.settings.tieBreaker, "penalties");
  assert.deepEqual(review.preview.participants.map((team) => team.id), [4, 2]);

  const unfinished = buildPlayoffAdvanceReview({
    ...input,
    matches: input.matches.map((game, index) => index === 2
      ? { ...game, status: "Pendiente", goals1: null, goals2: null }
      : game),
  });
  assert.match(unfinished.preview.error, /partidos pendientes/);
  assert.equal(hasNewPendingPlayoffResults(unfinished.pending, review.pending), true);
  assert.equal(hasNewPendingPlayoffResults(review.pending, unfinished.pending), false);
});

test("la verificación detecta cambios de siembra y reglas, y tolera IDs equivalentes", () => {
  const input = { torneo, teams, config, jornadas: [regularRound] };
  const previewFor = (overrides) => buildPlayoffAdvanceReview({ ...input, ...overrides }).preview;
  const preview = previewFor({ matches: [match(21, 1, 2, 2, 0)] });
  const originalKey = getPlayoffPreviewKey(preview);
  assert.notEqual(getPlayoffPreviewKey(previewFor({ matches: [match(21, 1, 2, 0, 2)] })), originalKey);
  assert.notEqual(getPlayoffPreviewKey(previewFor({
    matches: [match(21, 1, 2, 2, 0)],
    config: { ...config, playoffTieBreaker: "penalties" },
  })), originalKey);
  assert.equal(getPlayoffPreviewKey({
    ...preview,
    participants: preview.participants.map((team) => ({ ...team, teamId: String(team.id) })),
  }), originalKey);
});
