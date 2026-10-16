import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import React from "react";
import { transformSync } from "next/dist/build/swc/index.js";
import * as dateUtils from "../src/utils/dateUtils.js";
import * as jornadaUtils from "../src/utils/jornadaUtils.js";
import * as repositionUtils from "../src/utils/repositionUtils.js";
import * as pendingManagement from "../src/utils/pendingMatchManagement.js";
import * as matchValidation from "../src/utils/matchValidation.js";
import * as concurrencyUtils from "../src/utils/matchResultConcurrency.js";

const source = readFileSync(new URL("../src/components/organismos/tabs/torneos/JornadaPlanificacion.jsx", import.meta.url), "utf8");
const { code } = transformSync(source, {
  filename: "JornadaPlanificacion.jsx",
  jsc: { parser: { syntax: "ecmascript", jsx: true }, target: "es2022", transform: { react: { runtime: "classic" } } },
  module: { type: "commonjs" },
});

const rounds = [
  { id: 11, name: "Jornada 1", status: "Confirmada", start_date: "2026-10-01", end_date: "2026-10-07" },
  { id: 12, name: "Jornada 2", status: "Pendiente", start_date: "2026-10-08", end_date: "2026-10-14" },
];
const teams = [{ id: 1, name: "Águilas" }, { id: 2, name: "Pumas" }];
const delayedMatch = {
  id: 100, jornada_id: 11, local: teams[0], visitante: teams[1],
  originJornada: "Jornada 1", originJornadaId: 11, status: "Programado",
  date: "2026-10-10", time: "10:00", result_revision: 2,
};
const ownMatch = { ...delayedMatch, id: 101, jornada_id: 12, originJornada: "Jornada 2", originJornadaId: 12, time: "12:00" };

// Ejecuta el componente y sus efectos con estados controlados. Los elementos
// son de React; se aíslan el hook de datos y los componentes hijos.
function renderPlanning({
  scheduledMatches,
  jornadaData = rounds[1],
  jornadas = rounds,
  pendingMatches = [{ ...ownMatch, id: 102, date: null, time: null, status: "Pendiente" }],
}) {
  const state = [];
  const effectDeps = [];
  let stateCursor = 0;
  let effectCursor = 0;
  let pendingEffects = [];
  let dirty = false;
  const hooks = {
    useState(initial) {
      const index = stateCursor++;
      if (!Object.hasOwn(state, index)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (next) => {
        const value = typeof next === "function" ? next(state[index]) : next;
        if (!Object.is(value, state[index])) { state[index] = value; dirty = true; }
      }];
    },
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useEffect(effect, deps) {
      const index = effectCursor++;
      if (!effectDeps[index] || deps.some((dep, position) => !Object.is(dep, effectDeps[index][position]))) {
        pendingEffects.push(effect);
        effectDeps[index] = deps;
      }
    },
  };
  const components = new Map();
  const child = (name) => {
    if (!components.has(name)) components.set(name, Object.assign(() => null, { displayName: name }));
    return components.get(name);
  };
  const styled = new Proxy(() => () => child("Styled"), { get: () => () => child("Styled") });
  const planningData = {
    scheduledMatches, allPendingMatches: pendingMatches, sidebarMatches: pendingMatches,
    setScheduledMatches() {}, setAllPendingMatches() {},
    weekStartDate: jornadaData.start_date, durationMatch: 105,
    autoAdjustTimes: (matches) => matches,
    currentJornadaName: jornadaData.name,
    currentJornadaNumber: jornadaUtils.parseJornadaNumber(jornadaData.name),
    clearDraft() {}, saveDraft() {}, hasLoadedPlanningData: true,
    showExternalMatches: false, toggleExternalMatches() {}, externalMatches: [],
    loadingExternal: false, fetchExternalMatches: async () => [],
  };
  const dependencies = {
    react: { __esModule: true, default: React, ...hooks },
    "styled-components": { __esModule: true, default: styled, css: () => "", keyframes: () => "" },
    "../../../../styles/variables": { v: { colorPrincipal: "#008800" } },
    "../../../../hooks/usePlanificacionMatches": { usePlanificacionMatches: () => planningData },
    "../../../../utils/dateUtils": dateUtils,
    "../../../../utils/jornadaUtils": jornadaUtils,
    "../../../../utils/repositionUtils": repositionUtils,
    "../../../../utils/pendingMatchManagement.js": pendingManagement,
    "../../../../utils/matchValidation": matchValidation,
    "../../../../utils/matchResultConcurrency": concurrencyUtils,
    "../../../../utils/playoffUtils": { isPlayoffJornadaName: () => false },
    "../../../../lib/notifications/notify.js": { notify: { error(message) { throw new Error(message); }, success() {}, warning() {} } },
  };
  const exports = {};
  runInNewContext(code, {
    exports,
    console,
    require(specifier) {
      if (dependencies[specifier]) return dependencies[specifier];
      return new Proxy({ __esModule: true }, { get: (target, name) => target[name] ?? child(name === "default" ? specifier : name) });
    },
  });
  let resolvePayload;
  const payload = new Promise((resolve) => { resolvePayload = resolve; });
  const confirmations = [];
  const props = {
    activeTournament: { id: 7, start_date: "2026-10-01", config: {} },
    jornadaIndex: jornadas.findIndex((round) => round.id === jornadaData.id),
    jornadaData, jornadas, teams, totalJornadas: jornadas.length,
    onConfirm: async (data) => { confirmations.push(data); resolvePayload(data); }, canConfirm: true,
  };
  let tree;
  const rerender = () => {
    for (let render = 0; render < 10; render++) {
      stateCursor = 0;
      effectCursor = 0;
      pendingEffects = [];
      dirty = false;
      tree = exports.JornadaPlanificacion(props);
      pendingEffects.forEach((effect) => effect());
      if (!dirty) break;
      assert.ok(render < 9, "Los efectos deben estabilizar el componente");
    }
  };
  rerender();
  const find = (name, predicate = () => true) => {
    const visit = (element) => {
      if (!element || typeof element !== "object") return null;
      if (element.type?.displayName === name && predicate(element.props)) return element;
      const children = React.Children.toArray(element.props?.children);
      for (const nested of children) {
        const found = visit(nested);
        if (found) return found;
      }
      return null;
    };
    const element = visit(tree);
    assert.ok(element, `No aparece ${name} en el árbol real`);
    return element.props;
  };
  return { find, payload, confirmations, rerender };
}

