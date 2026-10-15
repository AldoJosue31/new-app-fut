import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import React from "react";
import { transformSync } from "next/dist/build/swc/index.js";

const requirePackage = createRequire(import.meta.url);
const modalPath = path.resolve("src/components/organismos/tabs/torneos/subcomponents/FixturePreviewModal.jsx");
const tabPath = path.resolve("src/components/organismos/tabs/torneos/TorneoJornadasTab.jsx");
const sidebarPath = path.resolve("src/components/organismos/tabs/torneos/planificacion/PlanningSidebar.jsx");
const planningHookPath = path.resolve("src/hooks/usePlanificacionMatches.js");
const teams = [{ id: 1, name: "Águilas" }, { id: 2, name: "Pumas" }];
const rounds = [
  { id: 11, name: "Jornada 1", status: "Confirmada", start_date: "2026-10-01", end_date: "2026-10-07" },
  { id: 12, name: "Jornada 2", status: "Confirmada", start_date: "2026-10-08", end_date: "2026-10-14" },
];
const matches = [
  { id: 100, jornada_id: 11, team1_id: 1, team2_id: 2, status: "Finalizado", date: "2026-10-03 10:00:00", goals1: 2, goals2: 1, result_revision: 2 },
  { id: 101, jornada_id: 12, team1_id: 2, team2_id: 1, status: "Pendiente", date: null, result_revision: 3 },
  { id: 102, jornada_id: 11, team1_id: 1, team2_id: 2, status: "Pendiente", date: null, result_revision: 1 },
];

const textContent = (nodes) => React.Children.toArray(nodes).map((node) =>
  typeof node === "object" ? textContent(node.props?.children) : String(node)
).join(" ");

