import fs from 'node:fs';
import { chromium } from 'playwright';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await page.goto(new URL('index.html?render',import.meta.url).href);await page.waitForFunction(()=>window.BRACKET_READY);
const png=await page.evaluate(()=>{seek(58.5);return document.getElementById('film').toDataURL('image/png').split(',')[1];});
fs.writeFileSync(new URL('../final/bracket-a-poster.png',import.meta.url),Buffer.from(png,'base64'));
await browser.close();console.log('Exported native 1080×1920 poster.');
