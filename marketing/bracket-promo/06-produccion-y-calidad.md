# Producción y control de calidad tras aprobación

Este documento define trabajo futuro. No acredita renders, audio medido ni licencias finales todavía.

## Skills leídas y decisión de uso

Se leyeron los seis `SKILL.md` instalados en `C:/Users/Aldo/.agents/skills/` durante esta etapa.

| Skill | Decisión | Procedimientos que se aplicarán |
|---|---|---|
| `explainer-default` | Principal de A | HTML autónomo, `VIDEO/seek(t)`, cámaras por escena, texto/interfaz alternados, acciones reales, fuentes incrustadas; renderer propio, stills, draft y final 60 FPS/4 subframes |
| `explainer-high-energy` | Principal de B | Beat sheet, forma conductora, tipografía por beats/subdivisiones, HUD, textura sembrada y motion blur; renderer propio, final 60 FPS/8 subframes |
| `explainer-engaging` | C opcional | Estaciones fijas, protagonista continuo, gravedad/contactos, cámara horneada a 1/240 s, revelado general y seam; renderer propio, final 60 FPS/8 subframes |
| `motion-broll` | Evaluada, no aplicada | Requiere video base y transcripción, ausentes. No iniciar engine/build/render de B-roll ni generar ProRes transparente sin ese caso de uso |
| `object-separation` | Evaluada, no aplicada | No hay sujeto filmado para SAM 2. No descargar modelo ni usarlo para logo o interfaz con transparencia |
| `sound-effects` | Postproducción de las piezas aprobadas | Licencias vigentes, cue list, beat grid contrastado con bombo, alineación, mezcla, medición del MP4, comprobaciones visual/onda y reporte de cambios |

Las instrucciones de entrevista de las skills no se repiten: el usuario ya especificó producto, marca a investigar, formato, idioma, duración y objetivos. El punto de aprobación de esta etapa procede expresamente de la solicitud del usuario.

## Conflictos resueltos en la planificación

Los explainers incluyen ejemplos de audio sintetizado y un normalizador a −1,5 dBTP. `sound-effects` prohíbe la síntesis y pide pico verdadero por debajo de −4 dBFS. La campaña usará archivos grabados, y el master final se mezclará desde el video silencioso con objetivo aproximado de −16 LUFS integrados y pico verdadero inferior a −4 dBFS. No se conservará una mezcla anterior debajo de la nueva.

El logo no se deformará para cumplir las metáforas de morph de las skills. Las formas conductoras serán recursos exteriores al archivo; el emblema aparece como imagen completa. Los colores/fuentes de ejemplo de las skills se sustituyen por los de Bracket.

## Estructura futura, dentro de este directorio

```text
marketing/bracket-promo/
  README.md y documentos de investigación/aprobación
  research/                  # pruebas y capturas de referencia ya realizadas
  assets/
    original/                # copia exacta del logo y fuentes, con hash/licencia
    demo-data/               # competición ficticia, cédula y estados coherentes
    audio/                   # solo material redistribuible según licencia
  video-a/
    index.html               # composición y preview interactiva
    render.mjs               # renderer de explainer-default
    beat-sheet.json
    cues.json
  video-b/
    index.html
    render.mjs               # renderer de explainer-high-energy
    beat-sheet.json
    cues.json
  video-c/                   # únicamente si se aprueba
  review/                    # stills y borradores
  final/
    bracket-a-60s.mp4
    bracket-a-60s_silent.mp4
    bracket-b-19s.mp4
    bracket-b-19s_silent.mp4
  sound-a/ y sound-b/
    report.html, SOUND.md, CREDITS.txt, beatgrid.png, checks/
  ASSETS.md
  QA.md
```

Los nombres de B se ajustarán a su duración conformada. No se generarán carpetas vacías para dar apariencia de trabajo terminado. Dependencias, cachés y binarios nuevos se alojarán dentro de esta carpeta; no se cambiarán `package.json`, lockfiles ni fuentes funcionales de la aplicación.

## Preparación y fidelidad

1. Congelar guion y música elegida. Preparar los datos ficticios de A/B con el mismo partido y marcadores consistentes.
2. Verificar las pantallas que faltan en el estado de demostración: creación completa de torneo/fixture, guardado, descarga y destino público. Mantener una distinción clara entre reconstrucción ilustrativa y ejecución real.
3. Extraer medidas, etiquetas y estados de los componentes reales y de las referencias observadas. No inventar controles para facilitar la animación.
4. Verificar una cédula legible de ejemplo si se quiere demostrar la lectura real. Si no hay una respuesta remota verificable, no atribuirle precisión, rapidez ni éxito medido; aplicar la variante de captura manual o rotular expresamente la reconstrucción ilustrativa.
5. Copiar el logo original sin modificar y comprobar hash. Incrustar los WOFF2 y conservar SIL OFL. Las imágenes demo deben carecer de datos personales y escudos ajenos.
6. Preparar un mapa de fuentes por escena: qué control real representa cada gesto y qué parte es composición editorial.

