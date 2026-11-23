"""Refresh exported-frame/waveform proofs, preserving the approved V6 audio."""
from pathlib import Path
import subprocess,json,shutil
import numpy as np,soundfile as sf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
r=Path(__file__).resolve().parent.parent
ff=r/'.tools/ffmpeg.exe';video=r/'final/bracket-a-60s.mp4';tmp=r/'sound-a/scratch';tmp.mkdir(exist_ok=True)
if not ff.exists():ff=shutil.which('ffmpeg') or 'ffmpeg'
def run(args):
    q=subprocess.run([str(x) for x in args],capture_output=True,text=True,encoding='utf-8',errors='replace')
    if q.returncode:raise RuntimeError(q.stderr[-2000:])
    return q.stdout
wav=tmp/'v7-exported-audio.wav'
run([ff,'-v','error','-y','-i',video,'-ac','1','-ar','48000',wav]);au,sr=sf.read(wav,dtype='float32')
cues=json.loads((r/'video-a/cues.json').read_text(encoding='utf-8'))
for i,c in enumerate(cues):
    imgs=[]
    for tag,dt in [('a',-.1),('b',.15)]:
        p=tmp/f'v7-cue-{i}-{tag}.png'
        run([ff,'-v','error','-y','-ss',f"{max(0,c['t']+dt):.3f}",'-i',video,'-frames:v','1','-vf','scale=320:-1',p]);imgs.append(p)
    fig,ax=plt.subplots(1,3,figsize=(12,2.6),gridspec_kw={'width_ratios':[1,1,2]})
    for j,p in enumerate(imgs):ax[j].imshow(plt.imread(p));ax[j].axis('off');ax[j].set_title('before cue' if j==0 else 'after cue')
    lo=max(0,c['t']-.5);hi=min(60,c['t']+.8);seg=au[int(lo*sr):int(hi*sr)]
    ax[2].plot(np.linspace(lo,hi,len(seg)),seg,lw=.4);ax[2].axvline(c['t'],color='r');ax[2].set_title(f"cue {i} @ {c['t']:.2f}s {c['type']} — audio approved V6",fontsize=8)
    plt.tight_layout();fig.savefig(r/f'sound-a/checks/cue-{i:02d}.png',dpi=80);plt.close(fig)
print(f'Refreshed {len(cues)} proofs from V7 exported MP4; audio not remixed.')
