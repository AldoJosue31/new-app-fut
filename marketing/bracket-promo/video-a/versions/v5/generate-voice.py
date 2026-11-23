"""Generate a Spanish stock narrator locally; no imitation of a real person."""
import os,json,time,sys
from pathlib import Path
import numpy as np,soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro

ROOT=Path(__file__).resolve().parent.parent
opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1
model=Kokoro(str(ROOT/'.models/kokoro-v1.0.onnx'),str(ROOT/'.models/voices-v1.0.bin'))
voices=model.get_voices()
print('Spanish voices:',[v for v in voices if v.startswith('e')],flush=True)
plan=json.loads((ROOT/'video-a/narration-plan.json').read_text(encoding='utf-8'))
out=ROOT/'assets/voice';out.mkdir(exist_ok=True)
timeline=np.zeros(60*24000,dtype=np.float32);meta=[]
for i,part in enumerate(plan):
    path=out/f'narration-{i:02d}.wav'
    text=part.get('tts',part['text'])
    t0=time.time()
    speed=part.get('speed',1.0)
    samples,sr=model.create(text,voice='ef_dora',speed=speed,lang='es',sentence_pause=.27,clause_pause=.11)
    dur=len(samples)/sr;available=part['until']-part['start'];base_speed=speed
    if dur>available:
        speed=min(1.18,base_speed*(dur/available)*1.01)
        samples,sr=model.create(text,voice='ef_dora',speed=speed,lang='es',sentence_pause=.23,clause_pause=.10)
        dur=len(samples)/sr
    if dur>available+.08:raise RuntimeError(f'Narration {i} exceeds window: {dur} > {available}')
    sf.write(path,samples,sr)
    start=round(part['start']*sr);timeline[start:start+len(samples)]+=samples
    meta.append({**part,'end':part['start']+dur,'duration':dur,'voice':'ef_dora','speed':speed,'file':str(path.relative_to(ROOT)).replace('\\','/')})
    print(f'{i}: {dur:.2f}s, speed {speed:.3f}, generation {time.time()-t0:.1f}s',flush=True)
sf.write(out/'narration-timeline.wav',timeline,24000)
(out/'narration-timing.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print('Completed Spanish narration timeline.',flush=True)
