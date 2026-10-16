import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jornadaUtils from "../src/utils/jornadaUtils.js";
import * as concurrencyUtils from "../src/utils/matchResultConcurrency.js";

// Carga el servicio real con su RPC, aislando únicamente el cliente del navegador.
const mutationsSource = readFileSync(
  new URL("../src/services/torneos/mutations.js", import.meta.url),
  "utf8",
)
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace(/^export /gm, "");

const tournamentId = 7;
const originalRoundId = 12;
const fixture = () => ({
  jornadas: [
    { id: 11, tournament_id: tournamentId, name: "Jornada 1", status: "Confirmada", start_date: "2026-10-01", end_date: "2026-10-07" },
    { id: originalRoundId, tournament_id: tournamentId, name: "Jornada 2", status: "Pendiente", start_date: "2026-10-08", end_date: "2026-10-14" },
  ],
  tournaments: [{ id: tournamentId, config: { minutosPorTiempo: 45 } }],
  matches: [
    storedMatch(100, 11),
    storedMatch(101, originalRoundId, { status: "Programado", date: "2026-10-10 10:00:00" }),
    storedMatch(102, originalRoundId),
    storedMatch(103, 11),
  ],
});

function storedMatch(id, jornadaId, extra = {}) {
  return { id, jornada_id: jornadaId, team1_id: 1, team2_id: 2, status: "Pendiente", date: null, result_revision: 2, ...extra };
}

function planningMatch(match, extra = {}) {
  return {
    ...match,
    local: { id: match.team1_id },
    visitante: { id: match.team2_id },
    originJornada: match.jornada_id === 11 ? "Jornada 1" : "Jornada 2",
    originJornadaId: match.jornada_id,
    date: null,
    time: "10:00",
    ...extra,
  };
}

