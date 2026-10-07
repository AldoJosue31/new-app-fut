import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { recoveryTestUser, recoveryTestProfile } from "./fixtures/password-recovery-session.mjs";

test.skip(process.env.E2E_PASSWORD_RECOVERY !== "1", "Use playwright.password-recovery.config.js");

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/auth/v1/recover") return route.fulfill({ json: {} });
    if (pathname === "/auth/v1/user") return route.fulfill({ json: recoveryTestUser });
    if (pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
    if (pathname.endsWith("/jwks.json")) return route.fulfill({ json: { keys: [] } });
    // Never let a test send other authentication mutations to the live project.
    return route.fulfill({ status: 400, json: { code: "test_unexpected_request", message: "Unexpected test request" } });
  });
  await page.route("**/rest/v1/**", (route) => route.fulfill({ json:
    new URL(route.request().url()).pathname === "/rest/v1/profiles" ? recoveryTestProfile : [],
  }));
});

const openRequest = async (page) => {
  await page.goto("/login?recovery=1");
  await expect(page.getByRole("heading", { name: "Recupera tu acceso" })).toBeVisible();
};
const openReset = async (page, suffix = "valid") => {
  await page.goto(`/auth/confirm?token_hash=password-recovery-e2e-${suffix}&type=recovery`);
  await expect(page).toHaveURL(/\/restablecer-contrasena/);
};

