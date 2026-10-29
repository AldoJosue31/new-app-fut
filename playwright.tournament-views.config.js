import { defineConfig } from "@playwright/test";
import config from "./playwright.password-recovery.config.js";

// Reuse the existing synthetic authentication fixture in an isolated server.
export default defineConfig({
  ...config,
  testMatch: "tournament-views.spec.js",
  outputDir: "test-results/tournament-views",
  webServer: {
    ...config.webServer,
    command: "node node_modules/next/dist/bin/next start --hostname=127.0.0.1 --port=4176",
    url: "http://127.0.0.1:4176",
  },
  use: { ...config.use, baseURL: "http://127.0.0.1:4176" },
});