## Construcción de los explainers

Cada pieza será un HTML autónomo. `window.VIDEO` declara anchura, altura y duración; `window.seek(t)` establece **todos** los estados de manera determinista. No CSS animations/transitions, temporizadores ni estado acumulado para producir los frames. La reproducción de preview sí podrá usar el reloj para llamar a `seek`.

Toda aleatoriedad visual tendrá semilla. Lo que requiere historia, como la cámara de C, se hornea al cargar y se consulta con interpolación. Las capas de escena son transparentes sobre el fondo del stage; el texto posicionado evita saltos de línea accidentales. Se precargan todas las fuentes, incluidas las de escenas inicialmente ocultas.

Con `?render`: stage exacto 1080 × 1920 en el origen, sin controles ni escalado de preview. Sin ese parámetro: encuadre ajustado a la ventana, play/pause y scrub de tiempo. El preview final cargará los mismos archivos de audio de la mezcla, por cues, sin sintetizar osciladores.

## Render siguiendo cada skill

Los comandos siguientes son el plan de producción, no tareas ya ejecutadas. Las rutas suponen trabajo dentro de `marketing/bracket-promo`.

```text
node video-a/render.mjs video-a/index.html review/a-stills.png --stills <tiempos-del-beat-sheet>
node video-a/render.mjs video-a/index.html review/a-draft.mp4 30 1 4
node video-a/render.mjs video-a/index.html final/bracket-a-60s.mp4 60 4 8

node video-b/render.mjs video-b/index.html review/b-stills.png --stills <tiempos-del-beat-sheet>
node video-b/render.mjs video-b/index.html review/b-draft.mp4 30 1 4
node video-b/render.mjs video-b/index.html final/bracket-b-19s.mp4 60 8 8
```

Se usarán los scripts incluidos en los `SKILL.md` correspondientes, con ajustes de rutas Windows cuando hagan falta y sin reemplazar su render por un motor ajeno. Los workers se ajustan a la memoria y los núcleos disponibles; «8» es el parámetro de ejemplo, no una medición del equipo. El render suma subframes en media exposición de frame y utiliza FFmpeg para codificación H.264, CRF 16, yuv420p. Si no se declara `buildAudio` durante el render visual, el script escribe únicamente el archivo `*_silent.mp4`; el master con audio se crea después mediante la pasada de sonido.

Antes del final se revisa el contact sheet y se entrega el draft a 30 FPS con su HTML para cambios, conforme a las skills. El usuario pidió esta primera aprobación de guion; la revisión del borrador será el siguiente punto concreto de revisión antes del master, no una solicitud genérica de permiso para cada paso.

El render final con subframes puede tardar decenas de minutos en una laptop. Se informará de una estimación basada en una muestra real de render antes de lanzarlo.

## Diseño sonoro

La skill exige elegir música grabada. Hay tres candidatas en la dirección creativa; aún no se han descargado o analizado. Para A se busca una base cálida con espacio; para B, percusión que sostenga impactos. C tendría una base mínima y contactos protagonistas.

El kit de efectos instalado contiene grabaciones `whoosh.ogg`, `click.ogg`, `pop.ogg`, `riser.ogg`, `impact.ogg` y `tick.ogg`; su manifest las declara CC0. Se comprobarán las páginas de origen de **los archivos realmente utilizados** antes de exportar, junto con la pista musical y su uso para Instagram/TikTok/anuncios online. No se declarará autorizada una fuente cuyos términos no puedan confirmarse. El tecleo no exige descargar el recurso Mixkit por defecto si hay una alternativa grabada adecuada en la biblioteca.

Proceso concreto:

