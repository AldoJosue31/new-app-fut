"""Verify encoded audio, decoded samples and stream timing against a reference."""
from pathlib import Path
import subprocess,json,sys,shutil
r=Path(__file__).resolve().parent.parent
ff=r/'.tools/ffmpeg.exe';fp=r/'.tools/ffprobe.exe'
if not ff.exists():ff=shutil.which('ffmpeg') or 'ffmpeg'
if not fp.exists():fp=shutil.which('ffprobe') or 'ffprobe'
reference=Path(sys.argv[1]).resolve();current=Path(sys.argv[2]).resolve()
def run(args):
    p=subprocess.run([str(x) for x in args],capture_output=True,text=True,encoding='utf-8',errors='replace',check=True)
    return p.stdout.strip()
def measure(p):
    encoded=run([ff,'-v','error','-i',p,'-map','0:a:0','-c:a','copy','-f','hash','-hash','sha256','-'])
    decoded=run([ff,'-v','error','-i',p,'-map','0:a:0','-c:a','pcm_s16le','-f','hash','-hash','sha256','-'])
    timing=json.loads(run([fp,'-v','error','-select_streams','a:0','-show_entries','stream=codec_name,sample_rate,channels,time_base,start_pts,start_time,duration_ts,duration,nb_frames','-of','json',p]))['streams'][0]
    return {'file':p.name,'encoded_sha256':encoded,'pcm_s16le_sha256':decoded,'stream':timing}
a=measure(reference);b=measure(current)
data={'reference':a,'current':b,'encoded_audio_identical':a['encoded_sha256']==b['encoded_sha256'],'decoded_audio_identical':a['pcm_s16le_sha256']==b['pcm_s16le_sha256'],'timing_identical':a['stream']==b['stream']}
assert all(data[k] for k in ['encoded_audio_identical','decoded_audio_identical','timing_identical']),data
(r/'review/audio-reuse-check.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(data,ensure_ascii=False))
