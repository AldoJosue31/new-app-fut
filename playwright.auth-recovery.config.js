import { defineConfig } from "@playwright/test";
import config from "./playwright.config.js";

process.env.E2E_AUTH_RECOVERY = "1";
const mockUrl = new URL("./tests/e2e/fixtures/auth-recovery-mock.mjs", import.meta.url).href;

export default defineConfig({
  ...config,
  testMatch: "auth-recovery.spec.js",
  outputDir: "test-results/auth-recovery",
  projects: config.projects.filter(({ name }) => ["chromium", "mobile-chromium"].includes(name)),
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_AUTH_RECOVERY: "1",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=${mockUrl}`.trim(),
    },
  },
  use: { ...config.use, baseURL: "http://127.0.0.1:4174" },
});
