import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUTES,
  buildDivisionTeamsPath,
  buildDivisionTournamentsPath,
  buildPublicStandingsPath,
  sanitizeInternalPath,
} from "../src/lib/navigation/routes.js";

test("los builders codifican segmentos dinamicos", () => {
  assert.equal(buildDivisionTeamsPath(7), "/division/7/equipos");
  assert.equal(
    buildDivisionTeamsPath("primera/a", "equipo 10"),
    "/division/primera%2Fa/equipos/equipo%2010",
  );
  assert.equal(
    buildDivisionTournamentsPath(7, "apertura", "jornadas", 3),
    "/division/7/torneos/apertura/jornadas/3",
  );
  assert.equal(
    buildPublicStandingsPath("copa/a"),
    "/share/standings/copa%2Fa",
  );
});

test("sanitizeInternalPath conserva destinos internos validos", () => {
  assert.equal(
    sanitizeInternalPath("/dashboard?from=login#top"),
    "/dashboard?from=login#top",
  );
  assert.equal(sanitizeInternalPath(ROUTES.TEAMS), ROUTES.TEAMS);
});

test("sanitizeInternalPath bloquea redirecciones externas y backslashes", () => {
  const invalidDestinations = [
    "https://attacker.invalid",
    "//attacker.invalid/path",
    "/%2f%2fattacker.invalid",
    "/%252f%252fattacker.invalid",
    "/\\attacker.invalid",
    "/%5cattacker.invalid",
    "/dashboard\nSet-Cookie:bad",
  ];

  for (const destination of invalidDestinations) {
    assert.equal(sanitizeInternalPath(destination, ROUTES.LOGIN), ROUTES.LOGIN);
  }
});
