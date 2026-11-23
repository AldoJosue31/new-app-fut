import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({args:['--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(new URL('index.html?render',import.meta.url).href);await page.waitForFunction(()=>window.BRACKET_READY);
const data=await page.evaluate(()=>{
 const overflow=[];let samples=0;
 for(let t=SCENES[0].a-.1;t<SCENES[SCENES.length-1].b+.21;t+=.12){seek(t);samples++;if(TEXT_OVERFLOWS.length)overflow.push({t,items:TEXT_OVERFLOWS});}
 const first=(()=>{seek(35.8);return document.getElementById('film').toDataURL();})();[1.2,14.3,58.5,22.2,41.8].forEach(seek);seek(35.8);
 return {samples,overflow,randomAccessDeterministic:first===document.getElementById('film').toDataURL(),phone:PHONE_LAYOUT,theme:C,fonts:[...document.fonts].map(f=>({family:f.family,weight:f.weight,status:f.status}))};
});
await browser.close();
fs.writeFileSync(new URL('../review/mobile-checks.json',import.meta.url),JSON.stringify({...data,errors},null,2));
const dx=data.phone.entranceTranslationMax?.[0]||0,dy=data.phone.entranceTranslationMax?.[1]||0;
const fullViewport=data.phone.x-dx-11>=0&&data.phone.x+dx+data.phone.w*data.phone.scale+11<=1080&&data.phone.y+dy+data.phone.h*data.phone.scale+12<=1920;
if(errors.length||data.overflow.length||!data.randomAccessDeterministic||data.phone.zoom||data.phone.perspective||!fullViewport)throw Error(JSON.stringify({errors,fullViewport,overflow:data.overflow.slice(0,6)}));
console.log(`Checked ${data.samples} mobile states: full fixed viewport, no horizontal text overflow, deterministic frames, fonts loaded.`);
