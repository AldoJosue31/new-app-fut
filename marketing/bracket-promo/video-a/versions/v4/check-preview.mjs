import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:430,height:932}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4188/video-a/index.html?v=4-final');
  await page.waitForFunction(()=>window.BRACKET_READY&&audio.readyState>=1);
  await page.getByRole('button',{name:'Reproducir',exact:true}).click();
  await page.waitForFunction(()=>audio.currentTime>.5);
  await page.getByRole('button',{name:'Pausar',exact:true}).click();
  const playedTo=await page.evaluate(()=>audio.currentTime);
  await page.locator('#scrub').fill('49.2');
  await page.getByRole('button',{name:'Reproducir',exact:true}).click();
  await page.waitForFunction(()=>audio.currentTime>49.6);
  await page.getByRole('button',{name:'Pausar',exact:true}).click();
  const result=await page.evaluate(()=>({phone:window.PHONE_LAYOUT,playedTo:audio.currentTime,audioDuration:audio.duration,audioSource:audio.src,captionGroups:NARRATION.reduce((n,p)=>n+(p.captions?.length||0),0),stageFits:document.querySelector('#wrap').getBoundingClientRect().right<=innerWidth}));
  result.firstPlayback=playedTo;
  if(errors.length||!result.stageFits||result.audioDuration!==60||!result.audioSource.endsWith('/final/bracket-a-60s.mp4'))throw Error(JSON.stringify({errors,result}));
  fs.writeFileSync(new URL('../review/preview-playback.json',import.meta.url),JSON.stringify({errors,result},null,2));
  console.log(JSON.stringify({errors,result},null,2));
} finally {await browser.close();}