// Ejecuta componentes, hooks y utilidades reales; aísla servicios, portal y UI hija.
function renderComponent(filename, exportName, initialProps, services, notifications = []) {
  const slots = [];
  let cursor = 0;
  let dirty = true;
  let effects = [];
  let tree;
  let props = initialProps;
  const sameDeps = (previous, next) => previous && next && previous.length === next.length && next.every((value, index) => Object.is(value, previous[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (next) => {
        const value = typeof next === "function" ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ||= { current: initial };
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || !sameDeps(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || !sameDeps(slots[index].deps, deps)) {
        slots[index] = { deps };
        effects.push(effect);
      }
    },
    useLayoutEffect(effect, deps) { hooks.useEffect(effect, deps); },
    useSyncExternalStore(_subscribe, snapshot) { cursor++; return snapshot(); },
    useEffectEvent(callback) {
      const reference = hooks.useRef(callback);
      reference.current = callback;
      return hooks.useCallback((...args) => reference.current(...args), []);
    },
  };
  const child = (name) => Object.assign(() => null, { displayName: name });
  const styled = new Proxy(() => () => child("Styled"), { get: () => () => child("Styled") });
  const modules = new Map();
  const stored = new Map();
  const storage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key),
    get length() { return stored.size; },
    key: (index) => [...stored.keys()][index],
  };
  const timers = new Set();
  const schedule = (callback) => {
    const token = {};
    timers.add(token);
    setImmediate(() => { if (timers.delete(token)) callback(); });
    return token;
  };
  const load = (file) => {
    if (modules.has(file)) return modules.get(file);
    const exports = {};
    modules.set(file, exports);
    const { code } = transformSync(readFileSync(file, "utf8"), {
      filename: file,
      jsc: { parser: { syntax: "ecmascript", jsx: true }, target: "es2022", transform: { react: { runtime: "classic" } } },
      module: { type: "commonjs" },
    });
    runInNewContext(code, {
      exports, console, setTimeout: schedule, clearTimeout: (token) => timers.delete(token),
      document: { body: {} }, localStorage: storage, AbortController,
      window: { addEventListener() {}, removeEventListener() {}, setTimeout: schedule, localStorage: storage },
      alert(message) { throw new Error(message); },
      require(specifier) {
        if (specifier === "react") return { __esModule: true, default: React, ...hooks };
        if (specifier === "react-dom") return { createPortal: (children) => children };
        if (specifier === "styled-components") return { __esModule: true, default: styled, css: () => "", keyframes: () => "" };
        if (specifier === "next/dynamic") return { __esModule: true, default: (loader) => child(loader.toString().includes("FixturePreviewModal") ? "FixturePreviewModal" : "Dynamic") };
        if (specifier.endsWith("/services/torneos")) return services;
        if (specifier.endsWith("/notify.js")) return { notify: Object.fromEntries(["success", "error", "warning"].map((type) => [type, (message) => notifications.push({ type, message })])) };
        if (specifier.startsWith(".")) {
          const target = path.resolve(path.dirname(file), specifier);
          if (target.includes(`${path.sep}utils${path.sep}`) || target.includes(`${path.sep}hooks${path.sep}`)) {
            const resolved = [target, `${target}.js`, `${target}.jsx`].find((candidate) => existsSync(candidate));
            return load(resolved);
          }
          return new Proxy({ __esModule: true }, { get: (object, name) => object[name] ?? child(name === "default" ? specifier : name) });
        }
        if (specifier.startsWith("react-icons/")) return new Proxy({}, { get: (_object, name) => child(name) });
        return requirePackage(specifier);
      },
    });
    return exports;
  };
  const component = load(filename)[exportName];
  const render = () => {
    for (let iteration = 0; iteration < 25; iteration++) {
      cursor = 0; dirty = false; effects = [];
      tree = exportName === "usePlanificacionMatches"
        ? component(props.activeTournament, props.jornadaIndex, props.teams, props.matchesDB, props.globalPendingMatches, props.jornadaData, 0, props.jornadas)
        : component(props);
      effects.forEach((effect) => effect());
      if (!dirty) return;
    }
    assert.fail("Los efectos del componente no se estabilizan");
  };
  const findAll = (name, predicate = () => true) => {
    const found = [];
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if ((node.type === name || node.type?.displayName === name) && predicate(node.props)) found.push(node.props);
      React.Children.toArray(node.props?.children).forEach(visit);
    };
    visit(tree);
    return found;
  };
  return {
    render, findAll, getResult: () => tree,
    setProps(next) { props = { ...props, ...next }; dirty = true; },
    find(name, predicate) {
      const result = findAll(name, predicate)[0];
      assert.ok(result, `No aparece ${name}`);
      return result;
    },
    async flush() {
      let stable = 0;
      for (let iteration = 0; iteration < 60; iteration++) {
        if (dirty) render();
        await new Promise(setImmediate);
        stable = !dirty && timers.size === 0 ? stable + 1 : 0;
        if (stable === 4) return;
      }
      assert.fail("La carga del componente no termina");
    },
  };
}

function createServices({ failConfirmation = false, tournamentMatches = matches } = {}) {
  const tables = { jornadas: structuredClone(rounds), matches: structuredClone(tournamentMatches), config: {} };
  const withJornada = (match) => ({ ...structuredClone(match), jornadas: structuredClone(tables.jornadas.find((round) => round.id === match.jornada_id)) });
  const created = [];
  const confirmations = [];
  const services = {
    generarFixture: () => [[{ home: 1, away: 2 }]],
    getJornadas: async () => structuredClone(tables.jornadas),
    getAllMatchesByTournament: async () => tables.matches.map(withJornada),
    getMatchesByIdsService: async (ids) => tables.matches.filter((match) => ids.includes(match.id)).map(withJornada),
    getTournamentConfigService: async () => structuredClone(tables.config),
    createJornadasService: async (values) => {
      const result = values.map((value, index) => ({ id: 30 + index, ...value }));
      tables.jornadas.push(...result); created.push(...result);
      return structuredClone(result);
    },
    saveMatchResultAtomicService: async ({ matchId, expectedRevision, updates }) => {
      const match = tables.matches.find((item) => item.id === matchId);
      assert.equal(expectedRevision, match.result_revision);
      Object.assign(match, structuredClone(updates), { result_revision: match.result_revision + 1 });
      return { match: structuredClone(match) };
    },
    updateTournamentFieldsService: async (_id, fields) => { tables.config = structuredClone(fields.config); },
    getPartidosExternosRango: async () => [],
    guardarJornadaService: async (_id, data) => {
      if (failConfirmation) throw new Error("No se pudo confirmar la reposición");
      confirmations.push(data);
      assert.equal(data.jornada_id, 12, "Se debe enviar una jornada real como referencia, nunca el ID temporal");
      assert.equal(data.repositionConfig.enabled, true);
      const [reposition] = await services.createJornadasService([{
        name: "Reposicion 1", status: "Confirmada", start_date: data.repositionConfig.startDate, end_date: data.repositionConfig.endDate,
      }]);
      const mappings = data.matches.map((selected) => {
        const match = tables.matches.find((item) => item.id === selected.id);
        const originJornadaId = match.jornada_id;
        const originalJornadaName = tables.jornadas.find((round) => round.id === originJornadaId).name;
        Object.assign(match, { jornada_id: reposition.id, status: "Programado", date: `${selected.date} ${selected.time}:00` });
        return { matchId: match.id, repositionJornadaId: reposition.id, originalJornadaId: originJornadaId, originalJornadaName };
      });
      tables.config.repositionMatchMappings = mappings;
    },
  };
  return { services, tables, created, confirmations };
}

