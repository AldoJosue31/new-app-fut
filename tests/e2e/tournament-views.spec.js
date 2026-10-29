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
    if (table === "matches" && columns === "id,date,status,jornada_id,team1_id,team2_id") {
      queries.push({ table, filters: url.searchParams.toString() });
      await gate;
      const start = url.searchParams.getAll("date").find((filter) => filter.startsWith("gte."))
        .slice(4, 14);
      data = [{
        id: 93, jornada_id: 458, team1_id: 51, team2_id: 52,
        date: `${start} 12:00:00`, status: "Programado",
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