1. Leer duración/FPS del render con ffprobe y construir `cues.json` desde el beat sheet de la composición.
2. Un sonido por cue importante. Evitar duplicar el golpe que ya existe en la música. Variar tomas dentro de una categoría cuando se repite un gesto.
3. Analizar la pista con `librosa.beat.beat_track`; filtrar graves por debajo de 120 Hz y comparar kicks con líneas de beat de los primeros cuatro compases. Corregir un desplazamiento de contratiempo si aparece y guardar `beatgrid.png`.
4. Ajustar visuales o inicio de música; registrar error de cada impacto/cambio principal en milisegundos. B aterriza sobre beats/subdivisiones; A mantiene el espacio de lectura.
5. Movimientos: whoosh comienza dos frames antes; clic/impacto: sobre contacto; riser: termina al llegar el revelado. No añadir ambientes de estadio a toda la pieza para fingir profundidad.
6. Usar `scripts/sound_pass.py` de la skill con video silencioso, cues, música, manifest, caso de uso, fuente y licencia confirmada; resolver cualquier error de log antes de entregar.
7. Música aproximadamente 12 dB por debajo de los efectos relevantes, ajustada por contenido; prioridad de diálogo si en el futuro se aprobara una locución. No hay locución en este guion.
8. Objetivo aproximado −16 LUFS integrados y true peak inferior a −4 dBFS en el **MP4 exportado**, no solo en el WAV. Medir estéreo y suma mono con ebur128; iterar ganancia/limitador y medir nuevamente.
9. Guardar frame anterior/posterior y onda de cada cue; elegir los cinco momentos de mayor riesgo de cada pieza para revisión con audífonos. Entregar `report.html`, `SOUND.md`, `CREDITS.txt` y reporte de swaps.

Se conservará la atribución del procedimiento de sound pass a Voxyz_ai/Vox indicada por la skill. Los créditos de recursos serán opcionales únicamente cuando la licencia concreta lo permita; el documento de procedencia se entrega siempre.

## Preflight técnico detectado en esta etapa

- Node y Playwright están disponibles; se ejecutaron los tests de Chromium de escritorio y móvil.
- `py` identifica Python 3.11.3.
- `ffmpeg` y `ffprobe` no se encontraron en PATH durante esta comprobación. Antes de renderizar se localizará una instalación existente o se preparará una herramienta local al directorio de campaña. No se ha instalado nada en esta etapa.
- El Node observado es v25.0.0, mientras el proyecto declara 24.x. Los tests seleccionados pasaron; producción tendrá un entorno aislado y se comprobará la compatibilidad del renderer en una muestra.
- Aún no se han medido CPU/memoria para definir workers ni se ha realizado render de prueba; no hay garantía de tiempo de exportación.

## Criterios de aceptación

| Área | Comprobación necesaria |
|---|---|
| Fidelidad | Cada gesto corresponde a un control real; estados de borrador/confirmado/finalizado correctos; misma competición en todo el relato |
| Datos | Suma de goles de jugadores = marcador; puntos y posición coherentes; ejemplos identificados; ninguna cifra de adopción o eficacia inventada |
| Logo | Archivo oficial idéntico, proporciones uniformes, colores intactos, legible al inicio/cierre, sin wordmark ficticio presentado como oficial |
| Movimiento | Sin frames vacíos, saltos de cámara, clipping, cambio de fuente ni elementos que atraviesen otros; comprobar frames en orden aleatorio con `seek` |
| Legibilidad | Lectura en teléfono, subtítulos/titulares en zona útil, controles importantes a tamaño suficiente, comprensión sin audio |
| B | Cambios relevantes alineados a beat, forma continua, no efectos sin relación conceptual, al menos 2 s de marca final |
| C si se aprueba | Protagonista visible, física consistente, estaciones fijas, revelado general y seam visual/sonoro correcto |
| Audio | Origen/licencia registrados, beat grid revisado, errores temporales reportados, nivel y picos medidos en MP4 estéreo/mono, sin doble mezcla |
| Archivo | ffprobe confirma 1080 × 1920, 60 FPS constantes, duración prevista, H.264/yuv420p y AAC donde hay audio; versión silenciosa sin pista de audio |
| Publicación | Revisión contra UI vigente del destino antes de exportar; no publicar ni subir automáticamente por haber aprobado la producción |

## Entrega posterior

MP4 final y silencioso por pieza; HTML de composición con preview/scrub; renderer y fuentes de animación; datos de ejemplo y recursos originales permitidos; beat sheets y cues; stills y drafts; mapa de procedencia `ASSETS.md`; QA de formatos, fidelidad y sonido; informes medidos de sonido y cinco timestamps por pieza.

El material de música bajo licencia que prohíba redistribución no se incluirá como biblioteca de audio reutilizable. Se entregará la ruta de adquisición/licencia y el código de carga adecuado, conservando el MP4 con su sincronización autorizada. La vista previa HTML local podrá referenciar el archivo descargado en la carpeta de caché del usuario.

**Punto actual: detener el trabajo antes de construir las animaciones.** Se solicita aprobación de la propuesta de A/B y elección de si se incluye C; no se requiere más información para continuar la investigación ya concluida.
