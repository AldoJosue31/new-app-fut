import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1300 } });
await page.goto('http://127.0.0.1:5190');
await page.waitForFunction(() => window.__bracket?.ready);
await page.evaluate(() => window.__hd.pause());
const aims = {};
for (const [name, seconds] of Object.entries({ grid: .5, list: .5, result: .5, 'result-local': 6.5, 'result-visit': 6.5, autofill: 7.3, goal: 9.6, save: 14.3, confirm: 15.5, 'tab-standings': 19.8, export: 24.1 })) {
  await page.evaluate(seconds => window.__hd.seek(seconds), seconds);
  await page.waitForTimeout(120);
  aims[name] = await page.evaluate(name => {
    const r = document.querySelector('.hd-stage').getBoundingClientRect();
    const b = document.querySelector(`[data-aim="${name}"]`).getBoundingClientRect();
    const k = r.width / 1200;
    return [+( (b.left - r.left + b.width * .55) / k).toFixed(2), +((b.top - r.top + b.height * .6) / k).toFixed(2)];
  }, name);
}
await writeFile(new URL('../src/aims.json', import.meta.url), JSON.stringify(aims, null, 2) + '\n');
console.log(aims);
await browser.close();
