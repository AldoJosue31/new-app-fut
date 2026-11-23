# VIDEO A — control de calidad, revisión7

Corrección visual: reverso de la hoja y tapa trasera de la laptop hacia el espectador; superficie de escritura, teclado y pantalla hacia Dani. Las manos y el bolígrafo se ocultan correctamente al pasar por detrás de los objetos. El teléfono del cierre conserva su presentación hacia cámara. [Orientaciones](review/v7-props-final.png). Voz, música, efectos y tiempos conservados de V6. Comparación SHA256 del AAC y PCM decodificado, y tiempos de inicio/duración idénticos: [audio-reuse-check.json](review/audio-reuse-check.json).

Dani escribe con hoja/bolígrafo, transcribe en laptop y se estresa ante cinco preguntas de un chat externo. Solo al cierre sostiene un teléfono con Bracket abierto. Cara, poses y actuación se redibujaron; la voz cambia de intención por contexto. Bracket se demuestra con programación/exportación del rol, registro de participación/goles/amarillas, rendimiento individual, goleadores y clasificación compartible. Solo A producido.

| Comprobación sobre el MP4 entregado | Resultado |
|---|---|
| Duración | 60,000s |
| Resolución/proporción | 1080×1920 · 9:16 |
| Video | H.264/yuv420p,60FPS constantes,3.600fotogramas,faststart |
| Audio | AAC estéreo |
| Silencioso | Solo video, sin stream de audio |
| Decodificación completa | Sin errores FFmpeg |
| LUFS estéreo / mono | -16.5 / -16.5 |
| Pico real estéreo / mono | -5.1 / -5.1 dBFS |

Medición posterior al remux de distribución: [technical-qa.json](final/technical-qa.json). Cuatro muestras temporales por frame/obturador180°, procedimiento explainer-default adaptado a Windows/CanvasJPEG95. Mezcla única sobre master silencioso.

## Imagen y movimiento

Revisada la [hoja del MP4](review/a-master-contact-sheet.jpg) en 25 tiempos: papel/Excel, preguntas, marca, rol, planteles, escaneo, confirmación, rendimiento, goleadores, imágenes, clasificación, enlace y cierre.

Móvil completo390×660, escala2,15 constante, base120/315. Entrada acotada36px horizontal/20px vertical; después permanece. Contenido desliza/disuelve en0,24s; controles se revelan en0,16–0,22s; títulos entran por máscaras/bloques rápidos. Sin zoom, perspectiva, capturas recortadas, cursor de escritorio o «01/04». Campo/nodos/trazos animados continuos.

303 estados sin desbordamiento horizontal; cinco fuentes incrustadas y cargadas: Poppins400/600/700 y Barlow800 normal/italic. Determinismo por acceso aleatorio; PNG lienzo/navegador idénticos. [Móvil](review/mobile-checks.json), [composición](review/composition-checks.json), [captura](review/capture-equivalence.json), [playback](review/preview-playback.json).

Dark original: #131F24/#10191D/#263740/#1CB0F6/#38D4FF, blanco/opacidades. Papel y algunos documentos exportados claros dentro de la app oscura. PNG oficial íntegro, SHA256:8fdfd91bbc70c43ce0b3fd13683c8ec5563a913d4c70e5bb411620b776179217.

## Actuación y chat

Tres poses exclusivas: escribir con papel/bolígrafo; teclear en laptop con cédula al lado; teléfono con clasificación Bracket solo al cierre. Cabeza/cara mayores, mirada al objeto/chat, cejas/boca/ojos y hombros que reaccionan, sudor sutil y sonrisa final. El teléfono final usa publicView() y el PNG oficial, no una pantalla genérica.

Cinco preguntas acumuladas en un grupo externo con remitentes y recreación indicada. Avisos progresivos, pulso de burbuja, sacudida contenida y papeles pendientes. Prueba de modos/objetos, aumento de presión, conteo y determinismo: [story-pose-checks.json](review/story-pose-checks.json). Evidencia: [papel](review/v7-writing.png), [laptop](review/v7-typing.png), [presión](review/v7-qCards.png), [alivio/app](review/v7-relief.png).

## Voz y continuidad

