import { expect, test } from "@playwright/test";

const publicRoutes = [
  {
    pathname: "/",
    expectedText: /Gestiona tu liga de fútbol/i,
  },
  {
    pathname: "/landing",
    expectedText: /Gestiona tu liga de fútbol/i,
  },
  {
    pathname: "/login",
    expectedText: /Ingresar/i,
  },
  {
    pathname: "/share/standings/invalido",
    expectedText: /No pudimos encontrar el torneo/i,
  },
  {
    pathname: "/invitation/invalido",
    expectedText: /El enlace esta incompleto/i,
  },
  {
    pathname: "/delegate/invitation/invalido",
    expectedText: /El enlace esta incompleto/i,
  },
];

for (const route of publicRoutes) {
  test(`${route.pathname} supports direct navigation`, async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const serverErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    page.on("response", (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto(route.pathname, {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    const expectedText =
      ["/", "/landing"].includes(route.pathname)
        ? /Gestiona tu liga/i
        : route.expectedText;
    await expect(page.getByText(expectedText).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("#modal-root")).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(() => window.getComputedStyle(document.body).backgroundColor),
      )
      .toMatch(/rgb\(237, 243, 251\)|rgb\(19, 31, 36\)/);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(expectedText).first()).toBeVisible({
      timeout: 30_000,
    });

    const hydrationOrStyleErrors = consoleErrors.filter((message) =>
      /hydration|hydrated|server-rendered html|did not match|styled-components/i.test(
        message,
      ),
    );
    expect(hydrationOrStyleErrors).toEqual([]);

    if (
      route.pathname === "/landing" &&
      (await page.evaluate(() => window.innerWidth <= 900))
    ) {
      const menuButton = page.getByRole("button", {
        name: "Menú",
        exact: true,
      });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(
        page.getByRole("button", {
          name: "Cerrar menú",
          exact: true,
        }),
      ).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByRole("navigation", {
          name: "Navegación móvil",
          exact: true,
        }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    }
  });
}

test("unknown routes render the application 404", async ({ page }) => {
  const pageErrors = [];
  const serverErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto("/ruta-que-no-existe-m11", {
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", {
      name: "Pagina no encontrada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.locator("#modal-root")).toHaveCount(1);
  expect(pageErrors).toEqual([]);
  expect(serverErrors).toEqual([]);

  const reloadResponse = await page.reload({
    waitUntil: "domcontentloaded",
  });
  expect(reloadResponse?.status()).toBe(404);
  await expect(
    page.getByRole("heading", {
      name: "Pagina no encontrada",
      exact: true,
    }),
  ).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({
    contextOptions: {
      reducedMotion: "reduce",
    },
  });

  test("landing disables decorative motion", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const response = await page.goto("/landing", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
      )
      .toBe(true);

    const reveal = page.locator(".landing-scope .lp-reveal").first();
    await expect(reveal).toBeVisible();
    const motionStyles = await reveal.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        animationName: styles.animationName,
        opacity: styles.opacity,
        transform: styles.transform,
        transitionDuration: styles.transitionDuration,
      };
    });

    expect(motionStyles).toEqual({
      animationName: "none",
      opacity: "1",
      transform: "none",
      transitionDuration: "0s",
    });
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              Boolean(
                window.__BRACKET_CLIENT_INSTRUMENTATION_INSTALLED__,
              ),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              Array.isArray(window.__BRACKET_WEB_VITALS__) &&
              window.__BRACKET_WEB_VITALS__.some(
                (metric) => metric.name === "TTFB",
              ),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
    const bufferedClientErrors = await page.evaluate(
      () => window.__BRACKET_CLIENT_ERRORS__ || [],
    );
    expect(bufferedClientErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
