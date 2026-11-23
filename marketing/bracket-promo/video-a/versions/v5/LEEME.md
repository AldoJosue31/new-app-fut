# Bracket — VIDEO A, revisión 5

«Más allá del amateur» · 60 s · 1080 × 1920 · 60 FPS. Historia de papel y Excel y solicitudes de rol/tabla/estadísticas, móvil Dark completo, entradas de pantallas y titulares, fondo de campo animado y nueva voz/música.

## Preview y edición

`index.html` contiene Poppins, Barlow Condensed y el PNG oficial incrustados. El audio procede de `../final/bracket-a-60s.mp4`. Mantener la estructura. Desde la raíz de campaña: `node video-a/serve.mjs`; abrir `http://127.0.0.1:4188/video-a/index.html`. Play, pausa y scrub; `?captions` activa subtítulos de apoyo, no quemados en el master.

Editar `mobile-ui.js` para controles/tokens, `character.js` para Dani y `motion-film.js` para historia, fondo, titulares, entradas y cierre. `template.html` contiene el preview. `build.mjs` genera el HTML e incrusta los tiempos de voz y marcadores narrativos. `beat-sheet.json` y `cues.json` registran escenas/sonidos. Guion de generación: `narration-v5-script.json`; guion efectivamente montado: `assets/voice/narration-script.txt`.

`window.VIDEO` y `window.seek(t)` permiten render independiente de cualquier fotograma. Sin timers ni estado entre frames en la composición. Viewport de 390 × 660 unidades, escala constante 2,15, base x=120/y=315; entradas acotadas a 36 px horizontal y 20 px vertical. Sin zoom ni perspectiva. `check-mobile.mjs` verifica límites y determinismo.

## Render

Node, Playwright/Chromium y FFmpeg. En copia independiente, ejecutar `npm install` y `npx playwright install chromium` desde `video-a/`. FFmpeg en PATH o `FFMPEG_PATH`. No modificar dependencias de la app.

Desde la raíz de campaña:

```text
node video-a/build.mjs
node video-a/check-mobile.mjs
node video-a/check-capture.mjs
node video-a/render.mjs video-a/index.html review/a-check.png --stills 1.4,4.5,9.8,14.7,18.5,37.6,49.2,58.6
node video-a/render.mjs video-a/index.html review/a-draft.mp4 30 1 4
node video-a/render.mjs video-a/index.html final/bracket-a-60s.mp4 60 4 4
```

El render escribe `*_silent.mp4`; mezcla posterior. Se conserva el renderer de explainer-default, adaptado a Windows/Canvas JPEG 95, cuatro muestras y obturador de 180°. Equivalencia PNG y acceso aleatorio comprobados. No ejecutar prepare.mjs ni ayudantes antiguos sobre esta versión.

## Narración

Los WAV entregados permiten remezclar sin descargar modelos. Para regenerar, crear un entorno aislado Python 3.11 con GPU NVIDIA compatible, instalar Torch/torchaudio CUDA desde su fuente oficial y luego `pip install -r video-a/voice-requirements.txt`. Producción usó Torch/torchaudio 2.11.0+cu128, Qwen-TTS 0.1.1, Transformers 4.57.3 y safetensors 0.8.0. No instalar en el entorno de Bracket.

```text
node video-a/download-voice-model.mjs
python video-a/generate-qwen-voice.py
python video-a/transcribe-voice.py
python video-a/align-voice.py
python video-a/export-production-plan.py
ffmpeg -y -i assets/voice/narration-timeline.wav -af highpass=f=65,lowpass=f=12000,acompressor=threshold=0.18:ratio=1.8:attack=15:release=180:makeup=1.05,loudnorm=I=-17:TP=-7:LRA=9 -ar 48000 -ac 2 assets/voice/narration-clean.wav
node video-a/export-narration.mjs
node video-a/build.mjs
```

El modelo VoiceDesign Apache 2.0 se descarga en `.models/qwen-voice-design` (~4,5 GB). Voz masculina sintética original, dirección conversacional en español mexicano, sin imitar una persona. Una toma continua de57,92s; solo recorte de silencios comprobados, sin timestretch o esperas insertadas. Acciones ajustadas a palabras reales. La transcripción comprueba contenido; no sustituye revisión auditiva humana. SRT con tiempos estimados por grupos de palabras.

En Windows el generador usa el backend oficial `pread` de safetensors para evitar el fallo mmap observado; parche limitado al proceso aislado. `transcribe-voice.py` añade las DLL de Torch al PATH desde `.voice-realistic`: usar ese nombre de entorno o adaptar esa ruta. Los pesos y entornos no se incluyen.

## Música y efectos

Leer `assets/licenses/LICENCE-REVIEW.md`. `node video-a/download-audio.mjs` descarga localmente «Tech House vibes» #130 y teclado #1392. Los originales Mixkit no acompañan las fuentes. Dependencias del sound pass: `sound-a/requirements.txt`, entorno independiente y FFmpeg en PATH.

```text
python sound-a/scripts/sound_pass.py --video final/bracket-a-60s_silent.mp4 --cues video-a/cues.json --music assets/audio/mixkit-130-tech-house-vibes.mp3 --manifest sound-a/scripts/manifest.json --out sound-a --music-db -9 --sfx-db -6 --voiceover assets/voice/narration-clean.wav --voice-timing assets/voice/narration-timing.json --music-source "Tech House vibes, Alejandro Magana (A. M.), Mixkit 130, https://mixkit.co/free-stock-music/" --music-license "Mixkit Stock Music Free License" --use-case "Instagram, TikTok, online advertising"
ffmpeg -y -i sound-a/after.mp4 -c copy -movflags +faststart final/bracket-a-60s.mp4
python video-a/verify-delivery.py
python video-a/write-qa.py
node video-a/export-poster.mjs
python video-a/package-delivery.py
```

Música alineada y ducking de 10 dB bajo voz. Medir el MP4 final: ~−16 LUFS, pico real menor de −4 dBFS en estéreo y mono. Informes: `sound-a/SOUND.md`, `report.html`, `beatgrid.png`, `checks/` y `CREDITS.txt`. El HTML de sonido permite revisar cues; conservar estructura. No usar `--preview-audio` para entregar: ese modo omite la verificación del MP4.

## Fidelidad

Interfaz reconstruida desde código, datos ficticios y tiempos resumidos. Escaneo ilustrativo con revisión → aplicar → guardar → confirmar. Sin medición de velocidad del proveedor ni publicación automática. Exportación y consulta pública son distintas. Dani y los mensajes son una historia editorial, no testimonios o mensajería de Bracket. Véanse ASSETS.md y QA.md. Solo A producido; B/C siguen como propuestas.

Pantallas nuevas: product-v5.js (rol, planteles, rendimiento y goleadores). update-production-docs.py sincroniza documentos con el guion y tiempos efectivos. check-demo-data.mjs necesita el código Bracket original en su ruta relativa; el render entregado no depende de la app.

Reajuste de beats al regenerar voz: renderizar borrador y ejecutar sound_pass.py con --preview-audio para medir cuadrícula; ejecutar python video-a/snap-logo-beats.py, python video-a/export-production-plan.py y node video-a/build.mjs antes del render final. No ejecutar align-voice.py después del snap sin repetir este ajuste. El paquete ya incluye los tiempos finales medidos.
