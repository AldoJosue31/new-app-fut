import { expect, test } from "@playwright/test";
import {
  createRecoveryTestSession,
  recoveryTestProfile,
  recoveryTestUser,
} from "./fixtures/password-recovery-session.mjs";

test.skip(process.env.E2E_PASSWORD_RECOVERY !== "1", "Use playwright.tournament-views.config.js");

const division = { id: 94, name: "Primera", league_id: 7 };
const league = { id: 7, name: "Liga de prueba", owner_id: recoveryTestUser.id };
const teams = [{ id: 17, name: "Halcones" }, { id: 18, name: "Leones" }];
const jornadas = [456, 457].map((id, index) => ({
  id,
  tournament_id: 123,
  name: `Jornada ${index + 1}`,
  status: index === 0 ? "Confirmada" : "Pendiente",
  start_date: index === 0 ? "2026-10-26" : "2026-11-02",
  end_date: index === 0 ? "2026-11-01" : "2026-11-08",
}));
const matches = jornadas.map((jornada, index) => ({
  id: 91 + index,
  jornada_id: jornada.id,
  team1_id: 17,
  team2_id: 18,
  date: `${jornada.start_date}T10:00:00`,
  status: "Programado",
  jornadas: jornada,
}));
const tournament = {
  id: 123,
  division_id: 94,
  division,
  season: "Apertura de prueba",
  status: "Activo",
  start_date: jornadas[0].start_date,
  config: { participatingIds: [17, 18], jornadaDurationDays: 7, vueltas: "1" },
  jornadas,
};
const roundPath = (jornadaId, view) =>
  `/division/94/torneos/123/jornadas/${jornadaId}/${view}`;

test.beforeEach(async ({ page, context, baseURL }) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.VITE_APP_SUPABASE_URL) {
    process.loadEnvFile(".env");
  }
  const session = createRecoveryTestSession();
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_APP_SUPABASE_URL)
    .hostname.split(".")[0];
  await context.addCookies([{
    name: `sb-${projectRef}-auth-token`,
    value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
    url: baseURL,
    sameSite: "Lax",
    expires: session.expires_at,
  }]);
  await page.addInitScript((selectedDivision) => {
    window.localStorage.setItem("division-storage", JSON.stringify({
      state: { selectedDivision }, version: 0,
    }));
  }, division);
  await page.routeWebSocket("**/realtime/v1/**", (socket) => socket.close());
  await page.route("**/auth/v1/**", (route) => route.fulfill({
    status: new URL(route.request().url()).pathname === "/auth/v1/user" ? 200 : 400,
    json: recoveryTestUser,
  }));
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      return route.fulfill({ status: 400, json: { message: "Unexpected test mutation" } });
    }
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1);
    const object = request.headers().accept?.includes("application/vnd.pgrst.object+json");
    const data = {
      profiles: recoveryTestProfile,
      leagues: object ? league : [league],
      divisions: [division],
      teams,
      jornadas,
      matches,
      tournaments: url.searchParams.has("id") && url.searchParams.get("id").startsWith("neq.")
        ? [] : object ? tournament : [tournament],
    };
    return route.fulfill({ json: data[table] || [] });
  });
  await page.route("**/api/divisions/94/workspace", (route) => route.fulfill({
    json: { division, league, activeTournament: tournament, teams, matches, standings: [] },
  }));
});

const expectMode = async (page, view) => {
  await expect(page.getByTitle("Vista de Lista", { exact: true }))
    .toHaveAttribute("aria-pressed", String(view === "list"));
  await expect(page.getByTitle("Vista de Grilla Semanal", { exact: true }))
    .toHaveAttribute("aria-pressed", String(view === "grid"));
};

