import assert from "node:assert/strict";
import test from "node:test";
import { createHandler } from "../src/server/api/handlers/delegates/teamTournament.js";

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const makeClient = ({ actorId = "delegate-1", actorRole = "delegate", suspended = false, deleted = false, assignedTo = "delegate-1", tournament = true, participatingIds = [17, 18], matches = null } = {}) => {
  const queries = [];
  const rows = {
    profiles: { id: actorId, role: actorRole, is_suspended: suspended, is_deleted: deleted },
    team_delegates: assignedTo ? { team_id: 17 } : null,
    teams: { id: 17, division_id: 3 },
    tournaments: tournament ? {
      id: 42,
      division_id: 3,
      season: "Apertura 26",
      category: "Libre",
      format: "Liga",
      status: "En Curso",
      config: { participatingIds, winPoints: 3 },
    } : null,
    jornadas: [{ id: 51, name: "Jornada 1", status: "Confirmada", tournament_id: 42 }],
    matches: [{ id: 91, jornada_id: 51, team1_id: 17, team2_id: 18, date: "2026-08-01T10:00:00Z", status: "Finalizado", goals1: 2, goals2: 1, puntos1: 3, puntos2: 0, observations: "Nota privada", jornadas: { id: 51, name: "Jornada 1", tournament_id: 42 } }],
  };
  if (matches) rows.matches = matches;

  return {
    queries,
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);
      return {
        select(columns) { query.columns = columns; return this; },
        eq(column, value) { query.filters.push(["eq", column, value]); return this; },
        in(column, values) { query.filters.push(["in", column, values]); return this; },
        order() { return this; },
        limit() { return this; },
        range(from, to) { query.range = [from, to]; return this; },
        maybeSingle() {
          const assignedActor = query.filters.some(([method, column, value]) =>
            method === "eq" && column === "delegate_profile_id" && value === assignedTo
          );
          return Promise.resolve({
            data: table === "team_delegates" && !assignedActor ? null : rows[table],
            error: null,
          });
        },
        then(resolve, reject) {
          const data = table === "teams" && query.filters.some(([op]) => op === "in")
            ? [{ id: 17, name: "Azules" }, { id: 18, name: "Rojos" }]
            : table === "matches" && query.range
              ? rows.matches.slice(query.range[0], query.range[1] + 1)
            : rows[table];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
    },
  };
};

const invoke = async (client, teamId = "17", actorId = "delegate-1") => {
  const response = createResponse();
  await createHandler({
    requireUser: async () => ({ user: { id: actorId } }),
    supabaseAdmin: client,
  })({ method: "GET", query: { teamId } }, response);
  return response;
};

test("denies an unassigned delegate before reading tournament data", async () => {
  const client = makeClient({ actorId: "delegate-2" });
  const response = await invoke(client, "17", "delegate-2");
  assert.equal(response.statusCode, 403);
  assert.deepEqual(client.queries.map(({ table }) => table), ["profiles", "team_delegates"]);
});

test("denies a manager and inactive delegates before checking assignments", async () => {
  for (const variant of [{ actorRole: "manager" }, { suspended: true }, { deleted: true }]) {
    const client = makeClient(variant);
    const response = await invoke(client);
    assert.equal(response.statusCode, 403);
    assert.deepEqual(client.queries.map(({ table }) => table), ["profiles"]);
  }
});

test("returns only the active division tournament and its match data", async () => {
  const client = makeClient();
  const response = await invoke(client);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.tournament.season, "Apertura 26");
  assert.equal(client.queries.find(({ table }) => table === "tournaments").columns, "id, season, category, format, status, start_date, config");
  assert.equal(response.body.teams.length, 2);
  assert.equal(response.body.matches[0].observations, "");
  assert.equal(response.body.matches[0].date, "2026-08-01T10:00:00Z");
  assert.deepEqual(
    client.queries.find(({ table }) => table === "tournaments").filters.slice(0, 2),
    [["eq", "division_id", 3], ["in", "status", ["Activo", "En Curso"]]],
  );
  assert.deepEqual(
    client.queries.find(({ table }) => table === "matches").filters,
    [["eq", "jornadas.tournament_id", 42]],
  );
});

test("redacts dates and notes from other teams' matches while retaining standings scores", async () => {
  const client = makeClient({ matches: [
    { id: 92, jornada_id: 51, team1_id: 18, team2_id: 19, date: "2026-08-02T10:00:00Z", status: "Finalizado", goals1: 3, goals2: 2, puntos1: 3, puntos2: 0, observations: "Pen: 5 - 4; nota privada", jornadas: { id: 51, name: "Jornada 1", tournament_id: 42 } },
  ] });
  const response = await invoke(client);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.matches[0].date, null);
  assert.equal(response.body.matches[0].observations, "");
  assert.deepEqual([response.body.matches[0].goals1, response.body.matches[0].goals2], [3, 2]);
});

test("returns an empty bundle when the division has no active tournament", async () => {
  const client = makeClient({ tournament: false });
  const response = await invoke(client);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { tournament: null, teams: [], jornadas: [], matches: [] });
  assert.equal(client.queries.some(({ table }) => table === "matches"), false);
});

test("does not expose a division tournament that excludes the delegate's team", async () => {
  const client = makeClient({ participatingIds: [18, 19] });
  const response = await invoke(client);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.tournament, null);
  assert.equal(client.queries.some(({ table }) => table === "matches"), false);
});

test("paginates matches so the standings include more than 1000 results", async () => {
  const match = { id: 1, jornada_id: 51, team1_id: 17, team2_id: 18, status: "Finalizado", goals1: 1, goals2: 0, puntos1: 3, puntos2: 0, observations: "", jornadas: { id: 51, name: "Jornada 1", tournament_id: 42 } };
  const client = makeClient({ matches: Array.from({ length: 1001 }, (_, index) => ({ ...match, id: index + 1 })) });
  const response = await invoke(client);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.matches.length, 1001);
  assert.deepEqual(client.queries.filter(({ table }) => table === "matches").map(({ range }) => range), [[0, 999], [1000, 1999]]);
});

test("rejects invalid team ids before querying private tables", async () => {
  const client = makeClient();
  const response = await invoke(client, "17abc");
  assert.equal(response.statusCode, 400);
  assert.equal(client.queries.length, 0);
});
