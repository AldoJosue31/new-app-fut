import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
  });
});

test("login muestra una sola notificación global, legible y sobre los modales", async ({
  page,
}) => {
  const pageErrors = [];
  const serverErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto("/login", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  const submitButton = page.getByRole("button", { name: "Ingresar", exact: true });
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  await submitButton.click();

  const viewport = page.locator("[data-sileo-viewport]");
  const toast = page.locator("[data-sileo-toast]");

  await expect(viewport).toHaveAttribute("aria-live", "polite");
  await expect(viewport).toHaveAttribute("data-theme", "dark");
  await expect(toast).toHaveCount(1);
  await expect(page.getByText("No se pudo completar", { exact: true })).toBeVisible();
  await expect(page.getByText("Ingresa correo y contraseña.", { exact: true })).toBeVisible();

  const layout = await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
      zIndex: Number(window.getComputedStyle(element).zIndex),
    };
  });

  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.zIndex).toBe(210000);

  const palette = await toast.evaluate((element) => ({
    surface: window.getComputedStyle(
      element.querySelector("[data-sileo-pill]"),
    ).fill,
    border: window.getComputedStyle(
      element.querySelector("[data-sileo-pill]"),
    ).stroke,
    borderWidth: window.getComputedStyle(
      element.querySelector("[data-sileo-pill]"),
    ).strokeWidth,
    title: window.getComputedStyle(
      element.querySelector("[data-sileo-title]"),
    ).color,
    text: window.getComputedStyle(
      element.querySelector("[data-sileo-description]"),
    ).color,
    accent: window.getComputedStyle(
      element.querySelector("[data-sileo-badge]"),
    ).color,
  }));

  expect(palette).toEqual({
    surface: "rgb(41, 65, 75)",
    border: "rgb(72, 101, 112)",
    borderWidth: "0.75px",
    title: "rgb(247, 250, 252)",
    text: "rgb(202, 212, 217)",
    accent: "rgb(255, 130, 120)",
  });

  const shadowMotion = await toast.evaluate((element) => {
    const canvas = element.querySelector("[data-sileo-canvas]");
    const styles = window.getComputedStyle(canvas);

    return {
      animationName: styles.animationName,
      animationDuration: styles.animationDuration,
      animationIterationCount: styles.animationIterationCount,
    };
  });

  expect(shadowMotion).toEqual({
    animationName: "app-toast-shadow-pulse",
    animationDuration: "0.48s",
    animationIterationCount: "1",
  });
  expect(pageErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
});

test.describe("tema claro", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme", "light");
    });
  });

  test("Sileo usa la superficie y el texto claros de la app", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();

    const viewport = page.locator("[data-sileo-viewport]");
    const toast = page.locator("[data-sileo-toast]");

    await expect(viewport).toHaveAttribute("data-theme", "light");
    await expect(toast).toBeVisible();

    const palette = await toast.evaluate((element) => ({
      surface: window.getComputedStyle(
        element.querySelector("[data-sileo-pill]"),
      ).fill,
      border: window.getComputedStyle(
        element.querySelector("[data-sileo-pill]"),
      ).stroke,
      borderWidth: window.getComputedStyle(
        element.querySelector("[data-sileo-pill]"),
      ).strokeWidth,
      title: window.getComputedStyle(
        element.querySelector("[data-sileo-title]"),
      ).color,
      text: window.getComputedStyle(
        element.querySelector("[data-sileo-description]"),
      ).color,
      accent: window.getComputedStyle(
        element.querySelector("[data-sileo-badge]"),
      ).color,
    }));

    expect(palette).toEqual({
      surface: "rgb(220, 232, 238)",
      border: "rgb(185, 204, 214)",
      borderWidth: "0.75px",
      title: "rgb(34, 49, 61)",
      text: "rgb(92, 104, 117)",
      accent: "rgb(184, 50, 42)",
    });
  });
});

test.describe("movimiento reducido", () => {
  test.use({
    contextOptions: {
      reducedMotion: "reduce",
    },
  });

  test("Sileo elimina transiciones cuando el usuario lo solicita", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();

    const toast = page.locator("[data-sileo-toast]");
    await expect(toast).toBeVisible();

    const motionState = await toast.evaluate((element) => ({
      prefersReducedMotion: window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
      transitionDuration: window.getComputedStyle(element).transitionDuration,
      shadowAnimationDuration: window.getComputedStyle(
        element.querySelector("[data-sileo-canvas]"),
      ).animationDuration,
    }));

    expect(motionState.prefersReducedMotion).toBe(true);
    expect(
      motionState.transitionDuration
        .split(", ")
        .every((duration) => duration === "0s"),
    ).toBe(true);
    expect(motionState.shadowAnimationDuration).toBe("0s");
  });
});
