import assert from "node:assert/strict";
import test from "node:test";
import {
  canReusePlanningDraftMatch,
  clearPlanningDraftsForRounds,
  getCarriedFixtureMatchIds,
  getChangedFixtureRoundIndexes,
  getFixtureMatchIdsToDelete,
  getPlanningDraftRevision,
  getPlanningDraftStorageKey,
  getScannedFixtureRoundIndexes,
  resolveFixturePlanningSchedule,
  withPlanningDraftRevisions,
} from "../src/utils/fixturePlanning.js";
import { buildFixtureRoundMatchesFromPairs } from "../src/utils/fixtureRoundEditing.js";

const pair = (local, visitante) => ({ local: { id: local }, visitante: { id: visitante } });
const jornadas = [
  { id: 10, name: "Jornada 1", status: "Confirmada" },
  { id: 11, name: "Jornada 2", status: "Pendiente" },
  { id: 12, name: "Jornada 3", status: "Pendiente" },
];

test("reconoce una jornada escaneada aunque no se acepten sus horarios", () => {
  const scanned = buildFixtureRoundMatchesFromPairs(1, [], [pair(1, 2)], { lockMatches: true });
  assert.equal(scanned.matches[0].scanScheduleAccepted, false);
  assert.deepEqual(getScannedFixtureRoundIndexes(scanned.matches), [1]);
  const unlocked = scanned.matches.map((match) => ({ ...match, locked: false, scanLocked: false }));
  assert.deepEqual(getScannedFixtureRoundIndexes(unlocked), [1]);
  assert.deepEqual(getScannedFixtureRoundIndexes(unlocked.map((match) => ({ ...match, roundLocked: true }))), []);
});

test("reemplaza los sobrantes de la jornada actual y conserva los atrasados y las otras jornadas", () => {
  const originalMatches = [
    { id: 100, jornada_id: 10, status: "Pendiente" },
    { id: 101, jornada_id: 11, status: "Pendiente" },
    { id: 102, jornada_id: 11, status: "Programado" },
    { id: 103, jornada_id: 11, status: "Pendiente" },
    { id: 104, jornada_id: 12, status: "Pendiente" },
  ];
  const args = {
    originalMatches, jornadas, replacedRoundIndexes: [1],
    updatedMatches: [{ dbId: "101", jornadaIndex: 1 }],
  };
  // 103 estaba oculto en el editor y tampoco debe reaparecer al recargar.
  assert.deepEqual(getFixtureMatchIdsToDelete(args), [102, 103]);
  assert.deepEqual(getFixtureMatchIdsToDelete({ ...args, deletedMatchIds: [100, "101", 102] }), [102, 103]);
  assert.deepEqual(getFixtureMatchIdsToDelete({ ...args, replacedRoundIndexes: [] }), []);
  assert.deepEqual(getFixtureMatchIdsToDelete({ ...args, replacedRoundIndexes: [], deletedMatchIds: [104] }), [104]);
});

test("un rol sin horarios aceptados limpia la fecha y hora anteriores del registro reutilizado", () => {
  const original = { date: "2026-09-20T18:00:00", status: "Programado" };
  assert.deepEqual(resolveFixturePlanningSchedule({ scanSource: "rol-juego" }, original), {
    date: null, status: "Pendiente", changed: true,
  });
  assert.deepEqual(resolveFixturePlanningSchedule({}, original), {
    ...original, changed: false,
  });
  assert.deepEqual(resolveFixturePlanningSchedule({ scanSource: "rol-juego" }), {
    date: null, status: "Pendiente", changed: false,
  });
});

test("editar un fixture ya guardado limpia los horarios antiguos aunque no conserve metadata de escaneo", () => {
  const initial = [{ dbId: 101, jornadaIndex: 1, ...pair(1, 2) }];
  const changed = [{ dbId: 101, jornadaIndex: 1, ...pair(1, 3) }];
  assert.deepEqual(getChangedFixtureRoundIndexes(initial, changed), [1]);
  assert.deepEqual(resolveFixturePlanningSchedule(changed[0], {
    date: "2026-09-20T18:00:00", status: "Programado",
  }, { replacePlanning: true }), { date: null, status: "Pendiente", changed: true });
});

test("detecta jornadas vaciadas, movimientos y reescaneos, sin limpiar por reordenar filas", () => {
  const initial = [
    { dbId: 101, jornadaIndex: 1, ...pair(1, 2) },
    { dbId: 102, jornadaIndex: 1, ...pair(3, 4) },
  ];
  assert.deepEqual(getChangedFixtureRoundIndexes(initial, [...initial].reverse()), []);
  assert.deepEqual(getChangedFixtureRoundIndexes(initial, []), [1]);
  assert.deepEqual(getChangedFixtureRoundIndexes(initial, initial.map((match) => ({ ...match, jornadaIndex: 2 }))), [1, 2]);
  assert.deepEqual(getChangedFixtureRoundIndexes(initial, initial.map((match) => ({ ...match, scanSource: "rol-juego" }))), [1]);
});

test("respeta horarios bloqueados y aplica el nuevo horario aceptado en la misma actualización", () => {
  const original = { date: "2026-09-20T18:00:00", status: "Programado" };
  assert.deepEqual(resolveFixturePlanningSchedule({ locked: true }, original, { replacePlanning: true }), { ...original, changed: false });
  assert.deepEqual(resolveFixturePlanningSchedule({
    locked: true, scanSource: "rol-juego", scanScheduleAccepted: true,
    scannedDate: "2026-09-22", scannedTime: "19:30",
  }, original, { replacePlanning: true }), { date: "2026-09-22 19:30:00", status: "Programado", changed: true });
});

