"""Write the revision-4 report from measurements of the delivered MP4."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
q=json.loads((root/'final/technical-qa.json').read_text(encoding='utf-8'))
m=json.loads((root/'review/mobile-checks.json').read_text(encoding='utf-8'))
b=json.loads((root/'sound-a/music-analysis.json').read_text(encoding='utf-8'))
cues=json.loads((root/'video-a/cues.json').read_text(encoding='utf-8'))
s=q['audio']['stereo'];mono=q['audio']['mono']
errors='; '.join(f'{float(t):.2f} s: {v*1000:.0f} ms' for t,v in b['reveal_error_s'].items())
text=f'''# VIDEO A — control de calidad de la revisión 4

Más entradas de pantallas y titulares, fondo animado, historia con cuatro problemas, nueva voz, tipografía y música. Se mantienen tema Dark real, móvil entero y ausencia de zooms y numeración «01/04». Solo A está producido.

## Master entregado

| Comprobación del MP4 final | Resultado |
|---|---|
| Duración | 60,000 s |
| Resolución y proporción | 1080 × 1920 · 9:16 |
| Frecuencia y fotogramas | 60 FPS constantes · 3.600 frames |
| Video | H.264 · yuv420p · MP4 con faststart |
| Audio | AAC estéreo |
| Versión silenciosa | Un stream de video, sin audio |
| Decodificación completa | Sin errores de FFmpeg |
| Sonoridad estéreo / mono | {s['integrated_lufs']:.1f} / {mono['integrated_lufs']:.1f} LUFS integrados |
| Pico real estéreo / mono | {s['true_peak_dbfs']:.1f} / {mono['true_peak_dbfs']:.1f} dBFS |

Medido sobre final/bracket-a-60s.mp4 después del remux de distribución. Streams y resúmenes ebur128 en [technical-qa.json](final/technical-qa.json). Voz, música y efectos se mezclan una vez sobre el master silencioso. Renderer de explainer-default con cuatro muestras temporales por frame y obturador de 180°.

## Imagen, movimiento y móvil

[Hoja extraída del master](review/a-master-contact-sheet.jpg) en **{len(q['contact_sheet_times'])} tiempos**: historia, marca, formularios, escaneo, confirmación, clasificación, exportación, consulta y cierre.

Fondo con trazos de campo, nodos y elipses animados. Titulares Barlow Condensed ExtraBold/Italic revelados por palabras y máscaras. El móvil entra por traslaciones contenidas, alterna dirección entre capítulos y conserva la pantalla completa. Los controles tienen entradas escalonadas y responden con escritura, pulsaciones y cambios de estado. El logo original se revela mediante máscara; no cambia su geometría.

Viewport 390 × 660 unidades; base x=120/y=315; escala constante 2,15. Traslaciones de entrada acotadas a 67 px horizontal/44 px vertical. No hay zoom, perspectiva, capturas recortadas o cursor de escritorio. El marco completo permanece dentro del video. No se usan contadores ordinales.

Se comprobaron **{m['samples']} estados** sin desbordamiento horizontal de texto. Poppins 400/600/700 y Barlow 800 normal/italic incrustadas y cargadas. Acceso aleatorio determinista; PNG del lienzo idéntico al PNG del navegador. [Móvil](review/mobile-checks.json), [composición](review/composition-checks.json), [equivalencia](review/capture-equivalence.json), [playback](review/preview-playback.json).

Dark extraído de src/styles/themes.jsx: fondo #131F24, superficie #10191D, borde #263740, primario #1CB0F6, fuerte #38D4FF, texto blanco y secundario al 62%. El papel y la imagen exportada representan documentos claros dentro de la app oscura.

## Historia y fidelidad

Dani y los mensajes son una historia ficticia original. Cuatro pendientes: equipo sin incorporar, horarios por confirmar, cédula en foto y clasificación solicitada. El producto los resuelve durante el recorrido; Dani vuelve al final. No es un cliente/testimonio ni se anuncia chat dentro de Bracket.

Investigación anterior a la producción. Módulo operativo Torneos → Jornadas; se excluye Partidos marcado «Próximamente». La vista móvil reconstruye controles reales con disposición editorial legible; no es grabación literal de la app.

Ejemplo ficticio: Halcones 2–1 Leones; Norte–Sur 0–0; tabla de 3, 1, 1 y 0 puntos, contrastada con el cálculo real. Escaneo rotulado «Demostración ilustrativa · lectura resumida», con revisión → aplicar → guardar → confirmar. No se invoca el proveedor remoto ni se promete velocidad o precisión. Descargar imagen y habilitar consulta pública son acciones distintas. Sin precios, testimonios ni métricas comerciales inventados.

PNG oficial copiado byte a byte desde public/logo_app.png. SHA-256: `{q['logo_sha256']}`. Código funcional sin cambios.

## Voz y sonido

Voz sintética original con Qwen3-TTS-12Hz-1.7B-VoiceDesign, modelo Apache 2.0. Dirección conversacional en español mexicano. Una toma continua de 50,64 s, editada en límites de frases sin timestretch, con fades de 9 ms. No se clona una persona. Se retiraron dos frases redundantes; guion efectivo, toma, transcripción y alineación conservados. La verificación automática comprueba texto y tiempos, no realismo percibido. La prueba de Descript no se utilizó en el master.

SRT opcional por grupos de palabras, tiempos aproximados derivados de la transcripción; no quemado en el master. HTML con ?captions para consulta.

Música «Tech House vibes», Alejandro Magaña (A. M.), Mixkit #130. Efectos grabados CC0 y teclado Mixkit #1392. Voz prioritaria; ducking de 10 dB, anticipación 120 ms, recuperación 300 ms. No se sintetizan música ni SFX.

Beats contrastados con graves menores de 120 Hz: {b['bpm']:.3f} BPM; corrección {b['kick_grid_shift_s']*1000:+.0f} ms. Offset {b['music_offset_s']:.3f} s. Errores de revelados: {errors}. [Cuadrícula](sound-a/beatgrid.png), [análisis](sound-a/music-analysis.json), [informe](sound-a/SOUND.md), [revisión HTML](sound-a/report.html). Frames antes/después y formas de onda para **{len(cues)} cues** en sound-a/checks/.

Licencias revisadas el 7 de noviembre de 2026: Mixkit Music/SFX Free License para redes/anuncios online, seis fuentes Freesound CC0, Qwen Apache 2.0 y Poppins/Barlow OFL. [Verificación](assets/licenses/LICENCE-REVIEW.md), [créditos](sound-a/CREDITS.txt). Originales Mixkit excluidos del paquete. Procedimiento sound-effects con crédito a Vox / @Voxyz_ai.

## Revisión auditiva editorial

Las mediciones no sustituyen una valoración humana de la interpretación. Cinco puntos para auriculares: **0,30 s** (primera frase y entrada), **14,48 s** (marca), **18,20 s** (teclado bajo voz), **55,90 s** (riser), **57,75 s** (logo/eslogan). Son los cinco puntos del informe de sonido. No se afirma una escucha humana automatizada ni realismo auditivo medido.

## Paquete

Master, silencioso, poster, SRT, HTML, fuentes activas, WAVs y alineación, recursos originales, fuentes tipográficas, efectos CC0, storyboard, investigación e informes. Excluye modelos, entornos, binarios, Mixkit aislado y versiones previas. DELIVERY-MANIFEST.json incluye tamaño/SHA-256. Conservar estructura para audio/preview; servidor local incluido. B/C son propuestas sin render.
'''
(root/'QA.md').write_text(text,encoding='utf-8')
print('QA updated from revision-4 delivered master.')