const definitionPath = "/division/94/torneos/123/definir";
const playoffTournament = {
  ...tournament,
  config: {
    ...tournament.config,
    zonaLiguilla: true,
    clasificados: 2,
    playoffReseed: false,
    playoffTieBreaker: "penalties",
  },
};
const playedMatch = {
  id: 91,
  jornada_id: jornadas[0].id,
  team1_id: 17,
  team2_id: 18,
  status: "Finalizado",
  goals1: 2,
  goals2: 0,
};
const playoffSnapshot = (activeTournament, tournamentMatches) => ({
  status: activeTournament.status,
  start_date: activeTournament.start_date,
  config: activeTournament.config,
  jornadas: activeTournament.jornadas.map((jornada) => ({
    ...jornada,
    matches: tournamentMatches.filter((match) => match.jornada_id === jornada.id),
  })),
});
const isPlayoffVerification = (request) => request.method() === "GET" &&
  new URL(request.url()).searchParams.get("select")?.includes("matches(");

test("abre los cruces sin consultas y recupera una verificación fallida sin perder ajustes", async ({ page }) => {
  let activeTournament = playoffTournament;
  let tournamentMatches = [playedMatch];
  let verifications = 0;
  const createdRounds = [];
  const createdMatches = [];
  const updates = [];
  let finishFirstVerification;
  const firstVerification = new Promise((resolve) => { finishFirstVerification = resolve; });

  await page.route("**/api/divisions/94/workspace", (route) => route.fulfill({
    json: { division, league, activeTournament, teams, matches: tournamentMatches, standings: [] },
  }));
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const table = new URL(request.url()).pathname.split("/").at(-1);
    if (table === "tournaments" && isPlayoffVerification(request)) {
      verifications += 1;
      if (verifications === 1) {
        await firstVerification;
        return route.fulfill({ status: 500, json: { code: "57014", message: "Statement timeout" } });
      }
      return route.fulfill({ json: playoffSnapshot(activeTournament, tournamentMatches) });
    }
    if (table === "jornadas" && request.method() === "POST") {
      createdRounds.push(...request.postDataJSON().map((round, index) => ({ ...round, id: 500 + index })));
      return route.fulfill({ status: 201, json: createdRounds });
    }
    if (table === "matches" && request.method() === "POST") {
      createdMatches.push(...request.postDataJSON());
      return route.fulfill({ status: 201, json: createdMatches });
    }
    if (table === "tournaments" && request.method() === "PATCH") {
      const update = request.postDataJSON();
      updates.push(update);
      activeTournament = { ...activeTournament, ...update, jornadas: [...activeTournament.jornadas, ...createdRounds] };
      tournamentMatches = [...tournamentMatches, ...createdMatches.map((match, index) => ({ ...match, id: 600 + index }))];
      return route.fulfill({ status: 204 });
    }
    return route.fallback();
  });

  await page.goto(definitionPath);
  const repeatedReads = [];
  const documentRequests = [];
  page.on("request", (request) => {
    const { pathname, searchParams } = new URL(request.url());
    // The scorers tab loads its own ID-only lookups in the background.
    const isScorerLookup = ["id,division_id", "id,tournament_id", "id,jornada_id"].includes(searchParams.get("select"));
    if (request.method() === "GET" && !isScorerLookup && /\/rest\/v1\/(tournaments|jornadas|matches)$/.test(pathname)) {
      repeatedReads.push(pathname);
    }
    if (request.resourceType() === "document") documentRequests.push(pathname);
  });
  await page.getByRole("button", { name: "Avanzar de fase" }).click();
  await expect(page.getByRole("heading", { name: "Faltan resultados antes de avanzar" })).toBeVisible();
  await page.getByRole("button", { name: "Avanzar de todos modos" }).click();
  const previewTitle = page.getByRole("heading", { name: "Avanzar a Final", exact: true });
  await expect(previewTitle).toBeVisible();
  expect(repeatedReads).toEqual([]);

  const legs = page.locator("label")
    .filter({ has: page.getByText("Final", { exact: true }) })
    .getByRole("combobox");
  await expect(page.getByLabel("Resiembra")).toHaveValue("no");
  await expect(page.getByLabel("Empate global")).toHaveValue("penalties");
  await expect(legs).toBeVisible();
  await legs.selectOption("double");

  try {
    await page.getByRole("button", { name: "Confirmar cruces" }).click();
    await expect(page.getByRole("button", { name: "Verificando resultados..." })).toBeDisabled();
    await expect.poll(() => verifications).toBe(1);
    expect(createdRounds).toEqual([]);
  } finally {
    finishFirstVerification();
  }

  await expect(page.getByRole("alert").filter({ hasText: "No se pudieron verificar los resultados" })).toBeVisible();
  await expect(previewTitle).toBeVisible();
  await expect(legs).toHaveValue("double");
  expect(createdRounds).toEqual([]);
  await page.getByRole("button", { name: "Reintentar verificación" }).click();
  await expect(previewTitle).toBeHidden();
  expect(verifications).toBe(2);
  expect(documentRequests).toEqual([]);
  expect(createdRounds.map(({ name }) => name)).toEqual(["Final (ida)", "Final (vuelta)"]);
  expect(createdMatches.map(({ jornada_id, team1_id, team2_id }) =>
    [jornada_id, team1_id, team2_id])).toEqual([[500, 17, 18], [501, 18, 17]]);
  expect(updates).toHaveLength(1);
  expect(updates[0].config).toMatchObject({
    playoffReseed: false,
    playoffTieBreaker: "penalties",
    playoffLegsFinal: "double",
    playoffState: { currentPhaseKey: "final" },
  });
  await expect(page.getByRole("button", { name: "Avanzar de fase" })).toBeDisabled();
});

