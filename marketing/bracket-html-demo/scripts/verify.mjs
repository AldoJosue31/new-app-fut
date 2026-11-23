import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { snapshot, matchesAfter } from '../src/data.mjs';

const base = process.env.BRACKET_DEMO_URL || 'http://127.0.0.1:5190';
const output = fileURLToPath(new URL('../evidence/round-3/', import.meta.url));
await mkdir(output, { recursive: true });
const results = [], errors = [], externalRequests = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, timezoneId: 'America/Mexico_City' });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', req => { if (!req.url().startsWith(base) && !req.url().startsWith('data:')) externalRequests.push(req.url()); });
async function check(name, run) {
  try { const detail = await run(); results.push({ name, passed: true, detail }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.log('FAIL', name, error.message); }
}
const elapsed = () => page.evaluate(() => window.__hd.elapsed);
async function freeze(s) {
  await page.evaluate(s => { window.__hd.pause(); window.__hd.seek(s); }, s);
  await page.waitForTimeout(80);
}
const response = await page.goto(base);
assert.ok(response.ok(), `Demo HTTP ${response.status()}`);
await page.waitForFunction(() => window.__bracket?.ready);
await page.evaluate(() => document.fonts.ready);
await check('Autoplay al entrar en el área visible', async () => {
  await page.locator('.hd-view').scrollIntoViewIfNeeded();
  const a = await elapsed(); await page.waitForTimeout(350); assert.ok(await elapsed() > a + .15);
});
await check('28 segundos, cinco pasos y puntos calculados con el código original', async () => {
  const metadata = await page.evaluate(() => window.__bracket.steps);
  assert.equal(metadata.reduce((s, x) => s + x.dur, 0), 28);
  assert.equal(metadata.length, 5);
  assert.ok(metadata.every(x => x.dur >= 4 && x.dur <= 8));
  assert.deepEqual(snapshot.tablaGeneral.map(x => [x.nombre, x.pts]), [['Halcones', 6], ['Leones', 3], ['Lobos', 1], ['Tigres', 1]]);
  assert.equal(matchesAfter.find(x => x.id === 91).goals1, 1);
});
await check('Todos los clics caen en su elemento real medido', async () => {
  const clicks = [[1.1,'grid'],[2.8,'list'],[4.05,'result'],[7,'result-local'],[8.15,'autofill'],[9.3,'goal'],[10.85,'result-visit'],[12.1,'autofill'],[15,'save'],[16.7,'confirm'],[20.65,'tab-standings'],[25.15,'export']];
  const distances = [];
  for (const [s, name] of clicks) {
    await freeze(s + .001);
    const value = await page.evaluate(name => {
      const stage = document.querySelector('.hd-stage').getBoundingClientRect(), k = stage.width / 1200;
      const c = document.querySelector('.hd-cursor').getBoundingClientRect();
      const r = document.querySelector(`[data-aim="${name}"]`).getBoundingClientRect();
      const x = c.x + 5*k, y = c.y + 5*k;
      return { hit: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom, pressed: document.querySelector('.hd-cursor').classList.contains('press'), x, y, target: name };
    }, name);
    assert.ok(value.hit, JSON.stringify(value)); assert.ok(value.pressed); distances.push(value.target);
  }
  return distances;
});
await check('Fotogramas idénticos al avanzar, retroceder y volver al mismo instante', async () => {
  const hashes = [];
  for (const t of [10.2, 17.2, 26.8]) {
    await freeze(t);
    const one = createHash('sha256').update(await page.locator('.hd-view').screenshot()).digest('hex');
    const dom = await page.locator('.hd-stage').innerHTML();
    await freeze(3); await freeze(27.9); await freeze(t);
    const two = createHash('sha256').update(await page.locator('.hd-view').screenshot()).digest('hex');
    assert.equal(one, two); assert.equal(dom, await page.locator('.hd-stage').innerHTML()); hashes.push(one);
  }
  return hashes;
});
await check('Pausa y reanudación desde controles visibles', async () => {
  await freeze(2);
  await page.getByRole('button', { name: 'Reanudar demostración' }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Pausar demostración' }).click();
  const at = await elapsed(); await page.waitForTimeout(250); assert.equal(await elapsed(), at);
});
await check('Scrubber y navegación por teclado entre pasos', async () => {
  const slider = page.getByRole('slider');
  await slider.fill('21.5'); assert.ok(Math.abs(await elapsed() - 21.5) < .02);
  await slider.press('ArrowLeft'); assert.ok(await elapsed() < 21.5);
  const step = page.locator('.hd-steps button').nth(2); await step.focus(); await step.press('Enter');
  assert.equal(await page.evaluate(() => window.__hd.i), 2);
  assert.equal(await step.getAttribute('aria-current'), 'step');
});
await check('Bucle completo al terminar', async () => {
  await freeze(27.85); await page.locator('.hd-view').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.__hd.resume()); await page.waitForTimeout(420);
  assert.equal(await page.evaluate(() => window.__hd.i), 0); await page.evaluate(() => window.__hd.pause());
});
await check('Pausa fuera de pantalla y reanudación sin salto', async () => {
  await freeze(3); await page.locator('.hd-view').scrollIntoViewIfNeeded();
  await page.evaluate(() => { const spacer = document.createElement('div'); spacer.id='br-test-spacer'; spacer.style.height='2500px'; document.body.append(spacer); window.__hd.resume(); });
  await page.evaluate(() => window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})); await page.waitForTimeout(120);
  const before = await elapsed(); await page.waitForTimeout(500); assert.ok(Math.abs(await elapsed()-before) < .05);
  await page.locator('.hd-view').scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
  const after = await elapsed(); assert.ok(after > before + .1 && after < before + .5);
  await page.evaluate(() => { window.__hd.pause(); document.getElementById('br-test-spacer').remove(); });
});
await check('No avanza por debajo del 30% visible', async () => {
  await freeze(2); await page.setViewportSize({ width: 1440, height: 600 });
  await page.evaluate(() => {
    const spacer=document.createElement('div');spacer.id='br-test-spacer';spacer.style.height='2000px';document.body.append(spacer);
    const r=document.querySelector('.hd').getBoundingClientRect(); window.scrollTo({top:window.scrollY+r.bottom-r.height*.2,behavior:'instant'}); window.__hd.resume();
  });
  await page.waitForTimeout(150); const at=await elapsed(); await page.waitForTimeout(350);assert.ok(Math.abs(await elapsed()-at)<.05);
  await page.evaluate(() => { window.__hd.pause();document.getElementById('br-test-spacer').remove(); });
  await page.setViewportSize({width:1440,height:1200});
});
await check('La guarda document.hidden pausa y no acumula tiempo oculto', async () => {
  await freeze(3); await page.locator('.hd-view').scrollIntoViewIfNeeded();
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:true});window.__hd.resume(); });
  const at=await elapsed();await page.waitForTimeout(500);assert.equal(await elapsed(),at);
  await page.evaluate(() => { delete document.hidden; }); await page.waitForTimeout(200);
  assert.ok(await elapsed() < at+.4);await page.evaluate(() => window.__hd.pause());
  return 'Guard exercised with a controlled document.hidden value; page lifecycle also tested below.';
});
await check('Eventos freeze/resume: pausa y restauración sin avance acumulado', async () => {
  await freeze(2);await page.locator('.hd-view').scrollIntoViewIfNeeded();await page.evaluate(()=>window.__hd.resume());
  await page.waitForTimeout(100);
  await page.evaluate(()=>document.dispatchEvent(new Event('freeze')));const at=await elapsed();
  await page.waitForTimeout(600);assert.ok(Math.abs(await elapsed()-at)<.05);
  await page.evaluate(()=>document.dispatchEvent(new Event('resume')));await page.waitForTimeout(150);
  assert.ok(await elapsed()>at && await elapsed()<at+.4);await page.evaluate(()=>window.__hd.pause());
  return 'Lifecycle events dispatched in the test. CDP freeze was not used as evidence: headless Chromium emitted no lifecycle events for a visible page.';
});
for (const width of [1440,390,340]) await check(`Composición y controles a ${width} px`, async () => {
  await page.setViewportSize({width,height:width===1440?1200:844}); await freeze(22.8); await page.evaluate(()=>window.scrollTo(0,0));
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,stage:document.querySelector('.hd-stage').getBoundingClientRect().toJSON(),view:document.querySelector('.hd-view').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.hd-steps button')].map(b=>({width:b.clientWidth,scroll:b.scrollWidth}))}));
  assert.ok(layout.scroll<=width,JSON.stringify(layout));assert.ok(Math.abs(layout.view.width/layout.view.height-1.6)<.01);
  assert.ok(layout.buttons.every(b=>b.scroll<=b.width+1));
  await page.screenshot({path:output+`page-${width}.png`,fullPage:true});return layout;
});
await check('Movimiento reducido: cinco estados finales completos y pasos activos', async () => {
  await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(120);
  for(let i=0;i<5;i++){
    await page.locator('.hd-steps button').nth(i).click();
    const state=await page.evaluate(()=>({t:window.__hd.t,dur:window.__hd.steps[window.__hd.i].dur,still:window.__hd.still}));
    assert.ok(state.still);assert.equal(state.t,state.dur);
    await page.locator('.hd-win').screenshot({path:output+`reduced-${i+1}.png`});
  }
  const before=await elapsed();await page.waitForTimeout(250);assert.equal(await elapsed(),before);
  await page.getByRole('slider').fill('7');assert.equal(await page.evaluate(()=>window.__hd.t),8);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(100);
});
await check('Capturas principales completas',async()=>{
  await page.setViewportSize({width:1440,height:1300});
  for(const [name,t] of [['01-jornada',.8],['02-resultado',5.5],['03-gol',10],['04-confirmacion',16.1],['05-clasificacion',22.8],['06-exportacion',27.2]]){
    await freeze(t);await page.locator('.hd-win').screenshot({path:output+name+'.png'});
  }
  await freeze(10);await page.screenshot({path:output+'page-desktop.png',fullPage:true});
});
await check('Interfaz simulada accesible como imagen, controles reales',async()=>{
  const semantics=await page.evaluate(()=>({role:document.querySelector('.hd-view').getAttribute('role'),label:document.querySelector('.hd-view').getAttribute('aria-label'),hidden:document.querySelector('.hd-stage>div').getAttribute('aria-hidden'),events:getComputedStyle(document.querySelector('.hd-stage')).pointerEvents}));
  assert.equal(semantics.role,'img');assert.equal(semantics.hidden,'true');assert.equal(semantics.events,'none');assert.ok(semantics.label.includes('Jornada'));return semantics;
});
await check('Consola limpia, sin peticiones externas ni video/canvas/WebGL', async () => {
  assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);assert.equal(await page.locator('video,canvas,iframe').count(),0);
});
await browser.close();
await writeFile(output+'report.json',JSON.stringify({base,results,errors,externalRequests,passed:results.every(x=>x.passed)},null,2));
if(results.some(x=>!x.passed))process.exitCode=1;