test("no borra un partido trasladado a otra jornada ni atrasados vinculados por reposición", () => {
  const originalMatches = [
    { id: 100, jornada_id: 10, status: "Pendiente" },
    { id: 101, jornada_id: 11, status: "Pendiente" },
    { id: 102, jornada_id: 11, status: "Programado" },
    { id: 103, jornada_id: 11, status: "Pendiente" },
  ];
  const carriedMatchIds = getCarriedFixtureMatchIds({
    originalMatches, jornadas,
    repositionMatchMappings: [{ matchId: "102", originalJornadaId: "10" }],
  });
  assert.deepEqual(carriedMatchIds, [102]);
  assert.deepEqual(getFixtureMatchIdsToDelete({
    originalMatches, jornadas, carriedMatchIds, replacedRoundIndexes: [0, 1],
    updatedMatches: [{ dbId: 101, jornadaIndex: 2 }],
  }), [103]);
  assert.deepEqual(getCarriedFixtureMatchIds({
    originalMatches, jornadas,
    repositionMappings: [{ repositionJornadaId: 11, originalJornadaId: 10 }],
  }), [101, 102, 103]);
});

test("quitar explícitamente un horario sigue dejando el partido pendiente sin eliminarlo", () => {
  assert.deepEqual(resolveFixturePlanningSchedule({ scanScheduleAction: "clear" }, {
    date: "2026-09-20T18:00:00", status: "Programado",
  }), { date: null, status: "Pendiente", changed: true });
});

test("mantiene los horarios aceptados del nuevo rol y detecta si ya estaban guardados", () => {
  const match = { scanSource: "rol-juego", scanScheduleAccepted: true, scannedDate: "2026-09-22", scannedTime: "19:30" };
  assert.deepEqual(resolveFixturePlanningSchedule(match), { date: "2026-09-22 19:30:00", status: "Programado", changed: true });
  assert.equal(resolveFixturePlanningSchedule(match, { date: "2026-09-22T19:30:00+00:00", status: "Programado" }).changed, false);
});

test("la revisión del borrador sobrevive a recargas sin afectar otras jornadas ni ajustes", () => {
  const before = { vueltas: "2", fixtureCriteria: { enforceRoundRobin: false }, planningDraftRevisions: { 10: "old" } };
  const config = withPlanningDraftRevisions(before, [11, "12"], "new");
  assert.deepEqual(config, { ...before, planningDraftRevisions: { 10: "old", 11: "new", 12: "new" } });
  assert.equal(getPlanningDraftRevision(JSON.stringify(config), "11"), "new");
  assert.equal(getPlanningDraftRevision(config, 99), "");
  assert.equal(getPlanningDraftRevision("invalid json", 11), "");
  assert.equal(getPlanningDraftRevision({ scannedFixtureRounds: { 11: "legacy" } }, 11), "legacy");
  assert.deepEqual(before.planningDraftRevisions, { 10: "old" });
});

test("un nuevo escaneo invalida borradores de otra sesión aunque dataVersion vuelva a cero", () => {
  const base = "planning_draft_33_id_11";
  const previousKey = getPlanningDraftStorageKey(base, 0, "previous");
  const newKey = getPlanningDraftStorageKey(base, 0, "new");
  assert.notEqual(previousKey, newKey);
  assert.notEqual(newKey, getPlanningDraftStorageKey(base, 0));
});

test("limpia todas las versiones de las jornadas guardadas sin tocar otras jornadas ni torneos", () => {
  const values = new Map([
    ["planning_draft_33_id_11", "old"], ["planning_draft_33_id_11_v0", "old"],
    ["planning_draft_33_id_11_v4_scan_old", "old"], ["planning_draft_33_J1_v3", "old"],
    ["planning_draft_33_id_12_v0", "keep"], ["planning_draft_33_id_110_v0", "keep"],
    ["planning_draft_34_id_11_v0", "keep"], ["tournament_dates_33", "keep"],
  ]);
  const storage = { get length() { return values.size; }, key: (index) => [...values.keys()][index], removeItem: (key) => values.delete(key) };
  clearPlanningDraftsForRounds(33, jornadas, [1], storage);
  assert.equal(values.size, 4);
  assert.ok([...values.values()].every((value) => value === "keep"));
});

test("guardar un rol con menos partidos elimina los cruces actuales que ya no declara el modal", () => {
  const roundMatches = [
    { id: "preview-101", dbId: 101, jornadaIndex: 1, ...pair(1, 2) },
    { id: "preview-102", dbId: 102, jornadaIndex: 1, ...pair(3, 4) },
  ];
  const result = buildFixtureRoundMatchesFromPairs(1, roundMatches, [pair(1, 2)], { lockMatches: true });
  assert.equal(result.error, null);
  assert.deepEqual(result.deletedMatchIds, [102]);
  assert.deepEqual(getFixtureMatchIdsToDelete({
    deletedMatchIds: result.deletedMatchIds,
    updatedMatches: result.matches,
    originalMatches: roundMatches.map((match) => ({ id: match.dbId, jornada_id: 11, status: "Pendiente" })),
    jornadas,
    replacedRoundIndexes: getScannedFixtureRoundIndexes(result.matches),
  }), [102]);
});

test("un ID reutilizado para otros rivales o jornada no recupera horarios ni resoluciones del borrador anterior", () => {
  const saved = { id: 1, jornada_id: 11, ...pair(1, 2) };
  assert.equal(canReusePlanningDraftMatch(saved, { ...saved, jornada_id: "11", ...pair("1", "2") }), true);
  assert.equal(canReusePlanningDraftMatch(saved, { ...saved, ...pair(1, 3) }), false);
  assert.equal(canReusePlanningDraftMatch(saved, { ...saved, ...pair(2, 1) }), false);
  assert.equal(canReusePlanningDraftMatch(saved, { ...saved, jornada_id: 12 }), false);
});
