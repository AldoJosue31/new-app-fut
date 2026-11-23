import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({args:['--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await page.goto(new URL('index.html?render',import.meta.url).href);
await page.waitForFunction(()=>window.BRACKET_READY);
await page.evaluate(()=>seek(33.95));
await page.screenshot({path:new URL('../review/browser-capture.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1')});
const png=await page.evaluate(()=>document.getElementById('film').toDataURL('image/png').split(',')[1]);
fs.writeFileSync(new URL('../review/canvas-capture.png',import.meta.url),Buffer.from(png,'base64'));
const result=await page.evaluate(()=>{
  const first=(()=>{seek(43.2);return document.getElementById('film').toDataURL();})();
  [1,58.5,8.6,36.8,20.8,52.8].forEach(seek);seek(43.2);
  return {randomAccessDeterministic:first===document.getElementById('film').toDataURL(),fonts:[...document.fonts].map(f=>({family:f.family,weight:f.weight,status:f.status}))};
});
fs.writeFileSync(new URL('../review/composition-checks.json',import.meta.url),JSON.stringify(result,null,2));
await browser.close();
console.log(result);
