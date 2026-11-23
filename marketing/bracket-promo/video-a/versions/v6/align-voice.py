"""V5: keep one continuous performance; trim only verified long silent gaps."""
from pathlib import Path
import json,re,unicodedata,difflib
import numpy as np,soundfile as sf
ROOT=Path(__file__).resolve().parent.parent
source=json.loads((ROOT/'video-a/narration-v6-script.json').read_text(encoding='utf-8'))
tr=json.loads((ROOT/'assets/voice/narration-v6-transcript.json').read_text(encoding='utf-8'))
def norm(s):
    s=''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
    s=re.sub(r'[^a-z0-9]','',s)
    if s=='amater':return 'amateur'
    return 'bracket' if s in ['braquet','braket','brackett','bracke','bracket'] else s
raw_words=[dict(w) for w in tr['words'] if norm(w['word'])]
actual=[];i=0
while i<len(raw_words):
    w=raw_words[i]
    if norm(w['word'])=='descarga' and i+1<len(raw_words) and norm(raw_words[i+1]['word'])=='la':
        w={**w,'word':'Descárgala','end':raw_words[i+1]['end']};i+=1
    actual.append(w);i+=1
ref=source['text'].split();rw=[norm(w) for w in ref];aw=[norm(w['word']) for w in actual]
matcher=difflib.SequenceMatcher(None,rw,aw,autojunk=False)
mapping={a+i:b+i for a,b,n in matcher.get_matching_blocks() for i in range(n)}
coverage=len(mapping)/len(ref)
if coverage<.95:raise RuntimeError('Spoken content requires review: '+str(coverage))
audio,sr=sf.read(ROOT/'assets/voice/narration-v6-continuous.wav',dtype='float32')
start=max(0,actual[0]['start']-.10);end=min(len(audio)/sr,actual[-1]['end']+.18)
cuts=[]
for left,right in zip(actual,actual[1:]):
    gap=right['start']-left['end']
    if gap<=.75:continue
    a=left['end']+.075;b=right['start']-.075
    chunk=audio[round(a*sr):round(b*sr)]
    if len(chunk) and np.sqrt(np.mean(chunk**2))<.008 and np.max(np.abs(chunk))<.065:
        remove=max(0,gap-.72);center=(a+b)/2
        remove=min(remove,b-a)
        if remove>.05:cuts.append((center-remove/2,center+remove/2))
chunks=[];cursor=start
for a,b in cuts:
    chunks.append(audio[round(cursor*sr):round(a*sr)].copy());cursor=b