function createServiceHarness(initialTables = fixture()) {
  const tables = structuredClone(initialTables);
  const operations = [];
  const supabase = {
    from(table) {
      let action = "select";
      let payload;
      let single = false;
      const filters = [];
      const query = {
        select() { return query; },
        eq(column, value) { filters.push((row) => String(row[column]) === String(value)); return query; },
        order() { return query; },
        insert(value) { action = "insert"; payload = value; return query; },
        update(value) { action = "update"; payload = value; return query; },
        upsert(value) { action = "upsert"; payload = value; return query; },
        single() { single = true; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            let rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
            if (action !== "select") {
              operations.push({ table, action, payload: structuredClone(payload) });
            }
            if (action === "insert") {
              rows = (Array.isArray(payload) ? payload : [payload]).map((item) => {
                const id = Math.max(29, ...tables[table].map((row) => Number(row.id))) + 1;
                const inserted = { id, ...structuredClone(item) };
                tables[table].push(inserted);
                return inserted;
              });
            } else if (action === "update") {
              rows.forEach((row) => Object.assign(row, structuredClone(payload)));
            } else if (action === "upsert") {
              rows = payload.map((item) => {
                const stored = tables[table].find((row) => String(row.id) === String(item.id));
                assert.ok(stored, `No existe la fila ${table}:${item.id}`);
                Object.assign(stored, structuredClone(item));
                return stored;
              });
            }
            return { data: structuredClone(single ? rows[0] : rows), error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      assert.equal(name, "save_match_result_atomic");
      const stored = tables.matches.find((match) => match.id === args.p_match_id);
      assert.ok(stored, "La confirmación debe actualizar un partido existente");
      assert.equal(stored.result_revision, args.p_expected_revision);
      operations.push({ table: "matches", action: "rpc", payload: structuredClone(args) });
      Object.assign(stored, structuredClone(args.p_updates), { result_revision: stored.result_revision + 1 });
      return { data: { match: structuredClone(stored) }, error: null };
    },
  };
  const guardarJornadaService = runInNewContext(
    `${mutationsSource}\nguardarJornadaService;`,
    { supabase, console, ...jornadaUtils, ...concurrencyUtils },
  );
  return { guardarJornadaService, tables, operations };
}

test("crear una reposición mueve solo los atrasados seleccionados y conserva la jornada oficial", async () => {
  const initialTables = fixture();
  const { guardarJornadaService, tables, operations } = createServiceHarness(initialTables);
  await guardarJornadaService(tournamentId, {
    jornada_id: originalRoundId,
    jornada_numero: 2,
    jornada_name: "Jornada 2",
    matches: [planningMatch(initialTables.matches[0], { status: "Programado", date: "2026-10-10" })],
    allPendingMatches: initialTables.matches.slice(2).map((match) => planningMatch(match)),
    repositionConfig: {
      enabled: true,
      startDate: "2026-10-08",
      endDate: "2026-10-14",
      futureJornadaPreview: [{ id: originalRoundId, name: "Jornada 2", start_date: "2026-10-15", end_date: "2026-10-21" }],
    },
  });

  const repositionRound = tables.jornadas.find((round) => round.id === 30);
  assert.equal(repositionRound.name, "Reposicion 1");
  assert.equal(repositionRound.status, "Confirmada");
  const originalRound = tables.jornadas.find((round) => round.id === originalRoundId);
  assert.equal(originalRound.status, "Pendiente");
  assert.equal(originalRound.start_date, "2026-10-15");
  assert.deepEqual(tables.matches.slice(1), initialTables.matches.slice(1));
  assert.equal(tables.matches[0].jornada_id, repositionRound.id);
  assert.equal(tables.matches[0].status, "Programado");
  assert.equal(tables.matches[0].date, "2026-10-10 10:00:00");
  assert.deepEqual(operations.filter((operation) => operation.action === "rpc").map((operation) => operation.payload.p_match_id), [100]);
  assert.equal(tables.tournaments[0].config.repositionMatchMappings[0].originalJornadaId, 11);
});

test("mezclar un atrasado con partidos propios confirma la jornada oficial sin crear reposición", async () => {
  const initialTables = fixture();
  const { guardarJornadaService, tables } = createServiceHarness(initialTables);
  await guardarJornadaService(tournamentId, {
    jornada_id: originalRoundId,
    jornada_numero: 2,
    jornada_name: "Jornada 2",
    matches: initialTables.matches.slice(0, 2).map((match) => planningMatch(match, { status: "Programado", date: "2026-10-10" })),
    allPendingMatches: initialTables.matches.slice(2).map((match) => planningMatch(match)),
    repositionConfig: null,
  });

  assert.equal(tables.jornadas.length, initialTables.jornadas.length);
  assert.equal(tables.jornadas[1].status, "Confirmada");
  assert.equal(tables.matches[0].jornada_id, originalRoundId);
  assert.equal(tables.matches[1].jornada_id, originalRoundId);
  assert.equal(tables.matches[1].status, "Programado");
  assert.deepEqual(tables.matches[3], initialTables.matches[3]);
  assert.equal(tables.tournaments[0].config.repositionMatchMappings[0].originalJornadaId, 11);
});

test("confirmar una reposición existente conserva su ID y calendario sin insertar otra", async () => {
  const initialTables = fixture();
  initialTables.jornadas.push({ id: 30, tournament_id: tournamentId, name: "Reposicion 1", status: "Pendiente", start_date: "2026-10-08", end_date: "2026-10-14" });
  initialTables.matches[0].jornada_id = 30;
  const { guardarJornadaService, tables, operations } = createServiceHarness(initialTables);
  await guardarJornadaService(tournamentId, {
    jornada_id: 30,
    jornada_numero: 1,
    jornada_name: "Reposicion 1",
    matches: [planningMatch(initialTables.matches[0], { status: "Programado", date: "2026-10-10", originJornadaId: 11, originJornada: "Jornada 1" })],
    allPendingMatches: [],
    repositionConfig: null,
  });

  assert.equal(tables.jornadas.length, initialTables.jornadas.length);
  assert.deepEqual(tables.jornadas.slice(0, 2), initialTables.jornadas.slice(0, 2));
  assert.deepEqual(tables.jornadas[2], { ...initialTables.jornadas[2], status: "Confirmada" });
  assert.equal(tables.matches[0].jornada_id, 30);
  assert.deepEqual(tables.matches.slice(1), initialTables.matches.slice(1));
  assert.equal(operations.some((operation) => operation.table === "jornadas" && ["insert", "upsert"].includes(operation.action)), false);
});
