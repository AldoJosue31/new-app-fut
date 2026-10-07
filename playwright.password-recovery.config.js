import { defineConfig } from "@playwright/test";
import config from "./playwright.config.js";

process.env.E2E_PASSWORD_RECOVERY = "1";
const mockUrl = new URL("./tests/e2e/fixtures/password-recovery-mock.mjs", import.meta.url).href;

export default defineConfig({
  ...config,
  testMatch: "password-recovery.spec.js",
  outputDir: "test-results/password-recovery",
  projects: config.projects
    .filter(({ name }) => ["chromium", "mobile-chromium"].includes(name))
    .map((project) => project.name === "mobile-chromium" ? {
      ...project, use: { ...project.use, viewport: { width: 390, height: 844 } },
    } : { ...project, use: { ...project.use, viewport: { width: 1440, height: 1000 } } }),
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname=127.0.0.1 --port=4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_PASSWORD_RECOVERY: "1",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=${mockUrl}`.trim(),
    },
  },
  use: { ...config.use, baseURL: "http://127.0.0.1:4175" },
});
