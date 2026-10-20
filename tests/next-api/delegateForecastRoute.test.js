import assert from "node:assert/strict";
import test from "node:test";
import { makeForecastFixture } from "../fixtures/tournamentForecast.js";

process.env.SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";
const { createRoute } = await import("../../app/api/delegates/teams/[teamId]/forecast/routeFactory.js");

const makeDependencies = (assigned = true) => {
  const fixture = makeForecastFixture();
  fixture.matches[1].observations = "Nota privada de otro equipo";
  const queries = [];
  return {
    queries,
    requireUser: async (request) => {
      if (request.headers.authorization !== "Bearer test") throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
      return { user: { id: "delegate" } };
    },
    supabaseAdmin: {
      from(table) {
        const filters = [];
        queries.push(table);
        const rows = { profiles: { role: "delegate" }, team_delegates: assigned ? { team_id: 1 } : null, teams: { ...fixture.teams[0], division_id: 7 }, tournaments: fixture.tournament, jornadas: fixture.jornadas, matches: fixture.matches, divisions: { id: 7, tier: 2, category_id: 3, league_id: 4 } };
        return {
          select() { return this; }, eq(column, value) { filters.push([column, value]); return this; },
          in() { this.multiple = true; return this; }, order() { return this; }, limit() { return this; }, range() { return this; },
          maybeSingle() { return Promise.resolve({ data: rows[table], error: null }); },
          then(resolve, reject) {
            let data = rows[table];
            if (table === "teams" && this.multiple) data = fixture.teams;
            if (table === "divisions") data = [{ id: 6, tier: 1 }, { id: 7, tier: 2 }, { id: 8, tier: 3 }];
            return Promise.resolve({ data, error: null }).then(resolve, reject);
          },
        };
      },
    },
  };
};

const invoke = (dependencies, { method = "GET", token = "Bearer test", teamId = "1" } = {}) => createRoute(dependencies)(
  new Request(`http://localhost/api/delegates/teams/${teamId}/forecast`, { method, headers: { Authorization: token } }),
  { params: Promise.resolve({ teamId }) },
);

test("forecast App Router resolves params, scopes data and returns private probability JSON", async () => {
  const response = await invoke(makeDependencies());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.match(response.headers.get("vary"), /Authorization/);
  const { forecast } = await response.json();
  assert.equal(forecast.available, true);
  assert.equal(forecast.season.available, true);
  assert.equal(forecast.season.objectives.find((objective) => objective.id === "promotion").label, "Ascender");
  assert.equal(forecast.season.objectives.find((objective) => objective.id === "relegation").label, "Descender");
  const text = JSON.stringify(forecast);
  assert.equal(text.includes("Nota privada"), false);
  assert.equal(text.includes("2026-11-04"), false);
});

test("a warm forecast cache cannot bypass authorization", async () => {
  await invoke(makeDependencies());
  const unauthenticated = makeDependencies();
  assert.equal((await invoke(unauthenticated, { token: "" })).status, 401);
  assert.deepEqual(unauthenticated.queries, []);
  const unassigned = makeDependencies(false);
  assert.equal((await invoke(unassigned)).status, 403);
  assert.deepEqual(unassigned.queries, ["profiles", "team_delegates"]);
});

test("forecast route rejects writes and invalid ids with no database changes", async () => {
  const dependencies = makeDependencies();
  assert.equal((await invoke(dependencies, { method: "POST" })).status, 405);
  assert.deepEqual(dependencies.queries, []);
  assert.equal((await invoke(dependencies, { teamId: "abc" })).status, 400);
  assert.deepEqual(dependencies.queries, []);
});
