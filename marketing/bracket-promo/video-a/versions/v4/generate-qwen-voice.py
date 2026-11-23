"""Original synthetic narrator from a voice description; no real-person reference."""
import os,json,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
os.environ.setdefault('HF_HOME',str(ROOT/'.models/hf-cache'))
os.environ.setdefault('TOKENIZERS_PARALLELISM','false')
import torch,numpy as np,soundfile as sf
from qwen_tts import Qwen3TTSModel
# Windows copy-on-write mmap can exhaust commit while loading large checkpoints.
# Use safetensors' official pread backend in this isolated generation process.
if os.name=='nt':
    import safetensors, safetensors.torch, transformers.modeling_utils
    from functools import partial
    safe_pread=partial(safetensors.safe_open,backend='pread')
    transformers.modeling_utils.safe_open=safe_pread
    safetensors.torch.safe_open=safe_pread
plan=json.loads((ROOT/'video-a/narration-v4-script.json').read_text(encoding='utf-8'))
if not torch.cuda.is_available():raise RuntimeError('CUDA voice generation requires the installed GPU runtime.')
torch.manual_seed(plan['seed']);torch.cuda.manual_seed_all(plan['seed']);torch.set_num_threads(4)
print('GPU:',torch.cuda.get_device_name(0),'Torch:',torch.__version__,flush=True)
t0=time.time()
model=Qwen3TTSModel.from_pretrained(str(ROOT/'.models/qwen-voice-design'),device_map='cuda:0',dtype=torch.bfloat16,attn_implementation='sdpa')
print('Model loaded in',round(time.time()-t0,1),'seconds',flush=True)
speech=plan['text'].replace('Bracket','Bráquet')
wavs,sr=model.generate_voice_design(text=speech,language=plan['language'],instruct=plan['direction'],max_new_tokens=1500,do_sample=True,temperature=.8,top_p=.95,repetition_penalty=1.05)
samples=np.asarray(wavs[0],dtype=np.float32).reshape(-1)
duration=len(samples)/sr
if not 25<duration<80:raise RuntimeError(f'Unexpected voice duration: {duration}')
out=ROOT/'assets/voice';out.mkdir(exist_ok=True)
sf.write(out/'narration-v4-continuous.wav',samples,sr,subtype='PCM_24')
meta={**plan,'duration':duration,'sample_rate':sr,'generation_seconds':time.time()-t0,'gpu':torch.cuda.get_device_name(0),'torch':torch.__version__,'reference_person':None,'source_file':'assets/voice/narration-v4-continuous.wav'}
(out/'narration-v4-source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'duration':duration,'sample_rate':sr,'generation_seconds':time.time()-t0}),flush=True)
