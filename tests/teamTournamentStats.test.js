import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "sb_publishable_test";

const { supabase } = await import("../src/lib/supabase/browserClient.js");
const { getTeamTournamentStats } = await import("../src/services/estadisticas.js");
const {
  ACTIVE_TOURNAMENT_STATUSES,
  TOURNAMENT_STATUS,
} = await import("../src/utils/constants.js");

const createQuery = (response, calls, table) => ({
  abortSignal() {
    return this;
  },
  eq(column, value) {
    calls.push({ method: "eq", table, column, value });
    return this;
  },
  in(column, values) {
    calls.push({ method: "in", table, column, values });
    return this;
  },
  limit(value) {
    calls.push({ method: "limit", table, value });
    return this;
  },
  maybeSingle() {
    return this;
  },
  or(value) {
    calls.push({ method: "or", table, value });
    return this;
  },
  order(column, options) {
    calls.push({ method: "order", table, column, options });
    return this;
  },
  range(from, to) {
    calls.push({ method: "range", table, from, to });
    return this;
  },
  select(value) {
    calls.push({ method: "select", table, value });
    return this;
  },
  then(onFulfilled, onRejected) {
    return Promise.resolve(response).then(onFulfilled, onRejected);
  },
});

test("un torneo En Curso se considera activo", () => {
  assert.deepEqual(ACTIVE_TOURNAMENT_STATUSES, [
    TOURNAMENT_STATUS.ACTIVE,
    TOURNAMENT_STATUS.ONGOING,
  ]);
});

test("las estadísticas consultan eventos sólo de los partidos del equipo", async () => {
  const calls = [];
  const originalFrom = supabase.from;
  const responses = {
    matches: {
      data: [{
        id: 901,
        goals1: 2,
        goals2: 1,
        date: "2026-08-01T10:00:00Z",
        status: "Finalizado",
        observations: null,
        team1: { id: 68, name: "Local" },
        team2: { id: 69, name: "Visita" },
        jornadas: { id: 22, name: "Jornada 1", tournament_id: 331 },
      }],
      error: null,
    },
    jornadas: { data: [{ id: 22, name: "Jornada 1" }], error: null },
    players: {
      data: [{
        id: 7,
        first_name: "Ana",
        last_name: "Gol",
        dorsal: 10,
        photo_url: null,
      }],
      error: null,
    },
    view_goleadores: { data: [], error: null },
    match_events: {
      data: [
        { id: 1, match_id: 901, player_id: 7, event_type: "gol" },
        { id: 2, match_id: 901, player_id: 8, event_type: "gol" },
      ],
      error: null,
    },
  };

  supabase.from = (table) => {
    calls.push({ method: "from", table });
    return createQuery(responses[table] || { data: [], error: null }, calls, table);
  };

  try {
    const stats = await getTeamTournamentStats(68, 8, {
      tournament: { id: 331, config: {} },
    });

    assert.equal(stats.matchHistory.length, 1);
    assert.equal(stats.playerStats[0].goals, 1);
    assert.equal(stats.playerStats[0].matches, 1);

    const eventSelect = calls.find(
      (call) => call.method === "select" && call.table === "match_events",
    );
    const eventFilter = calls.find(
      (call) => call.method === "in" && call.table === "match_events",
    );

    assert.equal(eventSelect.value, "id, match_id, event_type, player_id");
    assert.deepEqual(eventFilter, {
      method: "in",
      table: "match_events",
      column: "match_id",
      values: [901],
    });
  } finally {
    supabase.from = originalFrom;
  }
});