function openRepositionReview(harness, creating = true) {
  harness.find("Btnsave", (props) => props.titulo === "Confirmar Reposicion").funcion();
  harness.rerender();
  if (creating) {
    const planner = harness.find("RepositionPlannerModal");
    assert.equal(planner.isOpen, true);
    planner.onContinue();
    harness.rerender();
  }
  assert.equal(harness.find("ConfirmModal", (props) => props.confirmText === "Publicar reposición").isOpen, true);
}

function openAssignmentConfirmation(harness) {
  harness.find("ConfirmModal", (props) => props.confirmText === "Publicar reposición").onConfirm();
  harness.rerender();
  assert.equal(harness.find("ConfirmModal", (props) => props.confirmText === "Publicar reposición").isOpen, false);
  const confirmation = harness.find("ConfirmModal", (props) => props.confirmText === "Confirmar y publicar");
  assert.equal(confirmation.isOpen, true);
  assert.equal(harness.confirmations.length, 0, "El resumen no debe guardar antes de la confirmación final");
  return confirmation;
}

test("planificar solo atrasados cambia el encabezado y publica una nueva reposición", async () => {
  const harness = renderPlanning({ scheduledMatches: [delayedMatch] });
  const header = harness.find("PlanningHeader");
  assert.equal(header.jornadaData.name, "Reposicion 1");
  assert.equal(header.isRepositionMode, true);
  openRepositionReview(harness);
  openAssignmentConfirmation(harness).onConfirm();
  const payload = await harness.payload;
  assert.equal(payload.jornada_id, 12);
  assert.equal(payload.repositionConfig.enabled, true);
  assert.deepEqual(Array.from(payload.matches, (match) => match.id), [100]);
});

test("planificar atrasados y propios conserva encabezado y confirmación oficiales", async () => {
  const harness = renderPlanning({ scheduledMatches: [delayedMatch, ownMatch] });
  const header = harness.find("PlanningHeader");
  assert.equal(header.jornadaData.name, "Jornada 2");
  assert.equal(header.isRepositionMode, false);
  harness.find("ConfirmModal", (props) => props.confirmText === "Publicar Jornada").onConfirm();
  const payload = await harness.payload;
  assert.equal(payload.jornada_id, 12);
  assert.equal(payload.repositionConfig, null);
  assert.deepEqual(Array.from(payload.matches, (match) => match.id), [100, 101]);
});

test("un descanso propio programado no se publica dentro de la reposición", async () => {
  const bye = { ...ownMatch, id: 104, visitante: { id: "BYE", name: "DESCANSA" }, isByeMatch: true };
  const harness = renderPlanning({ scheduledMatches: [delayedMatch, bye] });
  assert.equal(harness.find("PlanningHeader").jornadaData.name, "Reposicion 1");
  openRepositionReview(harness);
  openAssignmentConfirmation(harness).onConfirm();
  const payload = await harness.payload;
  assert.equal(payload.repositionConfig.enabled, true);
  assert.deepEqual(Array.from(payload.matches, (match) => match.id), [100]);
});

