# VIDEO A — revisión6

60s,1080×1920,60FPS. Mantener estructura del paquete; audio desde ../final/bracket-a-60s.mp4. Desde raíz: node video-a/serve.mjs y abrir http://127.0.0.1:4188/video-a/index.html. ?captions activa SRT de apoyo.

Editar character.js para poses writing/typing/phone y expresiones; motion-film.js para chat/historia/entradas/cierre; mobile-ui.js y product-v5.js para interfaz real reconstruida. build.mjs incrusta PNG/fuentes y tiempos de narration-v6-alignment.json. El módulo product-v5 se comparte; no es un render histórico.

Requisitos aislados: Node/Playwright/Chromium y FFmpeg/ffprobe en PATH o .tools. No modificar dependencias de la app. En copia separada, npm install y npx playwright install chromium desde video-a/.

Render y QA, desde raíz:
1. node video-a/build.mjs
2. node video-a/check-mobile.mjs
3. node video-a/check-story-pose.mjs
4. node video-a/check-capture.mjs
5. node video-a/render.mjs video-a/index.html review/draft.mp4 30 1 4
6. Pasada sound_pass.py con --preview-audio para beats; python video-a/snap-logo-beats.py; python video-a/export-production-plan.py; node video-a/build.mjs.
7. node video-a/render.mjs video-a/index.html final/bracket-a-60s.mp4 60 4 4
8. Pasada final sin --preview-audio; ffmpeg -y -i sound-a/after.mp4 -c copy -movflags +faststart final/bracket-a-60s.mp4
9. python video-a/verify-delivery.py; python video-a/write-qa.py; node video-a/export-poster.mjs; python video-a/package-delivery.py.

Renderer explainer-default, Windows/CanvasJPEG95,4muestras y180°. No ejecutar ayudantes antiguos prepare.mjs. seek(t) independiente y determinista, sin estado de fotogramas anteriores.

## Voz
Los WAV permiten remezclar sin modelo. Regeneración opcional en entorno Python3.11/.voice-realistic con CUDA NVIDIA: Torch/torchaudio2.11.0+cu128, luego pip install -r video-a/voice-requirements.txt.
- node video-a/download-voice-model.mjs
- python video-a/generate-qwen-voice.py video-a/narration-v6-script.json
- python video-a/transcribe-voice.py narration-v6
- python video-a/align-voice.py
- ffmpeg -y -i assets/voice/narration-timeline.wav -af highpass=f=65,lowpass=f=12000,acompressor=threshold=0.25:ratio=1.3:attack=18:release=190:makeup=1.01,loudnorm=I=-17:TP=-7:LRA=11 -ar 48000 -ac 2 assets/voice/narration-clean.wav
- python video-a/export-production-plan.py; node video-a/export-narration.mjs; node video-a/build.mjs.

Modelo Apache2.0 en .models/qwen-voice-design(~4,5GB), excluido del ZIP. Generador usa backend pread de safetensors para Windows; transcriptor añade DLL de Torch desde .voice-realistic. Voz original sintética, dirección por contexto, sin referencia de persona. Entrada fonética solo para Bracket/amateur; guion/SRT/eslogan conservan escritura original.

analyze-voice-contexts.py estimaF0/energía por contexto; no evalúa realismo subjetivo. Mantener transcripción y WAV para escucha. Si cambia texto, adaptar frases de anclaje en align-voice.py y regenerar antes del render. No ejecutar align después de snap sin repetir beats/build/render.

## Sonido
Leer assets/licenses/LICENCE-REVIEW.md. node video-a/download-audio.mjs recupera Mixkit130/1392 localmente; originales no van en el paquete. pip install -r sound-a/requirements.txt en entorno separado, FFmpeg en PATH.

Comando:
python sound-a/scripts/sound_pass.py --video final/bracket-a-60s_silent.mp4 --cues video-a/cues.json --music assets/audio/mixkit-130-tech-house-vibes.mp3 --manifest sound-a/scripts/manifest.json --out sound-a --music-db -9 --sfx-db -6 --voiceover assets/voice/narration-clean.wav --voice-timing assets/voice/narration-timing.json --music-source "Tech House vibes, Alejandro Magana (A. M.), Mixkit130, https://mixkit.co/free-stock-music/" --music-license "Mixkit Stock Music Free License" --use-case "Instagram, TikTok, online advertising"

Para preview añadir --preview-audio sound-a/preview-audio-v6.m4a y usar borrador como --video. Ese modo no certifica MP4 final. Medir exportado: ~−16LUFS, pico<−4dBFS estéreo/mono. Un sonido por cue, gain_offset_db permite graduar avisos. Offset busca minimizar máximo error de los logos; snap limita movimiento a160ms antes del render definitivo.

Permisos/producto y datos ficticios en investigación/ASSETS/QA. Chat externo, no módulo Bracket; Excel no se importa. Teléfono final renderiza clasificación pública habilitada. Escaneo ilustrativo con revisión humana. check-demo-data.mjs requiere el repo app en ruta relativa; el render entregado no depende de servicios o credenciales.