async function openEditor(options) {
  const data = createServices(options);
  const notifications = [];
  const navigation = [];
  let tab;
  tab = renderComponent(tabPath, "TorneoJornadasTab", {
    activeTournament: { id: 7, start_date: "2026-10-01", config: {} }, participatingTeams: teams,
    pathname: "/torneos/7/jornadas/12", routeJornadaId: "12",
    buildJornadaPath: (id) => `/torneos/7/jornadas/${id}`,
    navigate(next) { navigation.push(next); tab.setProps({ pathname: next, routeJornadaId: next.split("/").at(-1) }); },
  }, data.services, notifications);
  await tab.flush();
  await tab.find("JornadaPlanificacion").onEditFixture();
  await tab.flush();
  const editorProps = tab.find("FixturePreviewModal");
  const requests = [];
  const modal = renderComponent(modalPath, "FixturePreviewModal", {
    ...editorProps,
    onConfirm(...args) { requests.push(args); return editorProps.onConfirm(...args); },
  }, data.services, notifications);
  await modal.flush();
  return { ...data, tab, modal, requests, notifications, navigation };
}

test("abrir la reposición vuelve al planificador con un borrador sin crear ni mover registros", async () => {
  const harness = await openEditor();
  const original = structuredClone(harness.tables);
  harness.modal.find("button", (props) => props.className === "reposition").onClick();
  await harness.modal.flush();
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.requests[0][1].openGeneratedReposition, true);
  assert.equal(harness.modal.findAll("FixtureMatchCard", (props) => props.match?.isGeneratedRound).length, 0, "La reposición no abre una nueva columna en el editor");
  await harness.tab.flush();
  assert.equal(harness.created.length, 0);
  assert.equal(harness.confirmations.length, 0);
  assert.deepEqual(harness.tables, original);
  const planning = harness.tab.find("JornadaPlanificacion");
  assert.equal(planning.jornadaData.isTemporary, true);
  assert.equal(planning.jornadaData.name, "Reposicion 1");
  assert.equal(planning.jornadaData.start_date, "2026-10-15");
  assert.equal(planning.jornadaData.end_date, "2026-10-21");
  assert.equal(planning.matchesDB.length, 0);
  assert.deepEqual(Array.from(planning.globalPendingMatches, (match) => match.id), [101, 102]);
  assert.equal(harness.tab.findAll("FixturePreviewModal").length, 0);
  assert.deepEqual(harness.navigation, []);
});

test("crear una jornada extra continúa en el editor y requiere guardar los cambios", async () => {
  const harness = await openEditor();
  harness.modal.find("button", (props) => textContent(props.children).includes("Jornada extra")).onClick();
  await harness.modal.flush();
  assert.equal(harness.requests.length, 0);
  assert.equal(harness.created.length, 0);
  assert.ok(harness.modal.findAll("FixtureMatchCard", (props) => props.match?.isGeneratedRound).length > 0);
});

