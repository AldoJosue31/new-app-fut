// Official Apache-2.0 Qwen model; local runtime cache, excluded from delivery.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const repo='Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign';
const base=new URL('../.models/qwen-voice-design/',import.meta.url);
const tree=await (await fetch('https://huggingface.co/api/models/'+repo+'/tree/main?recursive=true&expand=false')).json();
const files=tree.filter(v=>v.type==='file'&&!v.path.startsWith('.'));
for(const f of files){const out=new URL(f.path,base);fs.mkdirSync(path.dirname(out.pathname.replace(/^\/(.:)/,'$1')),{recursive:true});if(fs.existsSync(out)&&fs.statSync(out).size===f.size){console.log('Cached',f.path);continue;}
 const response=await fetch('https://huggingface.co/'+repo+'/resolve/main/'+f.path);if(!response.ok)throw Error(`${f.path}: ${response.status}`);
 await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(out));
 if(fs.statSync(out).size!==f.size)throw Error('Incomplete download: '+f.path);
 console.log('Downloaded',f.path,f.size);
}
