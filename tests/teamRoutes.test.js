import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeamsPath,
  isPositiveIntegerPathSegment,
  isTeamPathSegment,
  parseTeamsPathname,
  sanitizeTeamDetailView,
} from "../src/lib/navigation/teamRoutes.js";

test("construye rutas legacy y canonicas de equipos", () => {
  assert.equal(buildTeamsPath(), "/equipos");
  assert.equal(
    buildTeamsPath({ teamId: 79, view: "stats" }),
    "/equipos/79?view=stats",
  );
  assert.equal(
    buildTeamsPath({
      divisionId: 94,
      teamId: 79,
      view: "delegate-requests",
    }),
    "/division/94/equipos/79?view=delegate-requests",
  );
});

test("view solo acepta vistas de detalle conocidas", () => {
  assert.equal(sanitizeTeamDetailView("stats"), "stats");
  assert.equal(
    sanitizeTeamDetailView("delegate-requests"),
    "delegate-requests",
  );
  assert.equal(sanitizeTeamDetailView("editar"), "");
  assert.equal(
    buildTeamsPath({ teamId: "crear", view: "stats" }),
    "/equipos/crear",
  );
  assert.equal(buildTeamsPath({ view: "stats" }), "/equipos");
});

test("valida identificadores numericos y la ruta especial crear", () => {
  assert.equal(isPositiveIntegerPathSegment("94"), true);
  assert.equal(isPositiveIntegerPathSegment(79), true);
  assert.equal(isPositiveIntegerPathSegment("0"), false);
  assert.equal(isPositiveIntegerPathSegment("-1"), false);
  assert.equal(isPositiveIntegerPathSegment("94x"), false);
  assert.equal(isTeamPathSegment("crear"), true);
  assert.equal(isTeamPathSegment("79"), true);
  assert.equal(isTeamPathSegment("borrar"), false);
});

test("deriva division y equipo desde el pathname del navegador", () => {
  assert.deepEqual(parseTeamsPathname("/division/94/equipos/79"), {
    routeDivisionId: "94",
    teamId: "79",
  });
  assert.deepEqual(parseTeamsPathname("/equipos/crear"), {
    routeDivisionId: "",
    teamId: "crear",
  });
  assert.deepEqual(parseTeamsPathname("/equipos"), {
    routeDivisionId: "",
    teamId: "",
  });
  assert.equal(parseTeamsPathname("/division/invalida/equipos/79"), null);
  assert.equal(parseTeamsPathname("/torneos"), null);
});
