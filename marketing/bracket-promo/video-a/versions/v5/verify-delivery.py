"""Measure the delivered streams and capture the exported picture for review."""
from pathlib import Path
import subprocess,json,hashlib,re,shutil
from PIL import Image,ImageChops,ImageDraw

root=Path(__file__).resolve().parent.parent
ffmpeg=root/'.tools/ffmpeg.exe';ffprobe=root/'.tools/ffprobe.exe'
if not ffmpeg.exists():ffmpeg=shutil.which('ffmpeg') or 'ffmpeg'
if not ffprobe.exists():ffprobe=shutil.which('ffprobe') or 'ffprobe'
def run(args):
    p=subprocess.run([str(a) for a in args],capture_output=True,text=True,encoding='utf-8',errors='replace')
    if p.returncode:raise RuntimeError(p.stderr[-3000:])
    return p
def probe(name):
    return json.loads(run([ffprobe,'-v','error','-show_streams','-show_format','-of','json',root/'final'/name]).stdout)
master=probe('bracket-a-60s.mp4');silent=probe('bracket-a-60s_silent.mp4')
v=next(s for s in master['streams'] if s['codec_type']=='video')
a=next(s for s in master['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'])==(1080,1920)
assert v['r_frame_rate']=='60/1' and v['codec_name']=='h264' and v['pix_fmt']=='yuv420p'
assert int(v['nb_frames'])==3600 and abs(float(master['format']['duration'])-60)<.1
assert a['codec_name']=='aac' and a['channels']==2
assert len(silent['streams'])==1 and silent['streams'][0]['codec_type']=='video'
aud={}
for mode in ['stereo','mono']:
    cmd=[ffmpeg,'-nostats','-i',root/'final/bracket-a-60s.mp4']
    if mode=='mono':cmd+=['-ac','1']
    p=run(cmd+['-af','ebur128=peak=true','-f','null','-'])
    summary=p.stderr[p.stderr.rfind('Summary:'):]
    loud=float(re.search(r'I:\s*(-?[\d.]+) LUFS',summary)[1])
    peak=float(re.search(r'Peak:\s*(-?[\d.]+) dBFS',summary)[1])
    assert abs(loud+16)<=.5 and peak < -4
    aud[mode]={'integrated_lufs':loud,'true_peak_dbfs':peak,'ffmpeg_summary':summary}
decode=run([ffmpeg,'-v','error','-i',root/'final/bracket-a-60s.mp4','-f','null','-'])
assert not decode.stderr.strip(),decode.stderr
img1=Image.open(root/'review/browser-capture.png').convert('RGB')
img2=Image.open(root/'review/canvas-capture.png').convert('RGB')
diff=ImageChops.difference(img1,img2).getbbox()
assert diff is None
(root/'review/capture-equivalence.json').write_text(json.dumps({'pixel_identical':True,'difference_bbox':diff}),encoding='utf-8')
logo=root/'assets/original/logo_app.png'
assert hashlib.sha256(logo.read_bytes()).hexdigest()=='8fdfd91bbc70c43ce0b3fd13683c8ec5563a913d4c70e5bb411620b776179217'
alignment=json.loads((root/'assets/voice/narration-v5-alignment.json').read_text(encoding='utf-8'))
t=alignment['markers']
times=[1.4,t['requests']+.6,t['playerRequests']+1,t['intro']+.7,t['adjust']+.4,t['roleDownload']+.5,t['cardRegistered']+.2,(t['scanStart']+t['review'])/2,t['review']+.6,t['resultSaved']+.1,t['statsCards']+.15,(t['scorers']+t['scorersExport'])/2,t['scorersExport']+.8,t['standings']+1,t['tableExport']+1.5,(t['public']+t['publicView'])/2,t['publicView']+.7,t['closing']+1.2,t['logoReveal']+.1,t['tagline']+.2,58.5]
sheet=Image.new('RGB',(1080,((len(times)+2)//3)*674),'#14252c');d=ImageDraw.Draw(sheet)
scratch=root/'review/master-qa-frame.png'
for i,t in enumerate(times):
    run([ffmpeg,'-v','error','-y','-ss',str(t),'-i',root/'final/bracket-a-60s.mp4','-frames:v','1',scratch])
    im=Image.open(scratch).convert('RGB');im.thumbnail((354,630))
    x=(i%3)*360+3;y=(i//3)*674+28
    sheet.paste(im,(x,y));d.text((x,y-21),f'{t:.2f} s',fill='white')
scratch.unlink()
sheet.save(root/'review/a-master-contact-sheet.jpg',quality=92)
data={'master':master,'silent':silent,'audio':aud,'decode_errors':False,'logo_sha256':hashlib.sha256(logo.read_bytes()).hexdigest(),'canvas_equals_browser':True,'composition_checks':json.loads((root/'review/composition-checks.json').read_text()),'contact_sheet_times':times}
(root/'final/technical-qa.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'video':{'dimensions':[1080,1920],'fps':60,'frames':3600,'duration':master['format']['duration']},'audio':aud,'silent_has_audio':False},ensure_ascii=False,indent=2))
