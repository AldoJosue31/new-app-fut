import { expect, test } from "@playwright/test";
import { recoveryTestProfile, recoveryTestUser as user } from "./fixtures/password-recovery-session.mjs";

test.skip(process.env.E2E_AUTH_RECOVERY !== "1", "Run with playwright.auth-recovery.config.js");

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.routeWebSocket("**/realtime/v1/**", (socket) => socket.close());
});

const seedSession = async (context, baseURL, { serverAvailable = false } = {}) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.VITE_APP_SUPABASE_URL) process.loadEnvFile(".env");
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signature = serverAvailable ? "codex-recovery-e2e-available" : "codex-recovery-e2e";
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: user.id, exp: expiresAt, role: "authenticated",
  })}.${signature}`;
  const session = { user, access_token: accessToken, refresh_token: "synthetic-refresh-token",
    expires_at: expiresAt, expires_in: 3600, token_type: "bearer" };
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_APP_SUPABASE_URL)
    .hostname.split(".")[0];
  const name = `sb-${projectRef}-auth-token`;
  await context.addCookies([{ name, value: `base64-${encode(session)}`,
    url: baseURL, sameSite: "Lax", expires: expiresAt + 86400 }]);
  return name;
};

for (const resumeEvent of ["online", "focus"]) {
  test(`recupera una validacion fallida al recibir ${resumeEvent} sin volver al login`, async ({ page, context, baseURL }) => {
    const cookieName = await seedSession(context, baseURL);
    let profileAvailable = false;
    let profileReads = 0;
    await page.route("**/rest/v1/**", async (route) => {
      if (new URL(route.request().url()).pathname === "/rest/v1/profiles") {
        profileReads += 1;
        await route.fulfill({ status: profileAvailable ? 200 : 503,
          headers: { "Retry-After": "0", "Access-Control-Expose-Headers": "Retry-After" }, json: profileAvailable
          ? { ...user, role: "manager", is_suspended: false, metadata: {} }
          : { message: "Service temporarily unavailable", code: "TEMPORARY" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.goto("/configuracion?tab=cuenta", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Estamos recuperando tu sesión")).toBeVisible();
    await expect(page.locator(".contentRouters")).toHaveCount(0);
    expect((await context.cookies()).some((cookie) => cookie.name === cookieName)).toBe(true);
    expect(profileReads).toBeGreaterThan(0);

    await context.setOffline(true);
    profileAvailable = true;
    await context.setOffline(false);
    await page.evaluate((event) => window.dispatchEvent(new Event(event)), resumeEvent);
    await expect(page.locator(".contentRouters")).toBeVisible();
    await expect(page).toHaveURL(/\/configuracion\?tab=cuenta$/);
    await expect(page.getByRole("button", { name: /cerrar sesi[oó]n/i })).toBeVisible();
    expect((await context.cookies()).some((cookie) => cookie.name === cookieName)).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".contentRouters")).toBeVisible();
    await expect(page).toHaveURL(/\/configuracion\?tab=cuenta$/);
  });
}

test("reintenta la sesión si el servidor pierde acceso durante la navegación", async ({
  page, context, baseURL, isMobile,
}) => {
  test.skip(isMobile, "Usa el sidebar visible de escritorio");
  await seedSession(context, baseURL, { serverAvailable: true });

  let profileAvailable = true;
  let failedProfileReads = 0;
  await page.route("**/rest/v1/**", (route) => {
    if (new URL(route.request().url()).pathname !== "/rest/v1/profiles") {
      return route.fulfill({ json: [] });
    }
    if (profileAvailable) return route.fulfill({ json: recoveryTestProfile });
    failedProfileReads += 1;
    return route.fulfill({
      status: 503,
      headers: { "Retry-After": "0", "Access-Control-Expose-Headers": "Retry-After" },
      json: { code: "TEMPORARY", message: "Service temporarily unavailable" },
    });
  });
  await page.route((url) => url.pathname === "/partidos", (route) => {
    const headers = route.request().headers();
    if (headers["next-router-prefetch"] || headers["next-router-segment-prefetch"]) {
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/configuracion", { waitUntil: "domcontentloaded" });
  const content = page.locator(".contentRouters");
  await expect(content.getByText("Configuración", { exact: true })).toBeVisible();

  const documentRequests = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests.push(request.url());
  });
  profileAvailable = false;
  await seedSession(context, baseURL);
  await page.locator('#app-sidebar a[href="/partidos"]').click();
  await expect(page).toHaveURL("/partidos");
  await expect(page.getByText("Estamos recuperando tu sesión")).toBeVisible();
  await expect(content).toHaveCount(0);
  await expect.poll(() => failedProfileReads).toBeGreaterThan(0);

  profileAvailable = true;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(content.getByText("Partidos", { exact: true })).toBeVisible();
  expect(documentRequests).toEqual([]);
});

test("un perfil sin permiso termina solo la sesion local", async ({ page, context, baseURL }) => {
  const cookieName = await seedSession(context, baseURL);
  const scopes = [];
  await page.route("**/rest/v1/profiles**", (route) => route.fulfill({
    json: { ...user, role: "spectator", is_suspended: false },
  }));
  await page.route("**/auth/v1/logout**", (route) => {
    scopes.push(new URL(route.request().url()).searchParams.get("scope"));
    return route.fulfill({ status: 204 });
  });
  await page.goto("/configuracion", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByText("Ingresar").first()).toBeVisible();
  expect(scopes).toEqual(["local"]);
  expect((await context.cookies()).some((cookie) => cookie.name === cookieName)).toBe(false);
});

test("una cuenta suspendida conserva el bloqueo global y muestra su aviso", async ({ page, context, baseURL }) => {
  await seedSession(context, baseURL);
  const scopes = [];
  await page.route("**/rest/v1/profiles**", (route) => route.fulfill({
    json: { ...user, role: "manager", is_suspended: true },
  }));
  await page.route("**/auth/v1/logout**", (route) => {
    scopes.push(new URL(route.request().url()).searchParams.get("scope"));
    return route.fulfill({ status: 204 });
  });
  await page.goto("/configuracion", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Cuenta bloqueada" })).toBeVisible();
  await expect(page.locator(".contentRouters")).toHaveCount(0);
  expect(scopes).toEqual(["global"]);
  await page.getByRole("button", { name: "Regresar al login" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