test("pide revisar los cruces si cambiaron los resultados antes de confirmar", async ({ page }) => {
  const activeTournament = { ...playoffTournament, jornadas: [jornadas[0]] };
  const changedMatch = { ...playedMatch, goals1: 0, goals2: 2 };
  const mutations = [];
  await page.route("**/api/divisions/94/workspace", (route) => route.fulfill({
    json: { division, league, activeTournament, teams, matches: [playedMatch], standings: [] },
  }));
  await page.route("**/rest/v1/**", (route) => {
    const request = route.request();
    if (isPlayoffVerification(request)) {
      return route.fulfill({ json: playoffSnapshot(activeTournament, [changedMatch]) });
    }
    if (request.method() !== "GET") mutations.push(request.method());
    return route.fallback();
  });

  await page.goto(definitionPath);
  const topSeed = page.locator('[draggable="true"]').filter({ hasText: "#1" });
  await page.getByRole("button", { name: "Avanzar de fase" }).click();
  await expect(topSeed).toContainText("Halcones");
  await page.getByRole("button", { name: "Confirmar cruces" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Revisa los cruces actualizados" })).toBeVisible();
  await expect(topSeed).toContainText("Leones");
  await expect(page.getByRole("button", { name: "Confirmar cruces" })).toBeEnabled();
  expect(mutations).toEqual([]);
});

test("Editar reutiliza los partidos cargados y conserva el borrador de la jornada", async ({ page, isMobile }) => {
  await page.goto(roundPath(457, "list"));
  if (isMobile) await page.getByRole("button", { name: "Mostrar controles" }).click();

  const weekStart = page.getByLabel("Inicio de semana");
  await weekStart.fill("2026-11-04");
  const originalInput = await weekStart.elementHandle();
  let repeatedReads = 0;
  await page.route("**/rest/v1/matches?**", (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("jornadas.tournament_id") !== "eq.123") return route.fallback();

    repeatedReads += 1;
    return route.fulfill({ status: 503, json: { message: "Consulta duplicada" } });
  });

  await page.getByRole("button", { name: "Reorganizar partidos futuros" }).click();
  await expect(page.getByRole("heading", { name: "Reorganizar Calendario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar Cambios" })).toBeVisible();
  expect(repeatedReads).toBe(0);
  expect(await weekStart.evaluate((input, previous) => input === previous, originalInput)).toBe(true);

  await page.getByRole("button", { name: "Cerrar ventana" }).click();
  await expect(weekStart).toHaveValue("2026-11-04");
});

test("Liga cambia las cuatro pestañas sin recargar ni volver a pedir sus datos", async ({ page }) => {
  const tabs = page.getByRole("tablist", { name: "Vistas de la liga" });
  const tab = (label) => tabs.getByTitle(label, { exact: true });
  const leagueName = page.getByLabel("Nombre Oficial");
  await page.goto("/liga");
  await expect(leagueName).toHaveValue(league.name);

  const requests = [];
  const recordRequest = (request) => {
    const { pathname } = new URL(request.url());
    if (
      request.resourceType() === "document" ||
      pathname === "/rest/v1/leagues" ||
      (pathname.startsWith("/liga/") && request.headers().rsc === "1")
    ) {
      requests.push(pathname);
    }
  };
  page.on("request", recordRequest);

  for (const [label, path, content] of [
    ["Plantilla Reglas", "/liga/rules", page.getByLabel("Mínimo de Jugadores")],
    ["Divisiones", "/liga/divisions", page.getByText("Estructura de la Liga", { exact: true })],
    ["Árbitros", "/liga/referees", page.getByText("Nuevo Árbitro", { exact: true })],
    ["Configuración", "/liga/general", leagueName],
  ]) {
    await tab(label).click();
    await expect(page).toHaveURL(path);
    await expect(tab(label)).toHaveAttribute("aria-selected", "true");
    await expect(content).toBeVisible();
  }

  await page.goBack();
  await expect(page).toHaveURL("/liga/referees");
  await expect(tab("Árbitros")).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(page).toHaveURL("/liga/general");
  await expect(leagueName).toHaveValue(league.name);

  await leagueName.fill("Nombre de borrador");
  await tab("Plantilla Reglas").click();
  await expect(page.getByLabel("Mínimo de Jugadores")).toBeVisible();
  await page.goBack();
  await expect(leagueName).toHaveValue("Nombre de borrador");
  await leagueName.fill(league.name);

  expect(requests).toEqual([]);
  page.off("request", recordRequest);

  await page.goBack();
  await page.reload();
  await expect(page).toHaveURL("/liga/referees");
  await expect(tab("Árbitros")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Nuevo Árbitro", { exact: true })).toBeVisible();
});

test("navegar desde el sidebar conserva la vista hasta que llega la siguiente", async ({ page, isMobile }) => {
  test.skip(isMobile, "Usa los enlaces visibles del sidebar de escritorio");

  const expectView = expect.configure({ timeout: 15_000 });
  const content = page.locator(".contentRouters");
  const settingsTitle = content.getByText("Configuración", { exact: true });
  const matchesTitle = content.getByText("Partidos", { exact: true });
  const teamsPath = "/division/94/equipos";
  const sidebarLink = (path) => page.locator(`#app-sidebar a[href="${path}"]`);
  let releaseRoute;
  let requestedRoute = false;
  const pendingRoute = new Promise((resolve) => { releaseRoute = resolve; });

  await page.route((url) => url.pathname === "/partidos", async (route) => {
    if (route.request().headers().rsc === "1") {
      requestedRoute = true;
      await pendingRoute;
    }
    await route.continue();
  });
  await page.goto("/configuracion", { waitUntil: "domcontentloaded" });
  await expectView(settingsTitle).toBeVisible();

  const documentRequests = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests.push(request.url());
  });
  await page.evaluate(() => {
    const navigation = { loadingScreens: 0, framesWithoutView: 0 };
    window.sidebarNavigation = navigation;
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element && (
            node.matches("[data-loading-screen]") ||
            node.querySelector("[data-loading-screen]")
          )) {
            navigation.loadingScreens += 1;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });

    const checkView = () => {
      if (!document.querySelector(".contentRouters")) navigation.framesWithoutView += 1;
      window.requestAnimationFrame(checkView);
    };
    window.requestAnimationFrame(checkView);
  });

  try {
    await sidebarLink("/partidos").click();
    await expectView.poll(() => requestedRoute).toBe(true);
    await expect(settingsTitle).toBeVisible();
  } finally {
    releaseRoute();
  }
  await expectView(page).toHaveURL("/partidos");
  await expectView(matchesTitle).toBeVisible();

  await sidebarLink(teamsPath).click();
  await expectView(page).toHaveURL(teamsPath);
  await expectView(sidebarLink(teamsPath)).toHaveAttribute("aria-current", "page");
  await expectView(content.getByText("Equipos", { exact: true }).first()).toBeVisible();

  await page.goBack();
  await expectView(page).toHaveURL("/partidos");
  await expectView(matchesTitle).toBeVisible();
  expect(documentRequests).toEqual([]);
  expect(await page.evaluate(() => window.sidebarNavigation))
    .toEqual({ loadingScreens: 0, framesWithoutView: 0 });
});

