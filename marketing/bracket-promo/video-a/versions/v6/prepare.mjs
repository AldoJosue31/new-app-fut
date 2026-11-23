import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const campaign = fileURLToPath(new URL('../', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const skill = 'C:/Users/Aldo/.agents/skills';
for (const d of ['assets/original','assets/audio','assets/licenses','review','final','.tools','sound-a/scripts']) fs.mkdirSync(path.join(campaign,d),{recursive:true});
for (const name of ['logo_app.png','fonts/poppins/poppins-latin-400.woff2','fonts/poppins/poppins-latin-600.woff2','fonts/poppins/poppins-latin-700.woff2','fonts/poppins/OFL.txt']) fs.copyFileSync(path.join(root,'public',name),path.join(campaign,'assets/original',path.basename(name)));
for (const [from,to] of [
 ['hyperframes-bracket-promo/node_modules/ffmpeg-static/ffmpeg.exe','.tools/ffmpeg.exe'],
 ['hyperframes-bracket-promo/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe','.tools/ffprobe.exe'],
 ['hyperframes-bracket-promo/node_modules/ffmpeg-static/ffmpeg.exe.LICENSE','.tools/ffmpeg.LICENSE'],
]) { const dest=path.join(campaign,to); if(!fs.existsSync(dest))fs.copyFileSync(path.join(root,from),dest); }
const md=fs.readFileSync(path.join(skill,'explainer-default/SKILL.md'),'utf8');
const begin=md.indexOf('// render.mjs:');
let renderer=md.slice(begin,md.indexOf('\n```',begin));
renderer=renderer.replace("import { pathToFileURL } from 'node:url';", "import { pathToFileURL, fileURLToPath } from 'node:url';");
renderer=renderer.replace("import { writeFileSync, mkdirSync, rmSync } from 'node:fs';", "import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';");
renderer=renderer.replace("const [, , html, out,", "const localFFmpeg = fileURLToPath(new URL('../.tools/ffmpeg.exe', import.meta.url));\nconst FFMPEG = process.env.FFMPEG_PATH || (existsSync(localFFmpeg) ? localFFmpeg : 'ffmpeg');\nconst [, , html, out,");
renderer=renderer.replaceAll("spawn('ffmpeg',",'spawn(FFMPEG,');
renderer=renderer.replace("...(proxy ? { proxy: { server: proxy } } : {})", "...(proxy ? { proxy: { server: proxy } } : {})");
renderer=renderer.replace("path.resolve(s)}'", "path.resolve(s).replace(/\\\\/g, '/')}'");
// Additional adaptations: strict encoder checks, Windows concat, bounded sample render.
renderer=renderer.replace("const a = w * per, b = Math.min(N, a + per);", "const start = Number(process.env.RENDER_START || 0); const end = Number(process.env.RENDER_END || V.duration); const a = Math.max(w * per, Math.floor(start * fps)), b = Math.min(N, (w + 1) * per, Math.ceil(end * fps));");
renderer=renderer.replace("ff.stdin.end(); await closed; await page.close();", "ff.stdin.end(); const code = await closed; if (code) throw new Error('FFmpeg worker failed: ' + code); await page.close();");
renderer=renderer.replace("'-r', String(fps), '-c:v'", "'-threads', '2', '-r', String(fps), '-c:v'");
renderer=renderer.replace("await run(['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);", "await run(['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', silent]);");
renderer=renderer.replace("if (hasAudio) {", "if (hasAudio && !process.env.RENDER_START && !process.env.RENDER_END && process.env.RENDER_AUDIO === '1') {");
renderer=renderer.replace("const shot = async (page, t) => { await page.evaluate(t => window.seek(t), t); return page.screenshot({ type: 'jpeg', quality: 95 }); };", "const shot = async (page, t) => { const encoded = await page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas#film'); return c ? c.toDataURL('image/jpeg', .95).split(',')[1] : null; }, t); return encoded ? Buffer.from(encoded, 'base64') : page.screenshot({ type:'jpeg', quality:95 }); };");
fs.writeFileSync(path.join(campaign,'video-a/render.mjs'),renderer+'\n');
for (const name of ['click','whoosh','pop','riser','impact','tick']) fs.copyFileSync(path.join(skill,'sound-effects/sfx/kit',name+'.ogg'),path.join(campaign,'assets/audio',name+'.ogg'));
for (const name of ['sound_pass.py','report.py']) fs.copyFileSync(path.join(skill,'sound-effects/scripts',name),path.join(campaign,'sound-a/scripts',name));
let sound=fs.readFileSync(path.join(campaign,'sound-a/scripts/sound_pass.py'),'utf8');
// Keep the skill's analysis/mix pipeline; fix POSIX scratch paths and Windows encoding only.
sound=sound.replace("import argparse,json,os,re,subprocess,random", "import argparse,json,os,re,subprocess,random,tempfile\nfrom pathlib import Path");
sound=sound.replace("A=ap.parse_args();", "A=ap.parse_args(); TMP=os.path.join(A.out,'scratch'); os.makedirs(TMP,exist_ok=True);");
sound=sound.replaceAll("'/tmp/after_audio.wav'", "os.path.join(TMP,'after_audio.wav')");
sound=sound.replaceAll("f'/tmp/cue{k}{tag}.png'", "os.path.join(TMP,f'cue{k}{tag}.png')");
sound=sound.replace("run=lambda c:subprocess.run(c,capture_output=True,text=True)", "run=lambda c:subprocess.run(c,capture_output=True,text=True,encoding='utf-8',errors='replace')");
sound=sound.replace("seg=seg*10**(A.music_db/20)", "seg=seg*10**(A.music_db/20); fin=min(len(seg),int(.35*SR)); seg[:fin]*=np.linspace(0,1,fin)[:,None]");
sound=sound.replaceAll("open(A.cues)","open(A.cues,encoding='utf-8')").replaceAll("open(A.manifest)","open(A.manifest,encoding='utf-8')").replaceAll("open(A.swaps)","open(A.swaps,encoding='utf-8')");
sound=sound.replace("open(f'{A.out}/CREDITS.txt','w')", "open(f'{A.out}/CREDITS.txt','w',encoding='utf-8')").replace("open(f'{A.out}/SOUND.md','w')", "open(f'{A.out}/SOUND.md','w',encoding='utf-8')");
fs.writeFileSync(path.join(campaign,'sound-a/scripts/sound_pass.py'),sound);
let report=fs.readFileSync(path.join(campaign,'sound-a/scripts/report.py'),'utf8').replace("open(os.path.join(out,'report.html'),'w')", "open(os.path.join(out,'report.html'),'w',encoding='utf-8')");
fs.writeFileSync(path.join(campaign,'sound-a/scripts/report.py'),report);
const original=JSON.parse(fs.readFileSync(path.join(skill,'sound-effects/sfx/manifest.json'),'utf8'));
const fix=e=>({...e,file:e.file?'../../assets/audio/'+path.basename(e.file):e.file});
const used=original.default_kit.filter(e=>e.file);
const manifest={...original,bundled:used.map(fix),default_kit:original.default_kit.map(fix),runtime:original.runtime.filter(e=>e.category==='typing'),alt_categories:Object.fromEntries(used.map(e=>[e.category,[e.category]]))};
manifest.default_kit.find(e=>e.category==='typing').file='../../assets/audio/mixkit-1392-typing.mp3';
fs.writeFileSync(path.join(campaign,'sound-a/scripts/manifest.json'),JSON.stringify(manifest,null,2));
console.log('Prepared exact brand assets, local FFmpeg and skill render/sound scripts.');
