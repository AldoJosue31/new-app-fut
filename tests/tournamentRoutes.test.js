import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTournamentDivisionSwitchPath,
  buildTournamentPath,
  isPositiveTournamentPathId,
  parseTournamentPathname,
  parseTournamentRoute,
  sanitizeTournamentTab,
  sanitizeTournamentView,
} from "../src/lib/navigation/tournamentRoutes.js";

test("parsea rutas legacy con y sin identificador de torneo", () => {
  assert.deepEqual(
    parseTournamentRoute({
      tournamentOrTab: "123",
      tab: "jornadas",
      jornadaId: "456",
    }),
    {
      hasTournamentId: true,
      isTabValid: true,
      jornadaId: "456",
      needsRouteCleanup: true,
      requestedJornadaId: "456",
      requestedTab: "jornadas",
      tab: "jornadas",
      tournamentId: "123",
      viewMode: "list",
    },
  );

  assert.deepEqual(
    parseTournamentRoute({
      tournamentOrTab: "jornadas",
      tab: "456",
    }),
    {
      hasTournamentId: false,
      isTabValid: true,
      jornadaId: "456",
      needsRouteCleanup: true,
      requestedJornadaId: "456",
      requestedTab: "jornadas",
      tab: "jornadas",
      tournamentId: "",
      viewMode: "list",
    },
  );
});

test("jornada solo tiene significado bajo el tab jornadas", () => {
  const standingsRoute = parseTournamentRoute({
    tournamentOrTab: "123",
    tab: "standings",
    jornadaId: "456",
  });
  assert.equal(standingsRoute.tab, "standings");
  assert.equal(standingsRoute.jornadaId, "");
  assert.equal(standingsRoute.needsRouteCleanup, true);

  const invalidRound = parseTournamentRoute({
    tournamentOrTab: "jornadas",
    tab: "no-es-id",
  });
  assert.equal(invalidRound.jornadaId, "");
  assert.equal(invalidRound.needsRouteCleanup, true);
});

test("tabs e identificadores invalidos quedan listos para canonicalizar", () => {
  assert.equal(sanitizeTournamentTab("goleadores"), "goleadores");
  assert.equal(sanitizeTournamentTab("tabla"), "");
  assert.equal(isPositiveTournamentPathId("94"), true);
  assert.equal(isPositiveTournamentPathId("0"), false);
  assert.equal(isPositiveTournamentPathId("-1"), false);

  const invalidTab = parseTournamentRoute({
    tournamentOrTab: "123",
    tab: "tabla",
  });
  assert.equal(invalidTab.tournamentId, "123");
  assert.equal(invalidTab.tab, "");
  assert.equal(invalidTab.isTabValid, false);
  assert.equal(invalidTab.needsRouteCleanup, true);
});

test("construye rutas legacy y canonicas sin jornadas espurias", () => {
  assert.equal(buildTournamentPath(), "/torneos");
  assert.equal(
    buildTournamentPath({ tab: "jornadas", jornadaId: 456 }),
    "/torneos/jornadas/456/list",
  );
  assert.equal(
    buildTournamentPath({
      divisionId: 94,
      tournamentId: 123,
      tab: "jornadas",
      jornadaId: 456,
    }),
    "/division/94/torneos/123/jornadas/456/list",
  );
  assert.equal(
    buildTournamentPath({
      divisionId: 94,
      tournamentId: 123,
      tab: "standings",
      jornadaId: 456,
    }),
    "/division/94/torneos/123/standings",
  );
});

test("deriva los parametros actuales desde el pathname del navegador", () => {
  assert.deepEqual(
    parseTournamentPathname("/division/94/torneos/123/jornadas/456"),
    {
      jornadaId: "456",
      routeDivisionId: "94",
      tab: "jornadas",
      tournamentOrTab: "123",
      view: "",
    },
  );
  assert.deepEqual(parseTournamentPathname("/torneos/goleadores"), {
    jornadaId: "",
    routeDivisionId: "",
    tab: "",
    tournamentOrTab: "goleadores",
    view: "",
  });
  assert.equal(parseTournamentPathname("/division/invalida/torneos"), null);
  assert.equal(parseTournamentPathname("/equipos"), null);
});