test("el sidebar móvil llena la pantalla y mantiene el scroll de la página", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Usa el menú móvil y una pantalla más baja que el panel");
  await page.setViewportSize({ width: 390, height: 430 });
  await page.goto("/configuracion");

  const sidebar = page.locator("#app-sidebar");
  const trigger = page.getByRole("button", { name: "Abrir menú" });
  const scrollPage = () => page.evaluate(() => window.scrollY);

  await expect(trigger).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 80));
  await expect.poll(scrollPage).toBe(80);
  await trigger.evaluate((button) => button.click());

  await expect(sidebar).toHaveAttribute("data-open", "true");
  await expect(page.locator("html")).toHaveCSS("overflow-y", "hidden");
  await expect.poll(() => sidebar.evaluate((panel) => {
    const bounds = panel.getBoundingClientRect();
    return Math.max(Math.abs(bounds.top), Math.abs(bounds.bottom - window.visualViewport.height));
  })).toBeLessThanOrEqual(1);

  await page.mouse.move(100, 200);
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => sidebar.evaluate((panel) => panel.scrollTop)).toBeGreaterThan(0);
  await page.mouse.wheel(0, 1000);
  await page.mouse.move(350, 200);
  await page.mouse.wheel(0, 1000);
  expect(await scrollPage()).toBe(80);

  await page.touchscreen.tap(350, 200);
  await expect(sidebar).toBeHidden();
  expect(await scrollPage()).toBe(80);
  await page.mouse.wheel(0, 1000);
  await expect.poll(scrollPage).toBeGreaterThan(80);
});

