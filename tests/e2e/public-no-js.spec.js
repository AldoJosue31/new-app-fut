import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

const serverRenderedRoutes = [
  {
    pathname: "/landing",
    expectedText: /Gestiona tu liga de fÃºtbol/i,
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
    pathname: "/delegate/invitation/invalido",
    expectedText: /El enlace esta incompleto/i,
  },
];

for (const route of serverRenderedRoutes) {
  test(`${route.pathname} renders useful HTML without JavaScript`, async ({
    page,
  }) => {
    const response = await page.goto(route.pathname, {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    const expectedText =
      route.pathname === "/landing"
        ? /Gestiona tu liga/i
        : route.expectedText;
    await expect(page.getByText(expectedText).first()).toBeVisible();
    await expect(page.locator("#modal-root")).toHaveCount(1);
  });
}