test("el login conserva el correo y valida antes de solicitar un enlace", async ({ page }) => {
  let sends = 0;
  await page.route("**/auth/v1/recover**", (route) => { sends++; return route.fulfill({ json: {} }); });
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("Liga@League.example.invalid");
  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
  const email = page.getByRole("textbox", { name: "Correo electrónico" });
  await expect(email).toHaveValue("Liga@League.example.invalid");
  await email.fill("correo-invalido");
  await page.getByRole("button", { name: "Enviar enlace", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Ingresa un correo electrónico válido.");
  await expect(email).toBeFocused();
  expect(sends).toBe(0);
  await email.fill("Liga@League.example.invalid");
  await page.getByRole("button", { name: "Volver a ingresar" }).click();
  await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toHaveValue("Liga@League.example.invalid");
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
});

test("normaliza el correo, evita duplicados y permite reenviar después de la espera", async ({ page }) => {
  await page.clock.install();
  let sends = 0;
  let payload;
  let redirect;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route("**/auth/v1/recover**", async (route) => {
    sends++; payload = route.request().postDataJSON();
    redirect = new URL(new URL(route.request().url()).searchParams.get("redirect_to"));
    if (sends === 1) await gate;
    await route.fulfill({ json: {} });
  });
  await openRequest(page);
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("  MANAGER@League.example.invalid  ");
  await page.getByRole("button", { name: "Enviar enlace", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enviando…" })).toBeDisabled();
  await expect.poll(() => sends).toBe(1);
  await page.locator("form").evaluate((form) => form.requestSubmit());
  expect(sends).toBe(1);
  release();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Si existe una cuenta");
  expect(payload.email).toBe("manager@league.example.invalid");
  expect(payload.code_challenge).toBeTruthy();
  expect(redirect.pathname).toBe("/auth/confirm");
  expect(redirect.searchParams.get("next")).toBe("/restablecer-contrasena");
  await expect(page.getByRole("button", { name: /Reenviar en/ })).toBeDisabled();
  await page.clock.fastForward(61_000);
  await page.getByRole("button", { name: "Reenviar enlace", exact: true }).click();
  await expect.poll(() => sends).toBe(2);
});

test("un límite de envío tiene mensaje y espera; una falla de conexión permite reintentar", async ({ page }) => {
  await page.clock.install();
  let sends = 0;
  await page.route("**/auth/v1/recover**", (route) => {
    sends++;
    if (sends === 1) return route.fulfill({ status: 429, json: { code: "over_email_send_rate_limit", msg: "rate limit" } });
    if (sends === 2) return route.abort("failed");
    return route.fulfill({ json: {} });
  });
  await openRequest(page);
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("manager@league.example.invalid");
  await page.getByRole("button", { name: "Enviar enlace", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Hay demasiados intentos");
  await expect(page.getByRole("button", { name: /Enviar en/ })).toBeDisabled();
  await page.clock.fastForward(61_000);
  await page.getByRole("button", { name: "Enviar enlace", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("conexión");
  await page.getByRole("button", { name: "Enviar enlace", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
});

test("un enlace vencido y el acceso directo sin sesión ofrecen otra solicitud", async ({ page }) => {
  await page.goto("/restablecer-contrasena");
  await expect(page.getByRole("heading", { name: "Necesitas un nuevo enlace" })).toBeVisible();
  await expect(page.getByLabel("Nueva contraseña", { exact: true })).toHaveCount(0);
  await openReset(page, "expired");
  await expect(page).toHaveURL(/\?error=invalid_link$/);
  await page.getByRole("link", { name: /Solicitar nuevo enlace/ }).click();
  await expect(page.getByRole("heading", { name: "Recupera tu acceso" })).toBeVisible();
});

test("un hash abre el formulario en otro navegador; valida, guarda y cierra la sesión", async ({ page, context }) => {
  // No verifier or session is seeded: this exercises the cross-device token-hash path.
  let savedPassword;
  await page.route("**/auth/v1/user", (route) => {
    if (route.request().method() === "PUT") savedPassword = route.request().postDataJSON().password;
    return route.fulfill({ json: recoveryTestUser });
  });
  await openReset(page);
  await expect(page).toHaveURL((url) => url.hostname === "127.0.0.1" && url.pathname === "/restablecer-contrasena");
  await expect(page).toHaveURL(/\/restablecer-contrasena$/);
  const password = page.getByLabel("Nueva contraseña", { exact: true });
  const confirmation = page.getByLabel("Confirmar contraseña", { exact: true });
  await password.fill("corta"); await confirmation.fill("corta");
  await page.getByRole("button", { name: "Guardar contraseña", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("8 caracteres");
  await password.fill("Liga segura 2026!"); await confirmation.fill("Otra clave 2026!");
  await page.getByRole("button", { name: "Guardar contraseña", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("no coinciden");
  await page.getByRole("button", { name: "Mostrar nueva contraseña", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar nueva contraseña", exact: true }).click();
  await confirmation.fill("Liga segura 2026!");
  await page.getByRole("button", { name: "Guardar contraseña", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Contraseña actualizada" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ingresar", exact: true })).toBeEnabled();
  expect(savedPassword).toBe("Liga segura 2026!");
  const cookies = await context.cookies();
  expect(cookies.filter((cookie) => /-auth-token(?:\.\d+)?$/.test(cookie.name))).toEqual([]);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toBeVisible();
});

test("la plantilla predeterminada usa el verificador PKCE creado al pedir el correo", async ({ page }) => {
  await openRequest(page);
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("manager@league.example.invalid");
  await page.getByRole("button", { name: "Enviar enlace", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  await page.goto("/auth/confirm?code=password-recovery-e2e-pkce");
  await expect(page.getByRole("heading", { name: "Elige tu nueva contraseña" })).toBeVisible();
});

test("una sesión vencida al guardar permite solicitar otro enlace aun con cookies previas", async ({ page }) => {
  await openReset(page);
  await page.route("**/auth/v1/user", (route) => route.request().method() === "PUT"
    ? route.fulfill({ status: 401, json: { code: "session_not_found", msg: "Expired session" } })
    : route.fulfill({ json: recoveryTestUser }));
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Liga segura 2026!");
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("Liga segura 2026!");
  await page.getByRole("button", { name: "Guardar contraseña", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Necesitas un nuevo enlace" })).toBeVisible();
  await page.getByRole("link", { name: /Solicitar nuevo enlace/ }).click();
  await expect(page.getByRole("heading", { name: "Recupera tu acceso" })).toBeVisible();
});

test("si falla cerrar sesión, la contraseña sigue confirmada y la salida se puede reintentar", async ({ page }) => {
  let logouts = 0;
  await page.route("**/auth/v1/logout**", (route) => {
    logouts++;
    return logouts === 1
      ? route.fulfill({ status: 503, json: { code: "unexpected_failure", msg: "Unavailable" } })
      : route.fulfill({ status: 204 });
  });
  await openReset(page);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Liga segura 2026!");
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("Liga segura 2026!");
  await page.getByRole("button", { name: "Guardar contraseña", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Contraseña actualizada" })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText("No pudimos cerrar la sesión");
  await page.getByRole("button", { name: "Cerrar sesión e ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("una contraseña rechazada por Supabase conserva el formulario y permite corregirla", async ({ page }) => {
  await openReset(page);
  await page.route("**/auth/v1/user", (route) => route.request().method() === "PUT"
    ? route.fulfill({
      status: 422,
      headers: { "x-supabase-api-version": "2024-01-01" },
      json: { code: "weak_password", msg: "Weak password", weak_password: { reasons: ["length"] } },
    })
    : route.fulfill({ json: recoveryTestUser }));
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("12345678");
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("12345678");
  await page.getByRole("button", { name: "Guardar contraseña", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("más segura");
  await expect(page.getByLabel("Nueva contraseña", { exact: true })).toHaveValue("12345678");
});

for (const theme of ["light", "dark"]) test.describe(`diseño ${theme}`, () => {
  test.use({ colorScheme: theme, reducedMotion: "reduce" });
  test("captura los estados con foco visible y sin desbordamiento", async ({ page }, testInfo) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const size = testInfo.project.name === "mobile-chromium" ? "mobile" : "desktop";
    const dir = path.resolve(".impeccable/review");
    await mkdir(dir, { recursive: true });
    const capture = async (state) => {
      await page.evaluate(() => document.fonts.ready);
      const loadedFontWeights = await page.evaluate(() => Array.from(document.fonts)
        .filter((font) => font.status === "loaded" && !font.family.includes("Fallback"))
        .map((font) => font.weight));
      expect(loadedFontWeights).toEqual(expect.arrayContaining(["400", "600", "700"]));
      const dimensions = await page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.width);
      const name = state === "request" && theme === "light" ? size : `${state}-${size}-${theme}`;
      await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
    };
    await openRequest(page);
    await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toBeFocused();
    await capture("request");
    await page.getByRole("textbox", { name: "Correo electrónico" }).fill("manager@league.example.invalid");
    await page.getByRole("button", { name: "Enviar enlace", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
    await capture("sent");
    await openReset(page, "expired");
    await expect(page.getByRole("heading", { name: "Necesitas un nuevo enlace" })).toBeVisible();
    await capture("invalid");
    await openReset(page);
    await expect(page.getByRole("heading", { name: "Elige tu nueva contraseña" })).toBeVisible();
    await capture("reset");
    expect(pageErrors).toEqual([]);
  });
});