test("grid sobrevive a recarga, cambio de jornada e historial", async ({ page }) => {
  await page.goto(roundPath(456, "grid"));
  await expectMode(page, "grid");
  await expect(page.getByRole("button", { name: "Exportar rol", exact: true })).toBeVisible();
  await page.reload();
  await expectMode(page, "grid");

  await page.getByRole("button", { name: "Seleccionar jornada", exact: true }).click();
  await page.getByRole("option", { name: /Jornada 2/ }).click();
  await expect(page).toHaveURL(roundPath(457, "grid"));
  await expectMode(page, "grid");
  await page.reload();
  await expectMode(page, "grid");
  await page.goBack();
  await expect(page).toHaveURL(roundPath(456, "grid"));
  await expectMode(page, "grid");
  await page.goForward();
  await expect(page).toHaveURL(roundPath(457, "grid"));
  await expectMode(page, "grid");
});

test("el selector cambia la URL y restaura la vista sin recargar el documento", async ({ page, isMobile }) => {
  await page.goto(roundPath(456, "list"));
  await expectMode(page, "list");
  if (isMobile) {
    await page.getByRole("button", { name: "Mostrar controles", exact: true }).click();
  }
  const documentRequests = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests.push(request.url());
  });
  await page.getByTitle("Vista de Grilla Semanal", { exact: true }).click();
  await expect(page).toHaveURL(roundPath(456, "grid"));
  await expectMode(page, "grid");
  await page.getByTitle("Vista de Lista", { exact: true }).click();
  await expect(page).toHaveURL(roundPath(456, "list"));
  await expectMode(page, "list");
  await page.goBack();
  await expectMode(page, "grid");
  await page.goForward();
  await expectMode(page, "list");
  expect(documentRequests).toEqual([]);
});

