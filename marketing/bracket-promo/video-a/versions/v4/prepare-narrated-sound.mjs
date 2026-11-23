import fs from 'node:fs';
const file=new URL('../sound-a/scripts/sound_pass.py',import.meta.url);let p=fs.readFileSync(file,'utf8');
p=p.replace("A=ap.parse_args();", "ap.add_argument('--voiceover',default=None)\nap.add_argument('--voice-timing',default=None)\nap.add_argument('--sfx-db',type=float,default=0)\nA=ap.parse_args();");
p=p.replace("i=max(0,int(start*SR)); a=a*10**(gain/20)","gain+=A.sfx_db\n  i=max(0,int(start*SR)); a=a*10**(gain/20)");
p=p.replace("# music bed",`# Narration is a generated spoken performance, not synthesized music/SFX.
voice=np.zeros_like(mix)
duck=np.ones(len(mix),dtype=np.float32)
if A.voiceover:
  v=load(A.voiceover); voice[:min(len(v),len(voice))]=v[:len(voice)]
  timing=json.load(open(A.voice_timing,encoding='utf-8')) if A.voice_timing else []
  for part in timing:
    start=max(0,int((part['start']-.12)*SR)); a=max(start,int(part['start']*SR)); b=min(len(duck),int((part['end']+.08)*SR)); end=min(len(duck),b+int(.30*SR))
    curve=np.ones(end-start,dtype=np.float32)
    curve[:a-start]=np.linspace(1,.316,a-start)
    curve[a-start:b-start]=.316
    curve[b-start:]=np.linspace(.316,1,end-b)
    duck[start:end]=np.minimum(duck[start:end],curve)
  log.append('Narration: Kokoro-82M em_alex, Spanish stock voice generated locally; Apache 2.0 model. Music ducking: 10 dB with 120 ms lead and 300 ms release.')
# music bed`);
p=p.replace("mix[:len(seg)]+=seg", "seg*=duck[:len(seg),None]; mix[:len(seg)]+=seg; mix+=voice");
p=p.replace("import report; report.write", "\nif A.voiceover:\n  with open(f'{A.out}/CREDITS.txt','a',encoding='utf-8') as f: f.write('\\nNarration\\nSpanish synthetic stock voice em_alex, generated locally with Kokoro-82M, Apache 2.0 model: https://huggingface.co/hexgrad/Kokoro-82M\\n')\n\nimport report; report.write");
fs.writeFileSync(file,p);
const cues=JSON.parse(fs.readFileSync(new URL('cues.json',import.meta.url),'utf8'));
cues.find(c=>c.t===2.35).t=4.65;
cues.find(c=>c.t===19.75).t=15.3+2.75*(5.2/3.5);
cues.find(c=>c.t===57.35).t=57.25;
const rise=cues.find(c=>c.type==='build_up');rise.t=55.4;rise.dur=1.85;
for(const t of [15.3,27.3,39.3])cues.push({t,type:'movement',desc:'Recorrido de cámara entre etapas de la competición'});
cues.sort((a,b)=>a.t-b.t);fs.writeFileSync(new URL('cues.json',import.meta.url),JSON.stringify(cues,null,2));
console.log('Prepared narration-priority sound pass and updated motion cues.');