144palabras del guion conservado de V6. Una toma Qwen VoiceDesign de60.32s; 6 recortes limitados a silencio comprobado, sin timestretch o esperas añadidas entre escenas. Interpretación editada59.16s; termina a59.28s. Los tiempos de UI siguen palabras reconocidas, no bloques separados para cada verbo.

La comparación automática recupera 141/144 palabras de referencia; los tokens de referencia no emparejados fueron ['amarillas?', 'del', 'amateur.']. La entrada usa la pronunciación fonética Bráquet/amatér; la escritura de marca/eslogan permanece original. Es comprobación de contenido/tiempos, no una medición de realismo o pronunciación. Hueco máximo estimado entre palabras:1.16s, incluidas respiraciones. Se mantienen los archivos originales y la transcripción para revisión.

Voz sintética original, sin clonar una persona. Una toma con cercanía inicial, preguntas urgentes y registro más alto, alivio al presentar Bracket y cierre confiado. Se conserva dinámica mediante compresión1,3:1. No se aplicó pitch-shift. [Análisis F0 por contexto](review/voice-contexts.png) y [datos](review/voice-contexts.json) estiman variación; no evalúan naturalidad subjetiva. Pronunciación amateur contrastada con [RAE](https://www.rae.es/dpd/amateur). No se usó la prueba anterior de Descript. SRT opcional derivado de grupos de palabras, no quemado; ?captions en HTML.

## Fidelidad de producto

Papel/Excel y mensajes de chat externo son ficción editorial; no se atribuye importación Excel, chat o envío automático a Bracket. Asistencia se representa mediante participación/partidos jugados. Vistas de equipo conservan su alcance de permisos. Enlace público mostrado: clasificación.

Halcones2–1Leones; Norte–Sur0–0; puntos3/1/1/0 computados con el calculador real de Bracket. Datos ficticios de MateoPJ1/G2/TA0, DiegoPJ1/G0/TA1 e IvánPJ1/G1/TA0 coherentes con eventos. Fixture en assets/demo-data/competition.json; verificación en research/v6-demo-data-check.json.

Escaneo ilustrativo/resumido, aviso visible y revisión/aplicación/guardado/confirmación humanos. Sin llamadas remotas o promesas de velocidad/precisión. Torneos→Jornadas operativo; se excluye Partidos «Próximamente». Sin métricas, precios, testimonios o funciones inventados. Código funcional intacto.

## Sonido y licencias

Música Tech House vibes, Alejandro Magaña(A.M.), Mixkit130. SFX grabados CC0 y teclado Mixkit1392. No música/SFX sintetizados. Voz prioritaria; ducking10dB, anticipación120ms y recuperación300ms. 39 cues con una grabación por cue; frames y formas de onda en sound-a/checks/.

Cuadrícula contrastada con graves<120Hz: 122.283BPM, corrección+37ms; offset3.505s. Errores finales de revelado:14.300s: 2.8ms; 57.100s: 2.5ms. [Beats](sound-a/beatgrid.png), [análisis](sound-a/music-analysis.json), [SOUND](sound-a/SOUND.md), [revisión de cues](sound-a/report.html).

Fuentes comprobadas7nov2026: Mixkit Music/SFX Free License y FreesoundCC0, compatibles con redes/anuncios online. QwenApache2.0; Poppins/BarlowOFL. [Licencias](assets/licenses/LICENCE-REVIEW.md), [créditos opcionales](sound-a/CREDITS.txt). Originales Mixkit aislados fuera del ZIP. Crédito de procedimiento sound-effects: Vox/@Voxyz_ai.

Las mediciones no sustituyen escuchar la interpretación. Cinco puntos de riesgo para auriculares:1.86s(teclado),13.45s(tensión del chat),14.30s(marca),55.55s(riser),57.10s(logo/eslogan). Las preguntas se concentran entre 6.00 y 13.92s para valorar interpretación.

## Entrega

Master/silencioso, poster, SRT, HTML, fuentes activas, WAVs/alineación, gráficos originales, tipografías, kitCC0, storyboard/investigación e informes. Sin modelos, entornos, binarios, Mixkit aislado o históricos. DELIVERY-MANIFEST.json con tamaño/SHA256. Mantener estructura para audio y reportes; servidor local incluido. Código funcional de Bracket sin cambios.