test("los enlaces existentes y las vistas invalidas abren list", async ({ page }) => {
  for (const pathname of [
    "/division/94/torneos/123/jornadas/456",
    roundPath(456, "invalid"),
    "/torneos/123/jornadas/456/list",
  ]) {
    await page.goto(pathname);
    await expect(page).toHaveURL(roundPath(456, "list"));
    await expectMode(page, "list");
  }
});

test("list conserva el borrador al alternar vistas, cambiar jornada y recargar", async ({ page, isMobile }) => {
  await page.goto(roundPath(457, "list"));
  const timeInput = page.getByLabel("Hora del partido", { exact: true });
  await timeInput.fill("11:30");
  await expect(timeInput).toHaveValue("11:30");
  if (isMobile) {
    await page.getByRole("button", { name: "Mostrar controles", exact: true }).click();
  }
  await page.getByTitle("Vista de Grilla Semanal", { exact: true }).click();
  await expectMode(page, "grid");
  await page.getByTitle("Vista de Lista", { exact: true }).click();
  await expect(timeInput).toHaveValue("11:30");

  await page.getByRole("button", { name: "Seleccionar jornada", exact: true }).click();
  await page.getByRole("option", { name: /Jornada 1/ }).click();
  await expect(page).toHaveURL(roundPath(456, "list"));
  await expectMode(page, "list");
  await page.getByRole("button", { name: "Seleccionar jornada", exact: true }).click();
  await page.getByRole("option", { name: /Jornada 2/ }).click();
  await expect(page).toHaveURL(roundPath(457, "list"));
  await expect(timeInput).toHaveValue("11:30");
  await page.reload();
  await expectMode(page, "list");
  await expect(timeInput).toHaveValue("11:30");
});

const mockExternalSchedule = async (page, { holdMatches = false } = {}) => {
  const queries = [];
  let release;
  const gate = holdMatches ? new Promise((resolve) => { release = resolve; }) : Promise.resolve();
  const externalDivision = { id: 95, name: "Segunda", league_id: 7 };
  const externalTournament = { id: 124, division_id: 95 };
  const externalJornada = { id: 458, name: "Jornada 1", tournament_id: 124 };
  const externalTeams = [{ id: 51, name: "Tigres" }, { id: 52, name: "Lobos" }];
  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").at(-1);
    const columns = url.searchParams.get("select");
    let data;
    if (table === "divisions" && columns === "id,name") data = [division, externalDivision];
    if (table === "tournaments" && columns === "id,division_id,status") data = [externalTournament];
    if (table === "jornadas" && columns === "id,name,tournament_id") data = [externalJornada];
    if (table === "teams" && columns === "id,name,logo_url") data = externalTeams;
    if (table === "matches" && url.searchParams.has("gte")) {
      throw new Error("Date filter must be scoped to date");
    }
    if (table === "matches" && columns === "id,date,status,jornada_id,team1_id,team2_id,goals1,goals2") {
      queries.push({ table, filters: url.searchParams.toString() });
      await gate;
      const start = url.searchParams.getAll("date").find((filter) => filter.startsWith("gte."))
        .slice(4, 14);
      data = [{
        id: 93, jornada_id: 458, team1_id: 51, team2_id: 52,
        date: `${start} 12:00:00`, status: "Finalizado", goals1: 2, goals2: 1,
      }];
    } else if (data !== undefined) {
      queries.push({ table, filters: url.searchParams.toString() });
    }
    if (data === undefined) return route.fallback();
    return route.fulfill({ json: data });
  });
  return { queries, release: () => release?.() };
};

