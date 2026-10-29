import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { transformSync } from "next/dist/build/swc/index.js";
import { createRequestCache } from "../src/utils/requestCache.js";

function createService() {
  const calls = [];
  let session = { access_token: "session-a" };
  const tables = {
    divisions: [{ id: 1, league_id: 7, name: "Primera" }, { id: 2, league_id: 8, name: "Otra liga" }],
    tournaments: [{ id: 12, division_id: 1 }, { id: 99, division_id: 1 }, { id: 13, division_id: 2 }],
    jornadas: [{ id: 22, name: "Jornada 1", tournament_id: 12 }, { id: 23, tournament_id: 13 }],
    matches: [
      { id: 31, jornada_id: 22, team1_id: 41, team2_id: 42, date: "2026-10-26 10:00:00", status: "Finalizado", goals1: 2, goals2: 0 },
      { id: 32, jornada_id: 22, date: "2026-10-26 11:00:00", status: "Cancelado" },
      { id: 33, jornada_id: 23, date: "2026-10-26 12:00:00", status: "Programado" },
    ],
    teams: [{ id: 41, name: "Halcones" }, { id: 42, name: "Leones" }],
  };
  const client = {
    auth: { getSession: async () => ({ data: { session }, error: null }) },
    from(table) {
      const filters = [];
      const query = {
        select() { return query; }, order() { return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        neq(key, value) { filters.push((row) => row[key] !== value); return query; },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
        gte(key, value) { filters.push((row) => row[key] >= value); return query; },
        lte(key, value) { filters.push((row) => row[key] <= value); return query; },
        abortSignal(signal) { query.signal = signal; return query; },
        then(resolve, reject) {
          calls.push(table);
          return Promise.resolve().then(() => {
            query.signal?.throwIfAborted();
            return { data: structuredClone(tables[table].filter((row) => filters.every((filter) => filter(row)))) };
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const exports = {};
  const { code } = transformSync(readFileSync("src/services/torneos/queries.js", "utf8"), {
    filename: "queries.js", jsc: { parser: { syntax: "ecmascript" } }, module: { type: "commonjs" },
  });
  runInNewContext(code, {
    exports,
    require: (name) => name.endsWith("shared") ? { supabase: client } : { createRequestCache },
    console,
  });
  return { ...exports, calls, tables, setSession: (next) => { session = next; } };
}

test("precarga el contexto y reutiliza equipos al consultar otro rango", async () => {
  const service = createService();
  await service.prefetchPartidosExternosContext(99, 7);
  assert.deepEqual(service.calls, ["divisions", "tournaments", "jornadas"]);
  service.calls.length = 0;
  const matches = await service.getPartidosExternosRango("2026-10-26", "2026-11-01", 99, 7);
  assert.deepEqual(service.calls, ["matches", "teams"]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].local_name, "Halcones");
  assert.equal(matches[0].division_name, "Primera");
  assert.equal(matches[0].time, "10:00");
  assert.equal(matches[0].goals1, 2);
  assert.equal(matches[0].goals2, 0);
  service.calls.length = 0;
  await service.getPartidosExternosRango("2026-10-26", "2026-11-01", 99, 7);
  assert.equal(service.calls.length, 0);
  service.tables.matches.push({
    ...service.tables.matches[0], id: 34, date: "2026-11-02 11:00:00",
  });
  await service.getPartidosExternosRango("2026-11-02", "2026-11-08", 99, 7);
  assert.deepEqual(service.calls, ["matches"]);
});

test("comparte consultas simultaneas y las comprobaciones forzadas ignoran ambas caches", async () => {
  const service = createService();
  const load = (options) => service.getPartidosExternosRango("2026-10-26", "2026-11-01", 99, 7, options);
  await Promise.all([load(), load()]);
  assert.equal(service.calls.length, 5);
  service.tables.matches[0].date = "2026-10-26 15:00:00";
  assert.equal((await load())[0].time, "10:00");
  service.calls.length = 0;
  assert.equal((await load({ forceRefresh: true }))[0].time, "15:00");
  assert.deepEqual(service.calls, ["divisions", "tournaments", "jornadas", "matches", "teams"]);
  service.calls.length = 0;
  assert.equal((await load())[0].time, "15:00");
  assert.equal(service.calls.length, 0);
});

test("aisla resultados por sesion, liga y torneo y no devuelve cache sin sesion", async () => {
  const service = createService();
  const load = (tournamentId = 99, leagueId = 7) =>
    service.getPartidosExternosRango("2026-10-26", "2026-11-01", tournamentId, leagueId);
  await load();
  service.setSession({ access_token: "session-b" });
  service.tables.teams[0].name = "Otro nombre";
  assert.equal((await load())[0].local_name, "Otro nombre");
  service.calls.length = 0;
  await load(12);
  assert.ok(service.calls.includes("divisions"));
  service.calls.length = 0;
  await load(99, 8);
  assert.ok(service.calls.includes("divisions"));
  service.setSession(null);
  service.calls.length = 0;
  assert.equal((await load()).length, 0);
  assert.equal(service.calls.length, 0);
});
