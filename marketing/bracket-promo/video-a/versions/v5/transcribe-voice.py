"""Check the generated spoken performance and recover natural phrase boundaries."""
import os,json,time,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
prefix=sys.argv[1] if len(sys.argv)>1 else 'narration-v5'
torchlib=ROOT/'.voice-realistic/Lib/site-packages/torch/lib'
os.environ['PATH']=str(torchlib)+os.pathsep+os.environ['PATH']
handle=os.add_dll_directory(str(torchlib))
from faster_whisper import WhisperModel
t0=time.time()
model=WhisperModel('small',device='cuda',compute_type='float16',download_root=str(ROOT/'.models/whisper'))
segments,info=model.transcribe(str(ROOT/'assets/voice'/(prefix+'-continuous.wav')),language='es',beam_size=5,word_timestamps=True,vad_filter=True,initial_prompt='Bracket. Dani. Excel. Jornada. Cédula. Clasificación. Amarillas.')
result=[];words=[]
for s in segments:
    result.append({'start':s.start,'end':s.end,'text':s.text})
    words.extend({'start':w.start,'end':w.end,'word':w.word,'probability':w.probability} for w in s.words or [])
out={'language':info.language,'duration':info.duration,'segments':result,'words':words,'elapsed_seconds':time.time()-t0}
(ROOT/'assets/voice'/(prefix+'-transcript.json')).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'duration':info.duration,'text':' '.join(s['text'] for s in result),'words':len(words),'elapsed_seconds':time.time()-t0},ensure_ascii=False),flush=True)
