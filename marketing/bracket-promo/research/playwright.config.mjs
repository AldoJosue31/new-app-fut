import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from '../../../playwright.tournament-views.config.js';

const workspace = fileURLToPath(new URL('../../../', import.meta.url));
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL('./', import.meta.url)),
  testMatch: 'ui-evidence.spec.mjs',
  outputDir: fileURLToPath(new URL('./ui-artifacts/', import.meta.url)),
  reporter: [
    ['list'],
    ['json', { outputFile: fileURLToPath(new URL('./ui-results.json', import.meta.url)) }],
    ['html', { open: 'never', outputFolder: fileURLToPath(new URL('./ui-report/', import.meta.url)) }],
  ],
  webServer: { ...base.webServer, cwd: workspace },
});
