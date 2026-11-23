import fs from 'node:fs';
const parts=JSON.parse(fs.readFileSync(new URL('../assets/voice/narration-timing.json',import.meta.url),'utf8'));
const stamp=t=>{const ms=Math.round(t*1000);return `${Math.floor(ms/3600000).toString().padStart(2,'0')}:${Math.floor(ms/60000)%60<10?'0':''}${Math.floor(ms/60000)%60}:${Math.floor(ms/1000)%60<10?'0':''}${Math.floor(ms/1000)%60},${(ms%1000).toString().padStart(3,'0')}`;};
const cues=[];
for(const p of parts){if(p.captions?.length){cues.push(...p.captions);continue;}const words=p.text.split(/\s+/),n=Math.ceil(words.length/7);for(let i=0;i<n;i++){const start=p.start+(p.end-p.start)*i/n,end=p.start+(p.end-p.start)*(i+1)/n;cues.push({start,end,text:words.slice(i*7,(i+1)*7).join(' ')});}}
fs.writeFileSync(new URL('../final/bracket-a-es.srt',import.meta.url),cues.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n'));
fs.writeFileSync(new URL('../assets/voice/narration-script.txt',import.meta.url),parts.map(p=>p.text).join('\n\n')+'\n');
console.log('Exported the spoken script and optional Spanish subtitles.');