test("una reposición existente conserva fechas y se confirma sin crear otra", async () => {
  const reposition = { id: 30, name: "Reposicion 1", status: "Pendiente", start_date: "2026-10-20", end_date: "2026-10-26" };
  const harness = renderPlanning({
    scheduledMatches: [{ ...delayedMatch, jornada_id: 30, date: "2026-10-22" }],
    jornadaData: reposition, jornadas: [...rounds, reposition],
  });
  const header = harness.find("PlanningHeader");
  assert.equal(header.jornadaData.start_date, reposition.start_date);
  assert.equal(header.jornadaData.end_date, reposition.end_date);
  assert.equal(header.isRepositionMode, false);
  openRepositionReview(harness, false);
  openAssignmentConfirmation(harness).onConfirm();
  const payload = await harness.payload;
  assert.equal(payload.jornada_id, reposition.id);
  assert.equal(payload.repositionConfig, null);
});

test("la confirmación final cuenta los asignados y los pendientes anteriores, conservando los propios", async () => {
  const selected = Array.from({ length: 4 }, (_, index) => ({ ...delayedMatch, id: 200 + index, date: `2026-10-${10 + index}` }));
  const pending = { ...delayedMatch, date: null, time: null, status: "Pendiente" };
  const harness = renderPlanning({
    scheduledMatches: selected,
    pendingMatches: [
      { ...pending, id: 301 },
      { ...pending, id: 302 },
      { ...ownMatch, id: 102, date: null, time: null, status: "Pendiente" },
      { ...pending, id: 303, isByeMatch: true },
      { ...pending, id: 304, resolution: { type: "default" } },
    ],
  });
  openRepositionReview(harness);
  const confirmation = openAssignmentConfirmation(harness);
  const countsList = React.Children.toArray(confirmation.children.props.children).find((element) => element.type === "dl");
  const counts = React.Children.toArray(countsList.props.children).map((group) => {
    const [label, value] = React.Children.toArray(group.props.children);
    return [label.props.children, value.props.children];
  });
  assert.deepEqual(counts, [["Se asignarán", 4], ["Quedarán sin asignar", 2]]);
  confirmation.onConfirm();
  const payload = await harness.payload;
  assert.deepEqual(Array.from(payload.matches, (match) => match.id), selected.map((match) => match.id));
  assert.equal(harness.confirmations.length, 1);
});

test("volver desde la confirmación final o cerrarla no publica la reposición", async () => {
  const harness = renderPlanning({ scheduledMatches: [delayedMatch] });
  openRepositionReview(harness);
  openAssignmentConfirmation(harness).onCancel();
  harness.rerender();
  assert.equal(harness.find("ConfirmModal", (props) => props.confirmText === "Confirmar y publicar").isOpen, false);
  assert.equal(harness.find("ConfirmModal", (props) => props.confirmText === "Publicar reposición").isOpen, true);
  assert.equal(harness.confirmations.length, 0);
  openAssignmentConfirmation(harness).onClose();
  harness.rerender();
  await Promise.resolve();
  assert.equal(harness.find("ConfirmModal", (props) => props.confirmText === "Confirmar y publicar").isOpen, false);
  assert.equal(harness.confirmations.length, 0);
});

test("una reposición temporal conserva su nombre y crea la definitiva solo en la confirmación final", async () => {
  const temporary = {
    id: "draft-reposition-7", name: "Reposicion 1", isTemporary: true,
    status: "Pendiente", start_date: "2026-10-15", end_date: "2026-10-21",
  };
  const persistedRounds = rounds.map((round) => ({ ...round, status: "Confirmada" }));
  const harness = renderPlanning({
    scheduledMatches: [{ ...ownMatch, date: "2026-10-15" }],
    jornadaData: temporary, jornadas: [...persistedRounds, temporary],
  });
  const header = harness.find("PlanningHeader");
  assert.equal(header.jornadaData.name, "Reposicion 1");
  assert.equal(header.status, "Reposición temporal");
  assert.equal(header.isRepositionMode, true);
  assert.equal(harness.find("PlanningSidebar").isTemporaryReposition, true);
  openRepositionReview(harness);
  assert.equal(harness.find("RepositionPlannerModal").pendingMatchesCount, 1);
  openAssignmentConfirmation(harness).onConfirm();
  const payload = await harness.payload;
  assert.equal(payload.repositionConfig.enabled, true);
  assert.equal(payload.repositionConfig.futureJornadaPreview.length, 1);
  assert.equal(payload.repositionConfig.futureJornadaPreview[0].id, null, "Ninguna jornada persistida debe recorrerse al añadir la reposición al final");
});

test("no se puede confirmar una reposición temporal sin asignar partidos", () => {
  const temporary = { id: "draft-reposition-7", name: "Reposicion 1", isTemporary: true, status: "Pendiente", start_date: "2026-10-15", end_date: "2026-10-21" };
  const harness = renderPlanning({ scheduledMatches: [], jornadaData: temporary, jornadas: [...rounds, temporary] });
  assert.throws(
    () => harness.find("Btnsave", (props) => props.titulo === "Confirmar Reposicion").funcion(),
    /Asigna al menos un partido pendiente/,
  );
  assert.equal(harness.confirmations.length, 0);
});
