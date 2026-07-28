import { expect, test } from "@playwright/test";

const protectedRoutes = [
  {
    pathname: "/dashboard",
    expectedReturn: "/dashboard",
  },
  {
    pathname: "/partidos",
    expectedReturn: "/partidos",
  },
  {
    pathname: "/liga/divisions",
    expectedReturn: "/liga/divisions",
  },
  {
    pathname: "/equipos/79?view=stats",
    expectedReturn: "/equipos/79?view=stats",
  },
  {
    pathname: "/division/94/equipos/79?view=delegate-requests",
    expectedReturn:
      "/division/94/equipos/79?view=delegate-requests",
  },
  {
    pathname: "/torneos/123/jornadas/456",
    expectedReturn: "/torneos/123/jornadas/456",
  },
  {
    pathname: "/division/94/torneos/123/standings",
    expectedReturn: "/division/94/torneos/123/standings",
  },
  {
    pathname: "/admin/managers",
    expectedReturn: "/admin/managers",
  },
  {
    pathname: "/configuracion?tab=cuenta",
    expectedReturn: "/configuracion?tab=cuenta",
  },
];

for (const route of protectedRoutes) {
  test(`anonymous ${route.pathname} redirects before private render`, async ({
    page,
  }) => {
    const privateShellWasVisible = [];
    const hydrationErrors = [];

    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydration|hydrated|server-rendered html|did not match/i.test(
          message.text(),
        )
      ) {
        hydrationErrors.push(message.text());
      }
    });

    const response = await page.goto(route.pathname, {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === "/login" &&
        url.searchParams.get("next") === route.expectedReturn
      );
    });
    await expect(page.getByText("Ingresar").first()).toBeVisible();

    if (
      await page
        .getByRole("button", { name: /cerrar sesion/i })
        .isVisible()
        .catch(() => false)
    ) {
      privateShellWasVisible.push("logout");
    }

    expect(privateShellWasVisible).toEqual([]);
    expect(hydrationErrors).toEqual([]);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === "/login" &&
        url.searchParams.get("next") === route.expectedReturn
      );
    });
  });
}
