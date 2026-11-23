"""Package the approved A only. Mixkit inputs, models and binaries stay local."""
from pathlib import Path
import json,hashlib,zipfile

root=Path(__file__).resolve().parent.parent
out=root/'final/bracket-a-entrega-v5.zip'
paths=[]
def add(name):
    p=root/name
    if not p.is_file():raise FileNotFoundError(p)
    paths.append(p)

for n in ['README.md','01-investigacion.md','02-direccion-creativa.md','03-video-a-storyboard.md','04-video-b-storyboard.md','05-video-c-opcional.md','06-produccion-y-calidad.md','07-video-a-guion-revision5-propuesta.md','ASSETS.md','QA.md','PRODUCTION-REVISION.md']:
    add(n)
for n in ['index.html','template.html','mobile-ui.js','product-v5.js','character.js','motion-film.js','build.mjs','render.mjs','serve.mjs','package.json','LEEME.md','beat-sheet.json','cues.json','narration-v5-script.json','generate-qwen-voice.py','download-voice-model.mjs','transcribe-voice.py','align-voice.py','voice-requirements.txt','export-narration.mjs','export-production-plan.py','snap-logo-beats.py','update-production-docs.py','download-audio.mjs','export-poster.mjs','check-capture.mjs','check-mobile.mjs','check-preview.mjs','check-demo-data.mjs','verify-delivery.py','write-qa.py','package-delivery.py']:
    add('video-a/'+n)
for folder in ['assets/original','assets/demo-data','assets/display']:
    paths.extend(p for p in (root/folder).glob('*') if p.is_file())
for n in ['narration-v5-continuous.wav','narration-v5-source.json','narration-v5-transcript.json','narration-v5-alignment.json','narration-timeline.wav','narration-clean.wav','narration-timing.json','narration-script.txt']:
    add('assets/voice/'+n)
for n in ['whoosh.ogg','click.ogg','pop.ogg','riser.ogg','impact.ogg','tick.ogg']:
    add('assets/audio/'+n)
for n in ['LICENCE-REVIEW.md','Qwen-APACHE-2.0.txt']:
    add('assets/licenses/'+n)
for n in ['requirements.txt','SOUND.md','CREDITS.txt','beatgrid.png','music-analysis.json','report.html']:
    add('sound-a/'+n)
for n in ['sound_pass.py','report.py','manifest.json']:
    add('sound-a/scripts/'+n)
paths.extend((root/'sound-a/checks').glob('cue-*.png'))
for n in ['bracket-a-60s.mp4','bracket-a-60s_silent.mp4','bracket-a-poster.png','bracket-a-es.srt','technical-qa.json']:
    add('final/'+n)
for n in ['composition-checks.json','mobile-checks.json','capture-equivalence.json','browser-capture.png','canvas-capture.png','a-master-contact-sheet.jpg','preview-playback.json']:
    add('review/'+n)
paths.extend(p for p in (root/'research').rglob('*') if p.is_file() and '__pycache__' not in str(p) and not p.name.endswith('install.log') and not p.name.startswith('voice-model-'))

paths=sorted(set(paths))
manifest=[]
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=4) as z:
    for p in paths:
        rel=p.relative_to(root).as_posix()
        assert 'mixkit-' not in rel and '.models/' not in rel
        z.write(p,'bracket-promo/'+rel)
        manifest.append({'file':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    z.writestr('bracket-promo/DELIVERY-MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Package: {out.name}; {len(paths)} files; {out.stat().st_size:,} bytes')