test("la reposición del fixture excluye partidos Programado sin fecha", async () => {
  const normal = { ...matches[1], id: 103, status: "Programado" };
  const harness = await openEditor({ tournamentMatches: [...matches, normal] });
  harness.modal.find("button", (props) => props.className === "reposition").onClick();
  await harness.tab.flush();
  const generated = harness.requests[0][0].filter((match) => match.roundType === "reposition");
  assert.deepEqual(Array.from(generated, (match) => match.dbId).sort(), [101, 102]);
  assert.deepEqual(harness.tables.matches.find((match) => match.id === 103), normal);
  assert.equal(harness.created.length, 0);
});

test("si solo quedan partidos normales sin fecha no ofrece crear una reposición", async () => {
  const harness = await openEditor({ tournamentMatches: [matches[0], { ...matches[1], id: 103, status: "Programado" }] });
  assert.equal(harness.modal.findAll("button", (props) => props.className === "reposition").length, 0);
  assert.equal(harness.created.length, 0);
});

const confirmationData = (planning) => ({
  jornada_id: planning.jornadaData.id,
  jornada_name: planning.jornadaData.name,
  matches: [{ ...matches[1], local: teams[1], visitante: teams[0], originJornada: "Jornada 2", originJornadaId: 12, date: "2026-10-15", time: "10:00" }],
  allPendingMatches: planning.globalPendingMatches,
  repositionConfig: { enabled: true, startDate: "2026-10-15", endDate: "2026-10-21", futureJornadaPreview: [] },
});

test("solo confirmar hace permanente el borrador y mueve los partidos seleccionados", async () => {
  const harness = await openEditor();
  const originalMatches = structuredClone(harness.tables.matches);
  harness.modal.find("button", (props) => props.className === "reposition").onClick();
  await harness.tab.flush();
  const planning = harness.tab.find("JornadaPlanificacion");
  await planning.onConfirm(confirmationData(planning));
  await harness.tab.flush();
  assert.equal(harness.created.length, 1);
  assert.equal(harness.created[0].status, "Confirmada");
  assert.equal(harness.confirmations.length, 1);
  assert.deepEqual(harness.tables.matches[0], originalMatches[0]);
  assert.equal(harness.tables.matches[1].jornada_id, 30);
  assert.deepEqual(harness.tables.matches[2], originalMatches[2]);
  assert.equal(harness.tab.find("JornadaPlanificacion").jornadaData.id, 30);
  assert.equal(harness.tab.find("JornadaPlanificacion").jornadas.some((round) => round.isTemporary), false);
  assert.deepEqual(harness.navigation, ["/torneos/7/jornadas/30"]);
});

test("si falla la confirmación se conserva el borrador y sus pendientes", async () => {
  const harness = await openEditor({ failConfirmation: true });
  harness.modal.find("button", (props) => props.className === "reposition").onClick();
  await harness.tab.flush();
  const planning = harness.tab.find("JornadaPlanificacion");
  await assert.rejects(planning.onConfirm(confirmationData(planning)), /No se pudo confirmar/);
  await harness.tab.flush();
  assert.equal(harness.created.length, 0);
  assert.equal(harness.tab.find("JornadaPlanificacion").jornadaData.isTemporary, true);
  assert.deepEqual(harness.navigation, []);
  assert.deepEqual(harness.tables.matches, matches);
});

test("la creación de reposición queda bloqueada mientras se está guardando", async () => {
  const harness = await openEditor();
  harness.modal.setProps({ isLoading: true });
  harness.modal.render();
  const button = harness.modal.find("button", (props) => props.className === "reposition");
  assert.equal(button.disabled, true);
  button.onClick();
  assert.equal(harness.requests.length, 0);
});

