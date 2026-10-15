import assert from "node:assert/strict";
import test from "node:test";
import {
  getRepositionMode,
  getSuggestedRepositionWindow,
  isPendingRepositionMatch,
  REPOSITION_MODE,
} from "../src/utils/repositionUtils.js";
import {
  buildRepositionJornadaName,
  buildRepositionPreview,
  getJornadaDisplayName,
} from "../src/utils/jornadaUtils.js";

const scheduled = (id, originJornada, extra = {}) => ({
  id, originJornada, status: "Programado", date: "2026-10-08", time: "10:00", ...extra,
});
const getMode = (scheduledMatches) => getRepositionMode({ scheduledMatches, currentJornadaNumber: 4 });

test("la reposición acepta solo pendientes guardados, no cruces normales sin fecha", () => {
  const pending = { id: 1, team1_id: 1, team2_id: 2, status: "Pendiente", date: null };
  assert.equal(isPendingRepositionMatch(pending), true);
  assert.equal(isPendingRepositionMatch({ ...pending, status: "Programado" }), false);
  assert.equal(isPendingRepositionMatch({ ...pending, persistedStatus: "Programado" }), false);
  assert.equal(isPendingRepositionMatch({ ...pending, date: "2026-10-08" }), false);
  assert.equal(isPendingRepositionMatch({ ...pending, team2_id: null, visitante: { id: 2 } }), false);
});

test("programar únicamente pendientes anteriores activa una reposición desde la jornada oficial", () => {
  assert.equal(getMode([
    scheduled(1, "Jornada 1"), scheduled(2, "Jornada 3"),
  ]), REPOSITION_MODE.ONLY_DELAYED);
});

test("añadir un partido de la jornada actual vuelve a la confirmación ordinaria", () => {
  const delayed = scheduled(1, "Jornada 2");
  const current = scheduled(2, "Jornada 4");
  assert.equal(getMode([delayed, current]), REPOSITION_MODE.NONE);
  assert.equal(getMode([delayed]), REPOSITION_MODE.ONLY_DELAYED);
  assert.equal(getMode([current]), REPOSITION_MODE.NONE);
});

test("una lista vacía, un origen desconocido o una jornada futura no crean reposición", () => {
  assert.equal(getMode([]), REPOSITION_MODE.NONE);
  assert.equal(getMode([scheduled(1, undefined)]), REPOSITION_MODE.NONE);
  assert.equal(getMode([scheduled(1, "Jornada 5")]), REPOSITION_MODE.NONE);
  assert.equal(getMode([scheduled(1, "Jornada 1"), scheduled(2, "Sin jornada")]), REPOSITION_MODE.NONE);
});

test("descansos, referencias y cancelados no cuentan como partidos a reponer", () => {
  const nonPlayable = [
    scheduled(1, "Jornada 4", { isByeMatch: true }),
    scheduled(2, "Jornada 4", { isReferenceOnly: true }),
    scheduled(3, "Jornada 4", { status: "Cancelado" }),
  ];
  assert.equal(getMode(nonPlayable), REPOSITION_MODE.NONE);
  assert.equal(getMode([...nonPlayable, scheduled(4, "Jornada 3")]), REPOSITION_MODE.ONLY_DELAYED);
});

test("el encabezado usa el número de reposición y conserva los nombres oficiales", () => {
  const name = buildRepositionJornadaName({ existingJornadas: [
    { name: "Jornada 4" }, { name: "Reposicion 1" }, { name: "Jornada de reposición 3" },
  ] });
  assert.equal(getJornadaDisplayName(name), "Reposición 4");
  assert.equal(getJornadaDisplayName("Reposicion 1"), "Reposición 1");
  assert.equal(getJornadaDisplayName("Jornada de Reposición 2"), "Reposición 2");
  assert.equal(getJornadaDisplayName("Jornada 4"), "Jornada 4");
});

test("la reposición inserta su semana y aplaza las fechas de las jornadas oficiales", () => {
  const jornadas = [
    { id: 1, name: "Jornada 3", status: "Confirmada", start_date: "2026-10-01", end_date: "2026-10-07" },
    { id: 2, name: "Jornada 4", status: "Pendiente", start_date: "2026-10-08", end_date: "2026-10-14" },
    { id: 3, name: "Jornada 5", status: "Pendiente", start_date: "2026-10-15", end_date: "2026-10-21" },
  ];
  const before = structuredClone(jornadas);
  const window = getSuggestedRepositionWindow({ jornadas, jornadaIndex: 1, jornadaDurationDays: 7 });
  const preview = buildRepositionPreview({
    jornadas, jornadaIndex: 1, repositionStartDate: window.startDate, repositionEndDate: window.endDate,
  });
  assert.equal(window.startDate, "2026-10-08");
  assert.equal(window.endDate, "2026-10-14");
  assert.deepEqual(preview.map(({ name, start_date, end_date }) => ({ name, start_date, end_date })), [
    { name: "Reposicion 1", start_date: "2026-10-08", end_date: "2026-10-14" },
    { name: "Jornada 4", start_date: "2026-10-15", end_date: "2026-10-21" },
    { name: "Jornada 5", start_date: "2026-10-22", end_date: "2026-10-28" },
  ]);
  assert.deepEqual(jornadas, before);
});
