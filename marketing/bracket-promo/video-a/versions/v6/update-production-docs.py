"""Document V6 from the delivered take, character states and measured timing."""
from pathlib import Path
import json
r=Path(__file__).resolve().parent.parent
a=json.loads((r/'assets/voice/narration-v6-alignment.json').read_text(encoding='utf-8'));t=a['markers']
def put(name,text):(r/name).write_text(text,encoding='utf-8')
put('README.md',"""# Bracket — Más allá del amateur

VIDEO A, revisión6. Dani escribe en papel, transcribe en la laptop y recibe preguntas en un chat externo que se acumulan con tensión creciente. Solo al cierre sostiene un teléfono con Bracket abierto. Se redibujaron poses, manos y expresiones; la voz interpreta cercanía, presión, alivio y confianza.

60s · 1080×1920 · 9:16 · 60FPS · español.

- [Master con voz, música y efectos](final/bracket-a-60s.mp4).
- [Silencioso](final/bracket-a-60s_silent.mp4).
- [HTML](video-a/index.html), [SRT](final/bracket-a-es.srt).
- [Storyboard](03-video-a-storyboard.md), [edición/render](video-a/LEEME.md).
- [Recursos](ASSETS.md), [QA](QA.md), [sonido](sound-a/SOUND.md).

Móvil Dark entero y a escala constante; sin zoom ni contador. Logo PNG oficial, Poppins UI/Barlow Condensed, campo animado y transiciones rápidas. Rol, participación, goles/amarillas, rendimiento, goleadores y clasificación conectan las solicitudes de la historia con funciones verificadas.

Conservar estructura; node video-a/serve.mjs y abrir http://127.0.0.1:4188/video-a/index.html. Audio desde MP4 final; ?captions activa subtítulos.

Historia/datos ficticios. Chat externo ilustrado, no módulo de Bracket. Excel es contexto, no importación. Participación se muestra como partidos jugados. Consulta pública mostrada: clasificación. Escaneo ilustrativo con revisión humana.

[Investigación](01-investigacion.md) conservada:159 pruebas de lógica/contratos,14 existentes de navegador y4 editoriales aprobadas en la investigación previa. Sin escrituras en producción ni llamadas al proveedor remoto. App funcional intacta. Solo A producido; B/C propuestas.
""")
rows='\n'.join(f"| {p['start']:.2f}–{p['end']:.2f}s | {p['text']} |" for p in a['segments'])
put('03-video-a-storyboard.md',"""# VIDEO A — storyboard ejecutado, revisión6

La revisión solicitada da actuación a Dani: papel/bolígrafo → laptop → chat externo insistente → teléfono con Bracket al cierre. La locución lee las preguntas y cambia de intención por contexto, en una toma continua. Se mantiene la demostración verificada de la app.

Skill explainer-default: Canvas/seek(t) determinista, borrador y final60FPS/4muestras/obturador180°. Dirección del usuario Dark/móvil entero/sinzoom/ritmo rápido. sound-effects en postproducción.

| Tiempo de voz | Narración |
|---|---|
"""+rows+f"""

## Historia y actuación

- 0–{t['transcribe']:.2f}s: Dani sostiene una cédula y escribe con bolígrafo. Mirada al papel, concentración y mano que traza tinta.
- {t['transcribe']:.2f}–{t['chatOpen']:.2f}s: cambia a laptop, manos tecleando y datos entrando en Excel. Papel junto al teclado, sin teléfono.
- Chat abierto desde{t['chatOpen']:.2f}s. Mensajes entran y permanecen: rol{t['qRole']:.2f}, tabla{t['qTable']:.2f}, goles{t['qGoals']:.2f}, partidos{t['qMatches']:.2f}, amarillas{t['qCards']:.2f}.
- La presión sube con cada entrada: mirada al chat, cejas preocupadas, ojos abiertos, boca de sorpresa y preocupación, hombros tensos y sudor sutil. Burbujas pulsan brevemente, panel tiene sacudida contenida y papeles pendientes aparecen. Header de grupo/remitentes/horas/entrada hacen visible su origen en un chat externo ficticio.
- Marca desde{t['intro']:.2f}s; revelado del PNG a{t['introReveal']:.3f}s. La interpretación pasa de preguntas urgentes a alivio cálido.
- Cierre desde{t['closing']:.2f}s: Dani sonríe y presenta el teléfono; su pantalla contiene la vista pública real reconstruida con el PNG original. Es el único teléfono que sostiene Dani.
- Marca final alrededor de{t['brand']:.2f}s; PNG completo{t['logoReveal']:.3f}s; eslogan{t['tagline']:.2f}s. Voz termina{a['speech_end']:.2f}s.

## Demostración

Móvil desde{t['schedule']:.2f}s; ajustar hora{t['adjust']:.2f}; confirmar{t['scheduleConfirm']:.2f}; Exportar Rol{t['roleOpen']:.2f}; descargar{t['roleDownload']:.2f}.

Planteles/resultados desde{t['result']:.2f}; participación{t['playerSelected']:.2f}; goles{t['goalRegistered']:.2f}; amarilla{t['cardRegistered']:.2f}; foto{t['photo']:.2f}; revisión{t['review']:.2f}; guardar/confirmar antes de{t['stats']:.2f}.

Rendimiento{t['stats']:.2f}; goleadores{t['scorers']:.2f}; imagen de goleadores{t['scorersExport']:.2f}; clasificación{t['standings']:.2f}; imagen Historia{t['tableExport']:.2f}; consulta pública{t['public']:.2f} y destino{t['publicView']:.2f}.

Viewport completo390×660, escala2,15, sin zoom/perspectiva. Cambio de contenido0,24s, controles0,16–0,22s y títulos por bloques rápidos.

## Audio y fidelidad

Teclado acompaña la laptop, no la escritura manual. Cinco avisos CC0 crecen hasta2dB adicionales de forma progresiva; riser breve lleva la presión al logo, sin tapar voz. Música Tech House vibes130; ducking10dB y medición estéreo/mono sobre el MP4.

Voz Qwen original: raw{a['raw_duration']:.2f}s, editada{a['performed_duration']:.2f}s, sin timestretch. Entrada fonética Bráquet/amatér; gráficos y guion mantienen Bracket/amateur. Pronunciación de amateur contrastada con https://www.rae.es/dpd/amateur. No se imita a una persona.

Ejemplo ficticio: Halcones2–1Leones, Norte–Sur0–0; puntos3/1/1/0. MateoPJ1/G2/TA0; DiegoPJ1/G0/TA1; IvánPJ1/G1/TA0. Escaneo ilustrativo/resumido con revisión y confirmación. Sin importación Excel, chat de Bracket, envío automático o promesas de tiempo real/precisión. Permisos de equipo conservados; enlace público de clasificación. Solo A producido.
""")
put('ASSETS.md',f"""# Recursos — VIDEO A, revisión6

| Recurso | Procedencia/uso |
|---|---|
| Logo PNG | public/logo_app.png copiado a assets/original; inicio, producto, teléfono final y cierre. Identidad íntegra. |
| Poppins400/600/700 | Fuentes originales de Bracket, OFL; UI/nombre. |
| Barlow Condensed ExtraBold/Italic | Google Fonts oficial, OFL en assets/display; publicidad/eslogan. |
| Dark | src/styles/themes.jsx: #131F24/#10191D/#263740/#1CB0F6/#38D4FF y blanco/opacidades. |
| Dani | Rig vectorial original en character.js, tres poses con objetos diferentes y expresiones articuladas. |
| Chat | Ilustración original de un grupo externo, cinco mensajes ficticios, sin logos de mensajería o funciones atribuidas a Bracket. |
| App | Canvas desde controles reales; móvil390×660/escala2,15, entrada36/20px, sin zoom. publicView() también dentro del teléfono final de Dani. |
| Datos | competition.json, participantes/eventos y estadísticas ficticios coherentes. |

Logo SHA256:8fdfd91bbc70c43ce0b3fd13683c8ec5563a913d4c70e5bb411620b776179217.

## Voz
[Qwen3-TTS VoiceDesign1.7B](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign), Apache2.0. Voz sintética original, sin referencia/clonación de una persona. Una toma dirigida por contexto de{a['raw_duration']:.2f}s, edición{a['performed_duration']:.2f}s sin cambio de velocidad; final hablado{a['speech_end']:.2f}s. La prueba anterior de54,48s se conserva localmente como ensayo, fuera del ZIP.

Pregunta/urgencia y solución/alivio se interpretan en la toma, sin desplazar artificialmente el pitch en postproducción. Se conserva dinámica mediante compresión suave1,3:1 y normalización previa a la mezcla. Estimación F0 por contexto en review/voice-contexts.json/png; ese análisis no certifica naturalidad percibida.

Entrada fonética Bracket→Bráquet, amateur→amatér; escrito/visible se conserva. [RAE](https://www.rae.es/dpd/amateur) respalda la pronunciación. WAV original/timeline/procesado, guion, transcripción, alineación y scripts incluidos; pesos/CUDA/entornos excluidos. Estudio antiguo Descript no utilizado ni publicado.

## Música y SFX
Tech House vibes, Alejandro Magaña(A.M.), Mixkit130; teclado1392. FreesoundCC0 whoosh/click/pop/riser/impact; tick disponible en fuentes. No música/SFX sintetizados. Sonidos de chat progresivos con gain_offset_db y una grabación por cue; teclado solo durante laptop.

[Licencias](assets/licenses/LICENCE-REVIEW.md), sound-a/CREDITS.txt y SOUND.md. Mixkit aislado excluido; download-audio.mjs recupera archivos para remezclar bajo términos vigentes. HTML reproduce el master.

## Procedimiento
explainer-default: guion, fotogramas deterministas, stills/draft y60FPS/4muestras/obturador180°. Adaptado Windows/CanvasJPEG95 con equivalencia PNG. sound-effects: cues, beats contrastados con graves, offset minimiza el peor error de ambos logos, ajuste final de revelados al beat, voz prioritaria/ducking10dB y medición MP4 estéreo/mono. Crédito Vox/@Voxyz_ai.

Fuentes activas mobile-ui.js/product-v5.js/character.js/motion-film.js, compiladas por build.mjs y template.html. product-v5 es el módulo compartido de demostración, reutilizado enV6. story-v6-fragment.js fue un ayudante de bloqueo local; no es entrada del build.

Node/Playwright/Chromium, FFmpeg/ffprobe locales, Python3.11; requisitos en sound-a/ y video-a/. TorchCUDA aparte. Código funcional y dependencias Bracket intactos. No video real para object-separation ni base hablada para motion-broll; no se fuerzan. Solo A producido.
""")
put('PRODUCTION-REVISION.md',f"""# Correcciones — revisión6

Pedido: Dani primero con hoja/bolígrafo, luego laptop transcribiendo y teléfono con app solo al final; expresiones visibles; preguntas desde chat externo con más dramatismo; voz variable por contexto.

Implementado rig completo writing/typing/phone, cabeza/cara mayores, ojos blancos/iris y mirada dirigida, cejas/boca/arrugas/sudor, brazos/manos y objetos independientes. Cinco mensajes acumulativos con remitentes, avisos progresivos y reacción individual. Solo el teléfono final de Dani contiene Bracket; usa publicView() y PNG original.

Voz nueva144palabras, toma{a['raw_duration']:.2f}s, edición{a['performed_duration']:.2f}s. Preguntas interpretadas con urgencia y registro más alto; presentación/cierre con alivio/confianza. Sin pitch-shift o piezas separadas por silencios añadidos. Datos de prosodia orientativos y tiempos en assets/voice/narration-v6-alignment.json.

Se mantienen Dark/móvil entero/sinzoom/contador/logo/eslogan,60FPS/4muestras, skills explainer-default y sound-effects. App funcional intacta; B/C propuestas. Pruebas nuevas de poses/chat y evidencia visual en review/. Entrega ZIPv6; versiones anteriores archivadas localmente.
""")
put('video-a/LEEME.md',"""# VIDEO A — revisión6

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
""")
# Keep the baseline approved script as history; the executed revision is above.
p=r/'07-video-a-guion-revision5-propuesta.md';x=p.read_text(encoding='utf-8')
if 'Actualización de producción V6' not in x:x+='\n## Actualización de producción V6\nEl usuario pidió poses de escritura/transcripción/teléfono final, preguntas desde chat externo, mayor estrés y voz por contexto. Se aplican en revisión6. El texto ejecutado y tiempos actuales figuran en03-video-a-storyboard.md. Esta propuestaV5 se conserva como antecedente aprobado.\n'
put('07-video-a-guion-revision5-propuesta.md',x)
print('V6 story, voice, assets and reproduction documents updated.')