test("cambiar de jornada y volver al borrador no crea registros", async () => {
  const harness = await openEditor();
  harness.modal.find("button", (props) => props.className === "reposition").onClick();
  await harness.tab.flush();
  await harness.tab.find("JornadaPlanificacion").onChangeJornada(0);
  await harness.tab.flush();
  assert.equal(harness.tab.find("JornadaPlanificacion").jornadaData.id, 11);
  await harness.tab.find("JornadaPlanificacion").onChangeJornada(2);
  await harness.tab.flush();
  assert.equal(harness.tab.find("JornadaPlanificacion").jornadaData.isTemporary, true);
  assert.equal(harness.created.length, 0);
  assert.deepEqual(harness.tables.matches, matches);
  assert.ok(harness.navigation.every((route) => !route.includes("draft")));
});

test("la barra lateral y el borrador cargan únicamente pendientes jugables", async () => {
  const temporary = { id: "draft-reposition-7", name: "Reposicion 1", isTemporary: true, status: "Pendiente", start_date: "2026-10-15", end_date: "2026-10-21" };
  const pending = matches.slice(1).map((match) => ({ ...match, jornadas: rounds.find((round) => round.id === match.jornada_id) }));
  const candidates = [
    ...pending,
    { ...pending[0], id: 200, status: "Finalizado" },
    { ...pending[0], id: 201, status: "Cancelado" },
    { ...pending[0], id: 202, status: "Programado", date: "2026-10-16 10:00:00" },
    { ...pending[0], id: 203, team2_id: null, isByeMatch: true },
    { ...pending[0], id: 204, isReferenceOnly: true },
    { ...pending[0], id: 205, status: "Programado", date: null },
  ];
  const { services } = createServices();
  const hook = renderComponent(planningHookPath, "usePlanificacionMatches", {
    activeTournament: { id: 7, config: {}, start_date: "2026-10-01", division: { league_id: 1 } },
    jornadaIndex: 2, jornadaData: temporary, jornadas: [...rounds, temporary], teams,
    matchesDB: [], globalPendingMatches: candidates,
  }, services);
  await hook.flush();
  const planning = hook.getResult();
  assert.equal(planning.scheduledMatches.length, 0);
  assert.deepEqual(Array.from(planning.sidebarMatches, (match) => match.id), [101, 102]);
  const sidebar = renderComponent(sidebarPath, "PlanningSidebar", {
    matches: [
      ...candidates,
      { ...pending[0], id: 206, status: "Pendiente", persistedStatus: "Programado" },
    ].map((match) => ({ ...match, local: teams[0], visitante: teams[1], originJornada: "Jornada 2" })),
    isRepositionMode: true, isTemporaryReposition: true, jornadaIndex: 2,
  }, services);
  await sidebar.flush();
  assert.deepEqual(sidebar.findAll("PendingMatchCard").map((props) => props.match.id), [101, 102]);
  planning.setScheduledMatches([{ ...planning.sidebarMatches[0], date: "2026-10-15", time: "10:00" }]);
  await hook.flush();
  assert.deepEqual(Array.from(hook.getResult().sidebarMatches, (match) => match.id), [102]);
});

test("los cruces normales siguen disponibles al planificar su jornada oficial", async () => {
  const normal = { ...matches[1], id: 103, status: "Programado" };
  const jornada = { ...rounds[1], status: "Pendiente" };
  const { services } = createServices();
  const hook = renderComponent(planningHookPath, "usePlanificacionMatches", {
    activeTournament: { id: 7, config: {}, start_date: "2026-10-01", division: { league_id: 1 } },
    jornadaIndex: 1, jornadaData: jornada, jornadas: [rounds[0], jornada], teams,
    matchesDB: [normal], globalPendingMatches: [],
  }, services);
  await hook.flush();
  const planning = hook.getResult();
  assert.equal(planning.scheduledMatches.length, 0);
  assert.deepEqual(Array.from(planning.sidebarMatches, (match) => match.id), [103]);
  assert.equal(planning.sidebarMatches[0].status, "Pendiente");
  assert.equal(planning.sidebarMatches[0].persistedStatus, "Programado");
  const sidebar = renderComponent(sidebarPath, "PlanningSidebar", {
    matches: planning.sidebarMatches, isRepositionMode: false, jornadaIndex: 1,
  }, services);
  await sidebar.flush();
  assert.equal(sidebar.findAll("PendingMatchCard")[0].match.id, 103);
});
