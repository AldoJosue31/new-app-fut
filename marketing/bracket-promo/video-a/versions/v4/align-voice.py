"""Place a single performed narration at natural phrase boundaries, without time stretching."""
from pathlib import Path
import json,re,unicodedata,difflib
import numpy as np,soundfile as sf
ROOT=Path(__file__).resolve().parent.parent
source=json.loads((ROOT/'video-a/narration-v4-script.json').read_text(encoding='utf-8'))
transcript=json.loads((ROOT/'assets/voice/narration-v4-transcript.json').read_text(encoding='utf-8'))
def norm(s):
    s=''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
    s=re.sub(r'[^a-z0-9]','',s)
    return 'bracket' if s in ['braquet','braket','brackett','bracke','bracket'] else s
actual=[w for w in transcript['words'] if norm(w['word'])]
aw=[norm(w['word']) for w in actual]
ref=source['text'].split();rw=[norm(w) for w in ref]
matcher=difflib.SequenceMatcher(None,rw,aw,autojunk=False)
mapping={a+i:b+i for a,b,n in matcher.get_matching_blocks() for i in range(n)}
coverage=len(mapping)/len(rw)
if coverage<.85:raise RuntimeError('Narration content needs review: '+str(round(coverage,3)))
def locate(phrase):
    p=[norm(w) for w in phrase.split()]
    for i in range(len(rw)-len(p)+1):
        if rw[i:i+len(p)]==p:return i
    raise ValueError('Phrase not found: '+phrase)
def index_at(i):
    if i in mapping:return mapping[i]
    nearest=min(mapping,key=lambda k:abs(k-i))
    return max(0,min(len(actual)-1,mapping[nearest]+i-nearest))
boundaries=[
 ('intro',0,.25,locate('Dani tiene')),
 ('story',locate('Un equipo'),3.0,None),
 ('setup',locate('Incorpora a los equipos'),18.75,None),
 ('calendar',locate('Prepara los cruces'),25.2,None),
 ('upload',locate('Al terminar'),32.7,None),
 ('review',locate('revisa la lectura'),36.35,None),
 ('confirm',locate('y confirma el marcador'),39.45,None),
 ('table',locate('La clasificación toma forma'),42.65,None),
 ('export',locate('Descarga una imagen'),47.65,None),
 ('public',locate('o habilita el enlace'),51.75,locate('Que organizar tu liga')),
 ('brand',locate('Bracket. Más allá'),56.15,None),
]
audio,sr=sf.read(ROOT/'assets/voice/narration-v4-continuous.wav',dtype='float32')
timeline=np.zeros(60*sr,dtype=np.float32);out=[];previous_end=0
for j,(name,ri,target,explicit_end) in enumerate(boundaries):
    ai=index_at(ri);next_ri=explicit_end if explicit_end is not None else boundaries[j+1][1] if j+1<len(boundaries) else len(rw)
    last_ai=index_at(next_ri-1)
    start=max(0,actual[0]['start']-.12) if j==0 else max(0,(actual[ai-1]['end']+actual[ai]['start'])/2)
    end=min(len(audio)/sr,actual[last_ai]['end']+.18) if j+1==len(boundaries) else (actual[last_ai]['end']+actual[min(last_ai+1,len(actual)-1)]['start'])/2
    samples=audio[round(start*sr):round(end*sr)].copy();duration=len(samples)/sr
    at=max(target,previous_end+.12) if j else target
    if at+duration>60:raise RuntimeError(f'{name} would exceed 60 seconds: {at:.2f}+{duration:.2f}. Refine phrase placement; do not speed the voice.')
    fade=min(round(.009*sr),len(samples)//4)
    samples[:fade]*=np.linspace(0,1,fade);samples[-fade:]*=np.linspace(1,0,fade)
    n=round(at*sr);timeline[n:n+len(samples)]+=samples
    text=' '.join(ref[ri:next_ri]);p={'id':name,'start':at,'end':at+duration,'duration':duration,'text':text,'source_start':start,'source_end':end,'reference_start':ri,'reference_end':next_ri,'voice':'Original synthetic male Spanish narrator','model':source['model'],'time_stretch':False}
    out.append(p);previous_end=at+duration
    groups=[]
    for k in range(ri,next_ri,7):
        last=min(k+7,next_ri)-1;wa=actual[index_at(k)];wb=actual[index_at(last)]
        groups.append({'start':max(at,at+wa['start']-start),'end':min(at+duration,at+wb['end']-start),'text':' '.join(ref[k:last+1])})
    p['captions']=groups
    print(f'{name}: {at:.3f}–{previous_end:.3f} ({duration:.3f}s)',flush=True)
sf.write(ROOT/'assets/voice/narration-timeline.wav',timeline,sr,subtype='PCM_24')
(ROOT/'assets/voice/narration-timing.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
# Map each fictional problem's entrance to the corresponding spoken words.
marks={}
for key,phrase in [('team','Un equipo'),('calendar','Hay partidos'),('photo','El marcador'),('table','todos quieren'),('solution','Con Bracket')]:
    ri=locate(phrase);wi=index_at(ri);piece=next(p for p in out if p['reference_start']<=ri<p['reference_end']);marks[key]=piece['start']+actual[wi]['start']-piece['source_start']
report={'coverage':coverage,'matched_words':len(mapping),'reference_words':len(rw),'spoken_words':len(aw),'markers':marks,'segments':out,'time_stretch':False}
(ROOT/'assets/voice/narration-v4-alignment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Content coverage:',coverage,'Markers:',marks,flush=True)
