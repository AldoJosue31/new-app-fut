"""Update V5 production documentation from measured narration."""
from pathlib import Path
import json
r=Path(__file__).resolve().parent.parent
a=json.loads((r/'assets/voice/narration-v5-alignment.json').read_text(encoding='utf-8'));t=a['markers']
def put(name,text):(r/name).write_text(text,encoding='utf-8')
put('README.md',"""# Bracket — Más allá del amateur

VIDEO A, revisión5: Dani lleva su liga entre papel y Excel; equipos y jugadores piden rol, clasificación y estadísticas. El guion aprobado conecta esos pendientes con funciones verificadas de Bracket. B/C siguen como propuestas.

60s · 1080×1920 · 9:16 · 60FPS · español.

- [Master con voz, música y efectos](final/bracket-a-60s.mp4).
- [Master silencioso](final/bracket-a-60s_silent.mp4).
- [Preview HTML](video-a/index.html) y [SRT opcional](final/bracket-a-es.srt).
- [Storyboard ejecutado](03-video-a-storyboard.md) y [guion aprobado](07-video-a-guion-revision5-propuesta.md).
- [Edición/render](video-a/LEEME.md), [recursos](ASSETS.md), [QA](QA.md) y [sonido](sound-a/SOUND.md).

Móvil Dark completo, sin zoom/contador; Barlow Condensed, Poppins UI, campo animado y PNG oficial. Una locución continua guía los cambios de contenido; se conservan respiraciones naturales sin añadir silencios entre escenas.

Mantener estructura. Ejecutar node video-a/serve.mjs y abrir http://127.0.0.1:4188/video-a/index.html. El audio procede del MP4 final. ?captions activa subtítulos de apoyo.

Dani, mensajes, liga y datos ficticios. Asistencia a partidos se representa como participación/partidos jugados. Consulta pública mostrada: clasificación. Escaneo ilustrativo/resumido con revisión humana. La historia Excel no representa importación.

[Investigación](01-investigacion.md): arquitectura, permisos, implementación y pruebas. Se aprobaron159 comprobaciones de lógica/contratos,14 de navegador y4 editoriales en investigación previa. Sin escrituras en producción ni llamadas al proveedor remoto. Código funcional de Bracket intacto.
""")
rows='\n'.join(f"| {p['start']:.2f}–{p['end']:.2f}s | {p['text']} |" for p in a['segments'])
put('03-video-a-storyboard.md',"""# VIDEO A — storyboard ejecutado, revisión5

Guion aprobado: papel/Excel, solicitudes de jornada, rol, estadísticas y clasificación. Tiempos ajustados a una interpretación continua; no se insertan pausas para llenar bloques. Skill explainer-default: HTML/Canvas determinista, borrador y60FPS/4muestras. Dark, móvil entero sin zoom y ritmo solicitados por el usuario. Postproducción sound-effects.

| Tiempo de voz | Texto aprobado |
|---|---|
"""+rows+f"""

Acciones sincronizadas:
- Dani reúne papel/Excel. Piden rol/tabla desde{t['requests']:.2f}s; goles, partidos y amarillas desde{t['playerRequests']:.2f}s. Mensajes editoriales.
- Marca introductoria desde{t['intro']:.2f}s; PNG revelado a{t['introReveal']:.2f}s.
- Móvil/jornada desde{t['schedule']:.2f}s; hora{t['adjust']:.2f}; confirmar{t['scheduleConfirm']:.2f}; Exportar Rol{t['roleOpen']:.2f}; descargar{t['roleDownload']:.2f}.
- Participación{t['playerSelected']:.2f}; goles{t['goalRegistered']:.2f}; amarilla{t['cardRegistered']:.2f}; foto{t['photo']:.2f}; revisión{t['review']:.2f}; guardado/confirmación antes de{t['stats']:.2f}.
- Rendimiento Individual{t['stats']:.2f}, con PJ/goles/amarillas. Goleadores{t['scorers']:.2f}; imagen exportable{t['scorersExport']:.2f} para mantener actividad durante la frase de datos registrados.
- Clasificación{t['standings']:.2f}; imagen Historia{t['tableExport']:.2f}.
- Habilitar/copiar consulta pública{t['public']:.2f}; destino{t['publicView']:.2f}, mostrando clasificación.
- Dani aliviado{t['closing']:.2f}; logo{t['brand']:.2f}; revelado completo{t['logoReveal']:.3f}; eslogan{t['tagline']:.2f}. Voz acaba{a['speech_end']:.2f}; sostén breve hasta60s.

El teléfono aparece una vez; conserva escala, orientación y viewport. Contenidos deslizan/disuelven en0,24s; controles entran en0,16–0,22s. Titulares por bloques rápidos y campo animado continuo. Música Tech House vibes130; SFX grabados CC0/Mixkit; una asignación por cue; voz prioritaria/ducking10dB. Niveles y pruebas en sound-a/.

Ejemplo ficticio: Halcones2–1Leones; Norte–Sur0–0. MateoRuiz PJ1/G2/TA0; DiegoLuna PJ1/G0/TA1; IvánSoto PJ1/G1/TA0. Puntos3/1/1/0. Datos en competition.json.

Escaneo rotulado «Demostración ilustrativa · lectura resumida», revisión/aplicación/confirmación humana. Sin promesas de velocidad/precisión remotas, tiempo real, importación Excel, chat o envío automático. Permisos de equipo conservados; el enlace mostrado corresponde a clasificación. PNG original íntegro. B/C no producidos.
""")
put('PRODUCTION-REVISION.md',f"""# Correcciones de VIDEO A — revisión5

El usuario aprobó producir papel/Excel con rapidez y fluidez. Se implementa Dani, solicitudes de rol/tabla/estadísticas, exportación de jornada, participación/goles/amarillas, rendimiento individual y goleadores.

Voz Qwen VoiceDesign original de{a['raw_duration']:.2f}s en una toma; solo recorte de silencios largos comprobados. Sin timestretch ni pausas insertadas entre escenas. Voz acaba{a['speech_end']:.2f}s. Acciones ajustadas a palabras reales en narration-v5-alignment.json.

Dark completo, escala fija y sin zoom/contador. Móvil permanece, contenidos cambian en0,24s, controles/titulares rápidos y fondo animado. La imagen de goleadores apoya las consultas de estadísticas.

Fuentes activas mobile-ui.js/product-v5.js/character.js/motion-film.js. PNG original, eslogan aprobado. Render explainer-default60FPS/4muestras; sound-effects con Tech House vibes130 y grabaciones CC0/Mixkit.

Código funcional intacto. Todo en marketing/bracket-promo. B/C siguen como propuestas; históricos fuera del ZIPv5.
""")
put('ASSETS.md',"""# Recursos utilizados — VIDEO A, revisión5

| Recurso | Procedencia/uso |
|---|---|
| PNG oficial | assets/original/logo_app.png, copia binaria de public/logo_app.png. Máscaras y escala uniforme; sin redibujar/recolorear/deformar. |
| Poppins400/600/700 | Fuentes originales de Bracket, OFL, incrustadas en interfaz/nombre. |
| Barlow Condensed ExtraBold/Italic | Google Fonts oficial, OFL en assets/display; titulares/eslogan. |
| Dark | src/styles/themes.jsx: #131F24/#10191D/#263740/#1CB0F6/#38D4FF y blanco/opacidades. |
| Dani/papeles/Excel/preguntas | Vectores originales y ficción. Sin logo de Excel o representación de importación. |
| Móvil | Canvas desde controles reales;390×660, escala2,15 fija, base120/315, entrada36/20px. Sin zoom/perspectiva. |
| Datos | competition.json con participantes, eventos, estadísticas y clasificación ficticios coherentes. |

SHA256 del logo:8fdfd91bbc70c43ce0b3fd13683c8ec5563a913d4c70e5bb411620b776179217.

Voz: [Qwen3-TTS VoiceDesign1.7B](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign), Apache2.0. Voz masculina sintética original dirigida a español mexicano, sin referencia de una persona. Toma57,92s para139palabras; recorte exclusivo de silencios comprobados, sin cambio de velocidad ni clips separados por esperas artificiales. WAVs, transcripción/alineación y scripts incluidos; pesos/CUDA/entornos excluidos. La verificación automática no certifica realismo percibido. Estudio previo Descript no utilizado/publicado.

Música «Tech House vibes», Alejandro Magaña(A.M.), Mixkit130; teclado1392. Kit FreesoundCC0 de whoosh/click/pop/riser/impact, con tick disponible. No música/SFX sintetizados. [Licencias](assets/licenses/LICENCE-REVIEW.md), créditos efectivos en sound-a/CREDITS.txt y mediciones en sound-a/SOUND.md. Mixkit aislado fuera del ZIP; download-audio.mjs recupera recursos localmente para remezclar sujeto a términos vigentes. HTML reproduce el MP4 final.

explainer-default: frames deterministas, borrador y60FPS/4muestras/obturador180°. Renderer adaptado Windows/CanvasJPEG95 con equivalencia PNG comprobada. sound-effects: cues, beats contrastados con graves, una grabación por cue, voz prioritaria/ducking10dB y medición MP4 estéreo/mono. Crédito de procedimiento Vox/@Voxyz_ai.

Node/Playwright/Chromium, FFmpeg/ffprobe locales y Python3.11. Requisitos de análisis en sound-a/requirements.txt; voz en video-a/voice-requirements.txt, TorchCUDA aparte. Sin cambios a dependencias de la app.

Archivos activos: mobile-ui.js, product-v5.js, character.js, motion-film.js, build.mjs y template.html. Capturas solo como evidencia de investigación, no material de animación. Históricos excluidos.

Consulta pública mostrada: clasificación. Rendimiento individual conserva permisos de equipo. Escaneo ilustrativo con revisión humana, no prueba de velocidad/precisión. Sin video real para separación de sujetos o video base hablado para B-roll: object-separation/motion-broll no aplican. Solo A producido.
""")
p=r/'video-a/LEEME.md';x=p.read_text(encoding='utf-8')
x=x.replace('revisión 4','revisión 5').replace('narration-v4-script.json','narration-v5-script.json')
x=x.replace('67 px horizontal y 44 px vertical','36 px horizontal y 20 px vertical')
x=x.replace('Historia con cuatro pendientes','Historia de papel y Excel y solicitudes de rol/tabla/estadísticas')
x=x.replace('Una toma continua; alineación por límites de frases, sin timestretch. Se retiraron dos frases redundantes de la toma original.','Una toma continua de57,92s; solo recorte de silencios comprobados, sin timestretch o esperas insertadas. Acciones ajustadas a palabras reales.')
x=x.replace('python video-a/align-voice.py\npython video-a/export-production-plan.py','python video-a/align-voice.py')
x=x.replace('python video-a/align-voice.py','python video-a/align-voice.py\npython video-a/export-production-plan.py')
if 'Pantallas nuevas: product-v5.js' not in x:x+='\nPantallas nuevas: product-v5.js (rol, planteles, rendimiento y goleadores). update-production-docs.py sincroniza documentos con el guion y tiempos efectivos. check-demo-data.mjs necesita el código Bracket original en su ruta relativa; el render entregado no depende de la app.\n'
if 'Reajuste de beats al regenerar voz' not in x:x+='\nReajuste de beats al regenerar voz: renderizar borrador y ejecutar sound_pass.py con --preview-audio para medir cuadrícula; ejecutar python video-a/snap-logo-beats.py, python video-a/export-production-plan.py y node video-a/build.mjs antes del render final. No ejecutar align-voice.py después del snap sin repetir este ajuste. El paquete ya incluye los tiempos finales medidos.\n'
put('video-a/LEEME.md',x)
p=r/'07-video-a-guion-revision5-propuesta.md';x=p.read_text(encoding='utf-8')
x=x.replace('Estado: guion actualizado por petición del usuario; pendiente de aprobación del texto antes de producir. No modifica las animaciones, la locución ni los renders entregados de la revisión 4.','Estado: aprobado por el usuario para producción. Tiempos ejecutados en 03-video-a-storyboard.md; los de esta propuesta se conservan como intención editorial.')
put('07-video-a-guion-revision5-propuesta.md',x)
print('V5 documents updated.')
