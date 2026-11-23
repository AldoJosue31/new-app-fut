// Opens the REAL application with intercepted synthetic fixtures. No real writes.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRecoveryTestSession, recoveryTestProfile, recoveryTestUser } from '../../../tests/e2e/fixtures/password-recovery-session.mjs';
import { division, league, teams, players, jornadas, tournament, matchesBefore, matchesAfter, snapshot } from '../src/data.mjs';
const workspace = fileURLToPath(new URL('../../../', import.meta.url));
process.loadEnvFile(workspace + '.env');
const out = fileURLToPath(new URL('../evidence/references/', import.meta.url));
await mkdir(out, { recursive: true });
const baseURL = process.env.BRACKET_REFERENCE_URL || 'http://127.0.0.1:4181';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1200, height: 750 }, timezoneId: 'America/Mexico_City' });
const page = await context.newPage();
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(120000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') console.log('reference console:', m.text()); });
let saved = false;
let simulatedSaves = 0;
const session = createRecoveryTestSession();
const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_APP_SUPABASE_URL).hostname.split('.')[0];
await context.addCookies([{ name: `sb-${projectRef}-auth-token`, value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`, url: baseURL, sameSite: 'Lax', expires: session.expires_at }]);
await page.addInitScript(division => {
  localStorage.setItem('division-storage', JSON.stringify({ state: { selectedDivision: division }, version: 0 }));
  localStorage.setItem('theme-storage', JSON.stringify({ state: { theme: 'light' }, version: 0 }));
}, division);
await page.routeWebSocket('**/realtime/v1/**', socket => socket.close());
await page.route('**/storage/v1/**', route => route.fulfill({ status: 404, json: { statusCode: '404', error: 'not_found', message: 'Object not found' } }));
await page.route('**/auth/v1/**', route => route.fulfill({ status: new URL(route.request().url()).pathname === '/auth/v1/user' ? 200 : 400, json: recoveryTestUser }));
await page.route('**/rest/v1/**', route => {
  const req = route.request();
  const url = new URL(req.url());
  const table = url.pathname.split('/').at(-1);
  // Deliberately intercept every mutation: the only allowed simulated save.
  if (req.method() !== 'GET') {
    if (table === 'profiles' && req.method() === 'PATCH') return route.fulfill({ json: recoveryTestProfile });
    if (table === 'save_match_result_atomic') { saved = true; simulatedSaves++; return route.fulfill({ json: { match: matchesAfter.at(-1) } }); }
    return route.fulfill({ status: 400, json: { message: 'Unexpected reference mutation blocked' } });
  }
  const object = req.headers().accept?.includes('application/vnd.pgrst.object+json');
  let data = { profiles: recoveryTestProfile, leagues: object ? league : [league], divisions: [division], teams, jornadas,
    matches: saved ? matchesAfter : matchesBefore, tournaments: url.searchParams.get('id')?.startsWith('neq.') ? [] : object ? tournament : [tournament],
    referees: [], match_events: [], match_cedula_photos: [],
  }[table] || [];
  if (table === 'players') data = players.filter(p => String(p.team_id) === url.searchParams.get('team_id')?.replace('eq.', ''));
  if (table === 'tournaments' && object) data = { ...tournament, division: { ...division, league: { ...league, primary_color: '#84d8ff' } } };
  if (table === 'matches' && url.searchParams.get('jornada_id')?.startsWith('eq.')) data = data.filter(m => String(m.jornada_id) === url.searchParams.get('jornada_id').slice(3));
  return route.fulfill({ json: data });
});
await page.route('**/api/divisions/94/workspace', route => route.fulfill({ json: { division, league, activeTournament: tournament, teams, matches: saved ? matchesAfter : matchesBefore, standings: snapshot.tablaGeneral } }));
const shoot = async name => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + name + '.png' });
};
await page.goto(baseURL + '/division/94/torneos/123/jornadas/456/list');
await page.getByRole('button', { name: 'Resultado', exact: true }).waitFor();
await shoot('01-jornada');
await page.getByTitle('Vista de Grilla Semanal', { exact: true }).click();
await shoot('02-grilla');
await page.getByTitle('Vista de Lista', { exact: true }).click();
await page.getByRole('button', { name: 'Resultado', exact: true }).click();
await page.getByRole('button', { name: 'Guardar Marcador', exact: true }).waitFor().catch(async error => {
  await page.screenshot({ path: out + 'debug-modal.png' });
  console.log(await page.locator('body').innerText(), errors);
  throw error;
});
await page.getByText('Procesando datos...', { exact: true }).waitFor({ state: 'hidden' });
await shoot('03-general');
await page.getByRole('tab', { name: 'Halcones', exact: true }).click();
await shoot('04-roster-vacio');
await page.getByRole('button', { name: 'Auto-rellenar titulares', exact: true }).click();
await page.locator('.stat-number.goals input').first().fill('1');
await shoot('05-gol');
await page.getByRole('tab', { name: 'Leones', exact: true }).click();
await page.getByRole('button', { name: 'Auto-rellenar titulares', exact: true }).click();
await page.getByRole('button', { name: 'Guardar Marcador', exact: true }).click();
await shoot('06-confirmar');
// Execute the real save path against the intercepted RPC response only.
await page.getByRole('button', { name: 'Sí, guardar', exact: true }).click();
await page.getByText('Definir Resultado', { exact: true }).waitFor({ state: 'hidden' });
await shoot('06b-guardado');
await page.goto(baseURL + '/division/94/torneos/123/standings');
await page.getByTitle('Exportar Tabla', { exact: true }).waitFor();
await shoot('07-clasificacion');
await page.getByTitle('Exportar Tabla', { exact: true }).click();
await page.getByText('Cargando datos...', { exact: true }).waitFor({ state: 'hidden' });
await shoot('08-exportar');
await writeFile(out + 'report.json', JSON.stringify({ viewport: [1200, 750], data: 'synthetic', remoteWrites: 0, simulatedSaves, errors, snapshot: snapshot.tablaGeneral }, null, 2));
await browser.close();
console.log('Real UI references saved. Errors:', errors.length);
