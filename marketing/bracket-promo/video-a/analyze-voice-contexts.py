"""Estimate pitch/energy by context; this does not judge perceived naturalness."""
from pathlib import Path
import json
import numpy as np,soundfile as sf,librosa
from scipy.signal import medfilt
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
r=Path(__file__).resolve().parent.parent
a=json.loads((r/'assets/voice/narration-v6-alignment.json').read_text(encoding='utf-8'));t=a['markers']
y,sr=sf.read(r/'assets/voice/narration-clean.wav',dtype='float32')
if y.ndim>1:y=y.mean(axis=1)
step=sr//12000;y=y[::step];sr=sr//step
hop=120;frame=768
f0=librosa.yin(y,fmin=65,fmax=380,sr=sr,frame_length=frame,hop_length=hop)
rms=librosa.feature.rms(y=y,frame_length=frame,hop_length=hop)[0];tm=librosa.times_like(f0,sr=sr,hop_length=hop)
f0=medfilt(f0,5);valid=(rms>.013)&(f0>70)&(f0<350)
sections=[('Papel / Excel',.12,t['chatOpen']),('Preguntas / presión',t['qRole'],t['intro']),('Alivio / Bracket',t['intro'],t['schedule']),('Demostración',t['schedule'],t['closing']),('Cierre',t['closing'],a['speech_end'])]
report=[];fig,ax=plt.subplots(figsize=(12,3.5));ax.plot(tm,np.where(valid,f0,np.nan),lw=.7,color='#0b88b5')
colors=['#d6e6ee','#d5efff','#dbf4eb','#e9f0f4','#def0f8']
for (label,lo,hi),color in zip(sections,colors):
    v=f0[valid&(tm>=lo)&(tm<hi)]
    if not len(v):continue
    p10,median,p90=np.percentile(v,[10,50,90])
    report.append({'context':label,'start':lo,'end':hi,'median_hz':float(median),'p10_hz':float(p10),'p90_hz':float(p90),'p10_p90_semitones':float(12*np.log2(p90/p10))})
    ax.axvspan(lo,hi,color=color,alpha=.5,zorder=-1);ax.text((lo+hi)/2,340,label,ha='center',fontsize=7)
ax.set(xlim=(0,60),ylim=(65,355),xlabel='Segundos',ylabel='F0 estimada (Hz)',title='Voz V6 — variación estimada por contexto; no mide naturalidad percibida')
fig.tight_layout();fig.savefig(r/'review/voice-contexts.png',dpi=150);plt.close(fig)
out={'method':'librosa.yin; 12kHz; 10ms hop; voiced energy mask; median filter','limitation':'Pitch estimation alone does not establish naturalness, emotion or subjective quality. No pitch-shift was applied.','contexts':report}
(r/'review/voice-contexts.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))
