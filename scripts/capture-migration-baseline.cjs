const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.BASELINE_BASE_URL || "http://127.0.0.1:5173";
const outputDir = path.resolve(
  process.env.BASELINE_OUTPUT_DIR ||
    "docs/migration-evidence/m0/screenshots",
);

const routes = [
  { name: "home", pathname: "/" },
  { name: "landing", pathname: "/landing" },
  { name: "login", pathname: "/login" },
  { name: "public-standings", pathname: "/share/standings/1" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

const run = async () => {
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const report = {
    baseUrl,
    capturedAt: new Date().toISOString(),
    pages: [],
  };

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "light",
      });

      for (const route of routes) {
        const page = await context.newPage();
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
            serverErrors.push({
              status: response.status(),
              url: response.url(),
            });
          }
        });

        const requestedUrl = new URL(route.pathname, baseUrl).toString();
        const response = await page.goto(requestedUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });

        await page.waitForTimeout(1_500);

        await page.evaluate(async () => {
          const delay = (milliseconds) =>
            new Promise((resolve) => setTimeout(resolve, milliseconds));
          const step = Math.max(window.innerHeight * 0.75, 300);

          for (
            let position = 0;
            position < document.documentElement.scrollHeight;
            position += step
          ) {
            window.scrollTo(0, position);
            await delay(80);
          }

          window.scrollTo(0, 0);
          await delay(250);
        });

        const screenshotPath = path.join(
          outputDir,
          `${route.name}-${viewport.name}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });

        report.pages.push({
          route: route.pathname,
          viewport: viewport.name,
          requestedUrl,
          finalUrl: page.url(),
          status: response?.status() ?? null,
          title: await page.title(),
          screenshot: path.relative(process.cwd(), screenshotPath),
          consoleErrors,
          pageErrors,
          serverErrors,
        });

        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(
    path.join(outputDir, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const failures = report.pages.filter(
    (page) =>
      page.status !== 200 ||
      page.pageErrors.length > 0 ||
      page.serverErrors.length > 0,
  );

  console.log(
    `Captured ${report.pages.length} baselines in ${outputDir}. ` +
      `${failures.length} page(s) require review.`,
  );

  if (failures.length > 0) {
    console.log(JSON.stringify(failures, null, 2));
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
