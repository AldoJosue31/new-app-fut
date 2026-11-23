// Runs the application's existing synthetic-data tests without changing app code.
import { expect, test } from '@playwright/test';
import '../../../tests/e2e/tournament-views.spec.js';

const checkpoint = async (page, info, name) => {
  // Let the app's existing 180–300 ms entrance animations settle for reference stills.
  await page.waitForTimeout(700);
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
};

test('evidencia editorial de clasificacion y exportacion', async ({ page }, info) => {
  await page.goto('/division/94/torneos/123/standings');
  await expect(page.getByTitle('Exportar Tabla', { exact: true })).toBeVisible();
  await checkpoint(page, info, 'clasificacion');
  await page.getByTitle('Exportar Tabla', { exact: true }).click();
  await expect(page.getByText('Exportar Tabla General', { exact: true })).toBeVisible();
  await checkpoint(page, info, 'exportacion-tabla');
});

test('evidencia editorial de resultado y entrada de escaneo', async ({ page }, info) => {
  await page.goto('/division/94/torneos/123/jornadas/456/list');
  await expect(page.getByRole('button', { name: 'Resultado', exact: true })).toBeVisible();
  await checkpoint(page, info, 'jornada-confirmada');
  await page.getByRole('button', { name: 'Resultado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardar Marcador' })).toBeVisible();
  await checkpoint(page, info, 'resultado');
  await page.getByRole('button', { name: 'Escanear cédula', exact: true }).click();
  await expect(page.getByText('Sube una foto clara y completa.', { exact: false })).toBeVisible();
  await checkpoint(page, info, 'entrada-escaneo');
});

test.afterEach(async ({ page }, info) => {
  if (page.isClosed()) return;
  await page.waitForTimeout(700);
  await page.screenshot({ path: info.outputPath('observed-ui.png'), fullPage: true });
  await info.attach('observed-ui', { path: info.outputPath('observed-ui.png'), contentType: 'image/png' });
});