test("los externos se reutilizan al reactivar y volver a una jornada reciente", async ({ page }) => {
  const { queries } = await mockExternalSchedule(page);
  await page.goto(roundPath(456, "grid"));
  await expect(page.getByText("Tigres", { exact: true })).toBeVisible();
  expect(queries.map(({ table }) => table)).toEqual(["divisions", "tournaments", "jornadas", "matches", "teams"]);
  const matchQuery = new URLSearchParams(queries[3].filters);
  expect(matchQuery.getAll("date")).toEqual(["gte.2026-10-26 00:00:00", "lte.2026-11-01 23:59:59"]);

  await page.getByRole("button", { name: "Ocultar partidos de otras divisiones", exact: true }).click();
  await expect(page.getByText("Tigres", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver partidos de otras divisiones", exact: true }).click();
  await expect(page.getByText("Tigres", { exact: true })).toBeVisible();
  expect(queries).toHaveLength(5);

  await page.getByRole("button", { name: "Seleccionar jornada", exact: true }).click();
  await page.getByRole("option", { name: /Jornada 2/ }).click();
  await expect(page).toHaveURL(roundPath(457, "grid"));
  await expect(page.getByText("Tigres", { exact: true })).toBeVisible();
  expect(queries.map(({ table }) => table)).toEqual(["divisions", "tournaments", "jornadas", "matches", "teams", "matches"]);
  await page.goBack();
  await expect(page).toHaveURL(roundPath(456, "grid"));
  await expect(page.getByText("Tigres", { exact: true })).toBeVisible();
  expect(queries).toHaveLength(6);
});

test("ocultar durante la carga cancela la espera y reactivar muestra los externos", async ({ page }) => {
  const { queries, release } = await mockExternalSchedule(page, { holdMatches: true });
  await page.goto(roundPath(456, "grid"));
  await expect.poll(() => queries.some(({ table }) => table === "matches")).toBe(true);
  await page.getByRole("button", { name: /Ocultar partidos de otras divisiones/ }).click();
  await expect(page.getByText("Tigres", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver partidos de otras divisiones", exact: true }).click();
  release();
  await expect(page.getByText("Tigres", { exact: true })).toBeVisible();
  expect(queries.filter(({ table }) => table === "divisions")).toHaveLength(1);
});

test("el marcador conserva ceros, muestra resultados externos y distingue partidos sin resultado", async ({ page }) => {
  await mockExternalSchedule(page);
  await page.route("**/rest/v1/matches**", (route) => {
    const columns = new URL(route.request().url()).searchParams.get("select") || "";
    if (!columns.startsWith("*")) return route.fallback();
    return route.fulfill({ json: matches.map((match, index) => index === 0
      ? { ...match, status: "Finalizado", goals1: 0, goals2: 0 }
      : match) });
  });
  await page.goto(roundPath(456, "grid"));
  await expect(page.getByRole("group", { name: "Goles de Halcones", exact: true })).toHaveText("0");
  await expect(page.getByRole("group", { name: "Goles de Leones", exact: true })).toHaveText("0");
  await expect(page.getByRole("group", { name: "Goles de Tigres", exact: true })).toHaveText("2");
  await expect(page.getByRole("group", { name: "Goles de Lobos", exact: true })).toHaveText("1");
  await page.getByRole("button", { name: "Seleccionar jornada", exact: true }).click();
  await page.getByRole("option", { name: /Jornada 2/ }).click();
  const homeScore = page.getByRole("group", { name: "Goles de Halcones", exact: true });
  const awayScore = page.getByRole("group", { name: "Goles de Leones", exact: true });
  await expect(homeScore).toContainText("Sin resultado");
  await expect(awayScore).toContainText("Sin resultado");
  await expect(homeScore.locator('[aria-hidden="true"]')).toHaveText("—");
  await expect(awayScore.locator('[aria-hidden="true"]')).toHaveText("—");
  await expect(page.getByText("Borrador", { exact: true })).toBeVisible();
});
