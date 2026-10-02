import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPendingMatchCancellationRequest,
  buildPendingMatchResultRequest,
  buildUnresultedMatchPendingRequest,
  getMatchesForManagement,
  getPendingMatchesForManagement,
} from "../src/utils/pendingMatchManagement.js";

const jornadas = [
  { id: 10, name: "Jornada 1", status: "Finalizada" },
  { id: 11, name: "Jornada 2", status: "Confirmada" },
  { id: 12, name: "Jornada 3", status: "Pendiente" },
  { id: 13, name: "Jornada 4", status: "Pendiente" },
];
const teams = [{ id: 1, name: "Águilas" }, { id: 2, name: "Pumas" }];
const match = (id, extra = {}) => ({
  id, jornada_id: 10, team1_id: 1, team2_id: 2, date: null,
  status: "Pendiente", result_revision: 4, ...extra,
});

test("lista todos los aplazados publicados con sus equipos y jornada de origen", () => {
  const matches = [match(2, { jornada_id: 11 }), match(1)];
  const pending = getPendingMatchesForManagement({ matches, jornadas, teams });
  assert.deepEqual(pending.map((item) => item.id), [1, 2]);
  assert.equal(pending[0].local.name, "Águilas");
  assert.equal(pending[0].visitante.name, "Pumas");
  assert.equal(pending[0].originJornada, "Jornada 1");
  assert.equal(pending[1].originJornadaId, 11);
  assert.equal(pending[0].result_revision, 4);
});

test("excluye descansos, jornadas futuras, programación vigente y partidos resueltos", () => {
  const matches = [
    match(1), match(2, { team2_id: null }), match(3, { team1_id: null }),
    match(4, { isByeMatch: true }), match(5, { team2_id: "BYE" }),
    match(6, { jornada_id: 12 }), match(7, { jornada_id: 13 }),
    match(8, { status: "Cancelado" }), match(9, { status: "Finalizado" }),
    match(10, { status: "Programado", date: "2026-09-20T10:00:00" }),
    match(11, { date: "2026-09-20T10:00:00" }),
    match(12, { team2_id: null, visitante: teams[1] }),
    match(13, { status: "Programado" }),
  ];
  assert.deepEqual(getPendingMatchesForManagement({ matches, jornadas, teams }).map((item) => item.id), [1, 13]);
  assert.deepEqual(getPendingMatchesForManagement({ matches, teams, jornadas: jornadas.map((round) => ({ ...round, status: "Pendiente" })) }), []);
});

test("separa los aplazados de los programados sin resultado y excluye la última jornada confirmada", () => {
  const matches = [
    match(1),
    match(2, { status: "Programado", date: "2026-09-08 15:00:00" }),
    match(3, { jornada_id: 11, status: "Programado", date: "2026-09-15 15:00:00" }),
    match(4, { jornada_id: 12, status: "Programado", date: "2026-09-22 15:00:00" }),
    match(5, { status: "Finalizado", date: "2026-09-08 16:00:00" }),
    match(6, { status: "Cancelado", date: "2026-09-08 17:00:00" }),
    match(7, { status: "Programado", date: "2026-09-08 18:00:00", goals1: 0 }),
    match(8, { status: "Programado", date: "2026-09-08 19:00:00", goals2: 0 }),
    match(9, { status: "Programado", date: "2026-09-08 20:00:00", team2_id: null }),
    match(10, { status: "Programado", date: "2026-09-08 21:00:00", isByeMatch: true }),
  ];
  const managed = getMatchesForManagement({ matches, jornadas, teams });
  assert.deepEqual(managed.pending.map((item) => item.id), [1]);
  assert.deepEqual(managed.unresulted.map((item) => item.id), [2]);
  assert.equal(managed.unresulted[0].originJornadaId, 10);
  assert.equal(managed.unresulted[0].jornadas.name, "Jornada 1");
});

test("un partido sin resultado en reposición usa la jornada de origen", () => {
  const reposition = { id: 20, name: "Reposicion 1", status: "Pendiente" };
  const managed = getMatchesForManagement({
    matches: [match(1, { jornada_id: 20, status: "Programado", date: "2026-09-08 15:00:00" })],
    jornadas: [...jornadas, reposition], teams,
    config: { repositionMatchMappings: [{ matchId: 1, originalJornadaId: 10, repositionJornadaId: 20 }] },
  });
  assert.deepEqual(managed.unresulted.map((item) => item.originJornadaId), [10]);
  assert.equal(managed.unresulted[0].jornadas.name, "Jornada 1");
});

