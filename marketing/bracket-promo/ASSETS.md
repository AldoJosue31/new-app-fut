# Recursos — VIDEO A, revisión7

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
[Qwen3-TTS VoiceDesign1.7B](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign), Apache2.0. Voz sintética original, sin referencia/clonación de una persona. Una toma dirigida por contexto de60.32s, edición59.16s sin cambio de velocidad; final hablado59.28s. La prueba anterior de54,48s se conserva localmente como ensayo, fuera del ZIP.

Pregunta/urgencia y solución/alivio se interpretan en la toma, sin desplazar artificialmente el pitch en postproducción. Se conserva dinámica mediante compresión suave1,3:1 y normalización previa a la mezcla. Estimación F0 por contexto en review/voice-contexts.json/png; ese análisis no certifica naturalidad percibida.

Entrada fonética Bracket→Bráquet, amateur→amatér; escrito/visible se conserva. [RAE](https://www.rae.es/dpd/amateur) respalda la pronunciación. WAV original/timeline/procesado, guion, transcripción, alineación y scripts incluidos; pesos/CUDA/entornos excluidos. Estudio antiguo Descript no utilizado ni publicado.

## Música y SFX
Tech House vibes, Alejandro Magaña(A.M.), Mixkit130; teclado1392. FreesoundCC0 whoosh/click/pop/riser/impact; tick disponible en fuentes. No música/SFX sintetizados. Sonidos de chat progresivos con gain_offset_db y una grabación por cue; teclado solo durante laptop.

[Licencias](assets/licenses/LICENCE-REVIEW.md), sound-a/CREDITS.txt y SOUND.md. Mixkit aislado excluido; download-audio.mjs recupera archivos para remezclar bajo términos vigentes. HTML reproduce el master.

## Procedimiento
explainer-default: guion, fotogramas deterministas, stills/draft y60FPS/4muestras/obturador180°. Adaptado Windows/CanvasJPEG95 con equivalencia PNG. sound-effects: cues, beats contrastados con graves, offset minimiza el peor error de ambos logos, ajuste final de revelados al beat, voz prioritaria/ducking10dB y medición MP4 estéreo/mono. Crédito Vox/@Voxyz_ai.

Fuentes activas mobile-ui.js/product-v5.js/character.js/motion-film.js, compiladas por build.mjs y template.html. product-v5 es el módulo compartido de demostración, reutilizado enV7. story-v6-fragment.js fue un ayudante de bloqueo local; no es entrada del build.

Node/Playwright/Chromium, FFmpeg/ffprobe locales, Python3.11; requisitos en sound-a/ y video-a/. TorchCUDA aparte. Código funcional y dependencias Bracket intactos. No video real para object-separation ni base hablada para motion-broll; no se fuerzan. Solo A producido.

## Corrección visual V7

La cara de escritura de la hoja y la pantalla/teclado de la laptop apuntan hacia Dani. El espectador ve el reverso del papel y la tapa trasera de la laptop. Bolígrafo/manos se componen del lado de Dani, con oclusión por los objetos; el teléfono del cierre sigue mostrando Bracket hacia el espectador. No cambia la narración, la música, los efectos, los tiempos ni la interfaz. El audio AAC aprobado de V6 se copia sin recodificar al nuevo render; identidad de paquetes y PCM en review/audio-reuse-check.json.
