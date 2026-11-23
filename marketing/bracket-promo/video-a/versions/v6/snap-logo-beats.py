"""Snap only the two logo reveals to the measured kick-corrected beat grid."""
from pathlib import Path
import json
r=Path(__file__).resolve().parent.parent
p=r/'assets/voice/narration-v6-alignment.json';a=json.loads(p.read_text(encoding='utf-8'))
b=json.loads((r/'sound-a/music-analysis.json').read_text(encoding='utf-8'))
changes={}
for key in ['introReveal','logoReveal']:
    before=a['markers'][key];beat=min(b['corrected_video_beats_s'],key=lambda t:abs(t-before))
    if abs(beat-before)>.16:raise RuntimeError('Beat adjustment exceeds the permitted 160ms window.')
    after=round(beat*60)/60
    a['markers'][key]=after;changes[key]={'before':before,'measured_beat':beat,'after_frame_snap':after}
a['beat_snap']=changes
p.write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8')
(r/'research/v6-logo-beat-snap.json').write_text(json.dumps(changes,indent=2),encoding='utf-8')
print(json.dumps(changes,indent=2))