test("marcar sin resultado como pendiente limpia su programación y lo mueve al grupo de aplazados", () => {
  const scheduled = getMatchesForManagement({
    matches: [match(1, { status: "Programado", date: "2026-09-08 15:00:00", referee_id: 9 })],
    jornadas, teams,
  }).unresulted[0];
  const request = buildUnresultedMatchPendingRequest(scheduled);
  assert.equal(request.type, "atomic-result-save");
  assert.equal(request.expectedRevision, 4);
  assert.deepEqual(request.events, []);
  assert.equal(request.updates.jornada_id, 10);
  assert.equal(request.updates.status, "Pendiente");
  for (const field of ["date", "goals1", "goals2", "puntos1", "puntos2", "referee_id"]) {
    assert.equal(request.updates[field], null);
  }
  const managed = getMatchesForManagement({
    matches: [{ ...scheduled, ...request.updates }], jornadas, teams,
  });
  assert.deepEqual(managed.pending.map((item) => item.id), [1]);
  assert.deepEqual(managed.unresulted, []);
  assert.throws(() => buildUnresultedMatchPendingRequest({ ...scheduled, goals1: 0 }));
});

test("resuelve el origen de partidos que pasaron a una reposición y evita duplicados", () => {
  const reposition = { id: 20, name: "Reposicion 1", status: "Confirmada" };
  const matches = [match(1, { jornada_id: 20 }), match("1", { jornada_id: 20 }), match(2, { jornada_id: 20 })];
  const pending = getPendingMatchesForManagement({
    matches, teams, jornadas: [...jornadas, reposition], config: {
      repositionMatchMappings: [{ matchId: 1, originalJornadaId: 10, repositionJornadaId: 20 }],
      repositionMappings: [{ originalJornadaId: 11, repositionJornadaId: 20 }],
    },
  });
  assert.equal(pending.length, 2);
  assert.equal(pending[0].originJornadaId, 10);
  assert.equal(pending[1].originJornadaId, 11);
  assert.equal(pending[0].jornadas.name, "Jornada 1");
});

test("cancela sin resultado ni eventos, con control de versión y en su jornada original", () => {
  const pending = { ...match(1, { jornada_id: 20 }), originJornadaId: 10 };
  const request = buildPendingMatchCancellationRequest(pending);
  assert.equal(request.type, "atomic-result-save");
  assert.equal(request.expectedRevision, 4);
  assert.deepEqual(request.events, []);
  assert.equal(request.updates.jornada_id, 10);
  assert.equal(request.updates.status, "Cancelado");
  for (const field of ["goals1", "goals2", "puntos1", "puntos2", "referee_id", "date"]) {
    assert.equal(request.updates[field], null);
  }
  const persisted = { ...pending, ...request.updates };
  assert.deepEqual(getPendingMatchesForManagement({ matches: [persisted], jornadas, teams }), []);
});

test("el resultado vuelve a la jornada original conservando marcador, eventos y revisión", () => {
  const pending = { ...match(1, { jornada_id: 20 }), originJornadaId: 10 };
  const original = {
    type: "atomic-result-save", expectedRevision: 4,
    events: [{ player_id: 7, event_type: "goal" }],
    updates: { status: "Finalizado", goals1: 1, goals2: 0, puntos1: 3, puntos2: 0, jornada_id: 20 },
  };
  const request = buildPendingMatchResultRequest(pending, original);
  assert.equal(request.updates.jornada_id, 10);
  assert.equal(original.updates.jornada_id, 20);
  assert.equal(request.updates.goals1, 1);
  assert.equal(request.expectedRevision, 4);
  assert.deepEqual(request.events, original.events);
});

test("no resuelve un pendiente con solo una fecha ni permite perder su jornada original", () => {
  const pending = { ...match(1), originJornadaId: 10 };
  assert.throws(() => buildPendingMatchResultRequest(pending, {
    type: "atomic-result-save", updates: { status: "Pendiente" },
  }), /Captura un resultado/);
  assert.throws(() => buildPendingMatchCancellationRequest(match(1)), /jornada de origen/);
  assert.throws(() => buildPendingMatchResultRequest(match(1), {}), /jornada de origen/);
});