test("conserva list y grid al leer, recargar y cambiar de jornada", () => {
  for (const divisionId of [undefined, 94]) {
    for (const tournamentId of [undefined, 123]) {
      for (const viewMode of ["list", "grid"]) {
        const initialPath = buildTournamentPath({
          divisionId,
          tournamentId,
          tab: "jornadas",
          jornadaId: 456,
          viewMode,
        });
        assert.ok(initialPath.endsWith(`/456/${viewMode}`));

        const pathnameRoute = parseTournamentPathname(initialPath);
        const route = parseTournamentRoute(pathnameRoute);
        assert.equal(route.jornadaId, "456");
        assert.equal(route.viewMode, viewMode);
        assert.equal(route.needsRouteCleanup, false);

        const nextPath = buildTournamentPath({
          divisionId: pathnameRoute.routeDivisionId,
          tournamentId: route.tournamentId,
          tab: route.tab,
          jornadaId: 457,
          viewMode: route.viewMode,
        });
        const reloadedRoute = parseTournamentRoute(parseTournamentPathname(nextPath));
        assert.equal(reloadedRoute.jornadaId, "457");
        assert.equal(reloadedRoute.viewMode, viewMode);
        assert.equal(reloadedRoute.needsRouteCleanup, false);
      }
    }
  }
});

test("normaliza las vistas ausentes o invalidas a list", () => {
  assert.equal(sanitizeTournamentView("list"), "list");
  assert.equal(sanitizeTournamentView("grid"), "grid");
  for (const view of [undefined, "", "lista", "GRID", "invalid"]) {
    const route = parseTournamentRoute({
      tournamentOrTab: "123",
      tab: "jornadas",
      jornadaId: "456",
      view,
    });
    assert.equal(route.viewMode, "list");
    assert.equal(route.needsRouteCleanup, true);
    assert.equal(buildTournamentPath({
      tournamentId: route.tournamentId,
      tab: route.tab,
      jornadaId: route.jornadaId,
      viewMode: route.viewMode,
    }), "/torneos/123/jornadas/456/list");
  }
});

test("la vista solo pertenece a jornadas y rechaza segmentos adicionales", () => {
  const route = parseTournamentRoute({
    tournamentOrTab: "123",
    tab: "standings",
    jornadaId: "456",
    view: "grid",
  });
  assert.equal(route.viewMode, "");
  assert.equal(route.needsRouteCleanup, true);
  assert.equal(buildTournamentPath({
    tournamentId: "123",
    tab: "standings",
    jornadaId: 456,
    viewMode: "grid",
  }), "/torneos/123/standings");
  assert.equal(parseTournamentPathname("/torneos/123/jornadas/456/grid/extra"), null);
  assert.equal(parseTournamentRoute(parseTournamentPathname(
    "/torneos/jornadas/456/grid/extra"
  )).needsRouteCleanup, true);
});

test("cambiar division conserva el tab y descarta ids de la division anterior", () => {
  assert.equal(
    buildTournamentDivisionSwitchPath({
      divisionId: 95,
      pathname: "/division/94/torneos/123/jornadas/456",
    }),
    "/division/95/torneos/jornadas",
  );
  assert.equal(
    buildTournamentDivisionSwitchPath({
      divisionId: 95,
      pathname: "/division/94/torneos/123/standings",
    }),
    "/division/95/torneos/standings",
  );
  assert.equal(
    buildTournamentDivisionSwitchPath({
      divisionId: 95,
      pathname: "/division/94/torneos",
    }),
    "/division/95/torneos/definir",
  );
  assert.equal(
    buildTournamentDivisionSwitchPath({
      divisionId: 95,
      pathname: "/equipos",
    }),
    "",
  );
});