chunks.append(audio[round(cursor*sr):round(end*sr)].copy())
for j,p in enumerate(chunks):
    f=min(round(.008*sr),len(p)//4)
    if j:p[:f]*=np.linspace(0,1,f)
    if j+1<len(chunks):p[-f:]*=np.linspace(1,0,f)
performance=np.concatenate(chunks);offset=.12
if offset+len(performance)/sr>59.35:raise RuntimeError('Performance exceeds delivery budget; regenerate at a brisker natural pace.')
timeline=np.zeros(60*sr,dtype=np.float32);n=round(offset*sr);timeline[n:n+len(performance)]=performance
sf.write(ROOT/'assets/voice/narration-timeline.wav',timeline,sr,subtype='PCM_24')
def edited_time(x):
    return offset+x-start-sum(max(0,min(x,b)-a) for a,b in cuts if x>a)
def idx(ri):
    if ri in mapping:return mapping[ri]
    nearest=min(mapping,key=lambda k:abs(k-ri))
    return max(0,min(len(actual)-1,mapping[nearest]+ri-nearest))
def locate(phrase):
    p=[norm(w) for w in phrase.split()]
    for j in range(len(rw)-len(p)+1):
        if rw[j:j+len(p)]==p:return j
    raise ValueError('Missing reference phrase: '+phrase)
def word_time(phrase):
    return edited_time(actual[idx(locate(phrase))]['start'])
T={
 'transcribe':word_time('y lo pasa a Excel'),
 'requests':word_time('Pero llega la jornada'),
 'chatOpen':word_time('el chat no para')-.08,
 'qRole':word_time('Ya está el rol'),
 'qTable':word_time('Cómo quedó la tabla'),
 'qGoals':word_time('Cuántos goles llevo'),
 'qMatches':word_time('Cuántos partidos jugué'),
 'qCards':word_time('Y mis amarillas'),
 'playerRequests':word_time('Cuántos goles llevo'),
 'intro':word_time('Con Bracket'),
 'schedule':word_time('Organiza los encuentros'),
 'adjust':word_time('ajusta los horarios')+.25,
 'roleOpen':word_time('descarga el rol')-.05,
 'roleDownload':word_time('para compartirlo')+.2,
 'result':word_time('Al terminar'),
 'playerSelected':word_time('quién jugó')+.08,
 'goalRegistered':word_time('los goles y las tarjetas')+.10,
 'cardRegistered':word_time('las tarjetas')+.12,
 'photo':word_time('cargar la cédula')-.1,
 'review':word_time('revisar su lectura')-.08,
 'confirm':word_time('confirmar el resultado')-.1,
 'stats':word_time('Consulta el rendimiento')-.05,
 'scorers':word_time('y los goleadores')-.05,
 'scorersExport':word_time('con los datos')+.1,
 'standings':word_time('Los resultados se reflejan')-.05,
 'tableExport':word_time('Descárgala como imagen')-.05,
 'public':word_time('O habilita')-.05,
 'publicView':word_time('la clasificación desde')-.05,
 'closing':word_time('Organiza tu liga')-.05,
 'brand':word_time('Bracket. Más allá')-.02,
 'tagline':word_time('Más allá del amateur')-.02,
}
T['scanStart']=T['photo']+.16
T['scheduleConfirm']=T['roleOpen']-.28
T['statsGoal']=T['stats']+(T['scorers']-T['stats'])*.36
T['statsCards']=T['stats']+(T['scorers']-T['stats'])*.72
T['resultSaved']=T['confirm']+(T['stats']-T['confirm'])*.8
T['introReveal']=T['intro']+.3
period=.4906666667
ideal=T['brand']+.22
T['logoReveal']=T['introReveal']+round((ideal-T['introReveal'])/period)*period
if abs(T['logoReveal']-ideal)>.13:T['logoReveal']=ideal
parts=[];ri=0
for j,s in enumerate(source['scenes']):
    count=len(s['text'].split());last=ri+count-1
    a=edited_time(actual[idx(ri)]['start']);b=edited_time(actual[idx(last)]['end'])
    groups=[]
    for k in range(ri,ri+count,6):
        z=min(k+5,last)
        groups.append({'start':max(a,edited_time(actual[idx(k)]['start'])),'end':min(b,edited_time(actual[idx(z)]['end'])),'text':' '.join(ref[k:z+1])})
    parts.append({'id':s['id'],'start':a,'end':b,'duration':b-a,'text':s['text'],'captions':groups,'voice':'Original synthetic Spanish narrator','model':source['model'],'time_stretch':False})
    ri+=count
gaps=[{'after':p['word'],'before':q['word'],'seconds':round(edited_time(q['start'])-edited_time(p['end']),3)} for p,q in zip(actual,actual[1:])]
report={'coverage':coverage,'matched_words':len(mapping),'reference_words':len(ref),'spoken_words':len(actual),'unmatched_reference':[ref[i] for i in range(len(ref)) if i not in mapping],'markers':T,'segments':parts,'time_stretch':False,'offset':offset,'raw_duration':len(audio)/sr,'performed_duration':len(performance)/sr,'speech_end':offset+len(performance)/sr,'silent_cuts':[{'start':a,'end':b,'removed':b-a} for a,b in cuts],'max_interword_gap_s':max(g['seconds'] for g in gaps),'interword_gaps_over_450ms':[g for g in gaps if g['seconds']>.45]}
(ROOT/'assets/voice/narration-timing.json').write_text(json.dumps(parts,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'assets/voice/narration-v6-alignment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='segments'},ensure_ascii=False,indent=2),flush=True)
