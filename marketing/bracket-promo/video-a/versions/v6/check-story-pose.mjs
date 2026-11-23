import { chromium } from 'playwright';
import fs from 'node:fs';
const b=await chromium.launch({args:['--allow-file-access-from-files']});
try{
 const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(new URL('index.html?render',import.meta.url).href);await p.waitForFunction(()=>window.BRACKET_READY);
 const result=await p.evaluate(()=>{
  const samples=[],take=(name,t)=>{seek(t);samples.push({name,t,character:window.DANI_FRAME,chat:window.CHAT_FRAME});};
  take('writing',Math.min(1,T.transcribe/2));take('typing',T.transcribe+.4);
  ['qRole','qTable','qGoals','qMatches','qCards'].forEach(k=>take(k,T[k]+.08));
  take('relief',T.closing+.6);
  const at=T.qCards+.08;seek(at);const first=canvas.toDataURL();[.5,T.transcribe+.3,40,T.closing+.6].forEach(seek);seek(at);
  return {samples,randomAccessDeterministic:first===canvas.toDataURL(),provisional:false};
 });
 if(errors.length||!result.randomAccessDeterministic)throw Error(JSON.stringify(errors));
 const [writing,typing,...rest]=result.samples;
 if(writing.character.mode!=='writing'||writing.character.appOnPhone||!writing.character.props.includes('pen'))throw Error('Opening must have paper and pen.');
 if(typing.character.mode!=='typing'||typing.character.appOnPhone||!typing.character.props.includes('laptop'))throw Error('Transcription must have laptop without a phone.');
 rest.slice(0,5).forEach((s,i)=>{if(s.chat.count!==i+1||!s.chat.external||s.character.appOnPhone)throw Error('External chat/pressure progression mismatch');});
 const end=rest.at(-1);if(end.character.mode!=='phone'||!end.character.appOnPhone||end.character.stress!==0)throw Error('Final phone/app and relief mismatch.');
 fs.writeFileSync(new URL('../review/story-pose-checks.json',import.meta.url),JSON.stringify({...result,errors},null,2));
 for(const name of ['writing','typing','qCards','relief']){
  const s=result.samples.find(s=>s.name===name);await p.evaluate(t=>seek(t),s.t);
  await p.screenshot({path:new URL('../review/v6-'+name+'.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1')});
 }
 console.log('Verified paper/pen → laptop → five external chat reactions → relieved phone with Bracket.');
}finally{await b.close();}
