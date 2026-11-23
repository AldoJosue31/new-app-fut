# Dirección creativa — «Más allá del amateur»

## La historia

El primer gol es visible. El trabajo que hace posible la jornada suele ser invisible. Bracket da forma a ese trabajo: las decisiones del organizador se convierten en equipos participantes, enfrentamientos, horarios y resultados que la liga puede compartir.

La publicidad seguirá **la misma competición y el mismo partido**. La emoción nace de ver que cada acción tiene una consecuencia. No se utilizarán testimonios, cifras comerciales ni una sucesión de iconos que enumere funcionalidades.

**Promesa narrativa:** poner en movimiento la organización de una liga. **Eslogan indicado por el usuario:** «Más allá del amateur». Se adopta como frase de campaña y cierre de marca.

## Audiencia y tarea de cada anuncio

| Pieza | Audiencia y contexto | Lo que debe sentir | Lo que debe entender |
|---|---|---|---|
| A | Organizador que necesita conocer el producto | Claridad, control y cuidado profesional por su liga | Cómo se conecta organizar una jornada con registrar y compartir sus resultados |
| B | Organizador en un feed móvil, sin contexto previo | Energía deportiva y curiosidad por la marca | Bracket conecta reglas, jornada, marcador y presentación |
| C opcional | Persona que ya vio la marca o quiere entender el recorrido | Satisfacción al ver un sistema completo | Las etapas pertenecen a una misma competición |

## Identidad visual y recursos

| Elemento | Fuente real | Decisión |
|---|---|---|
| Emblema | `../../public/logo_app.png` | Utilizar el PNG original, no trazarlo, recolorearlo, separar sus piezas ni generar una aproximación |
| Color de acción | `src/styles/themes.jsx`: `#1CB0F6` | Único acento dominante de interfaz y de las formas de transición |
| Selección | `#84D8FF` y transparencias del tema | Focos, filas y controles activos |
| Lienzo de A | `#EDF3FB`, blanco, texto `#3C3C3C` | Espacio respirable y planos de interfaz claros; preservar el carácter luminoso de `explainer-default` |
| Lienzo de B/C | `#131F24` y `#10191D`, blanco | Usar el tema oscuro real para el lenguaje deportivo/tecnológico |
| Tipografía principal | Poppins local 400/600/700 | Titulares 700, interfaz 400/600. No simular un peso 900 inexistente |
| Metadatos de B | Geist Mono Medium del recurso de la skill, SIL OFL | Exclusivamente HUD editorial; incrustar fuente y licencia. Nombre, mensajes e interfaz siguen en Poppins |
| Iconos de interfaz | React Icons / Remix y controles del código | Conservar familias y formas visibles; no introducir emoji como iconografía del anuncio |
| Equipos de demostración | Nombres y monogramas de ejemplo mediante el patrón real de DynamicTeamLogo | Evitar escudos de clubes terceros o datos personales |
| Cédula de ejemplo | Composición ficticia basada en la cédula que exporta Bracket | Documento original de campaña; sin nombres, teléfonos o firmas de personas reales |

Ruta correcta del logo desde esta carpeta: `../../public/logo_app.png`. La copia eventual a una carpeta de assets deberá conservar el SHA-256, para acreditar que se utilizó el archivo suministrado por el producto.

El emblema es un raster de 500 px. En el master vertical se propone mostrarlo con anchura de 360–440 px, para conservar su detalle sin convertir el cierre en una ampliación borrosa. Las transformaciones serán uniformes; la textura y cualquier pequeño detalle del original se conservan.

## Lenguaje de movimiento

**A — precisión y confianza.** Capítulos con una frase breve, acercamiento de cámara y una interacción grande. Cada escena tiene cámara propia. Entradas suaves de 0,6–1,2 segundos, resortes críticamente amortiguados, pausa para leer después del resultado y disoluciones con desenfoque de 0,3–0,4 segundos. Los textos de capítulo y las demostraciones se alternan para no competir. Nada de rebotes en controles o ventanas.

**B — ritmo y continuidad.** Una marca azul independiente del logo se estira hasta convertirse en línea; la línea se convierte en máscara de la escena siguiente. La tipografía aterriza sobre pulsos y subdivisiones; las interfaces tienen microacciones concretas. Una sola visualización espacial conecta los bloques de la jornada. El movimiento rápido lleva desenfoque temporal real. Los impactos pueden tener sobrepaso pequeño y asentarse inmediatamente; la interfaz conserva su aspecto legible.

**C — recorrido físico.** Un pequeño disco luminoso activa estaciones fijas de interfaz en un lienzo amplio. La cámara lo acompaña y se abre al final para enseñar el recorrido completo. El disco nunca se convierte en el logo; el emblema se mantiene íntegro en su estación de marca.

## Composición para teléfono

- Master de 1080 × 1920. Zona de trabajo inicial para información esencial: x=96–900, y=240–1500; logo y cierre centrados cerca de x=500, y=900. Es un margen editorial conservador, no una afirmación de zonas oficiales de todas las plataformas.
- Revisar contra la interfaz vigente de cada destino antes de publicar, porque botones y sobreimpresos de Reels/TikTok cambian.
- Titulares de 80–112 px; frases de 3–6 palabras; máximo dos líneas en B. En A, un título breve por escena. Texto importante de interfaz de 36–44 px al tamaño final mediante encuadre y cámara.
- Encuadrar el control necesario en vez de reducir una pantalla de escritorio entera a la anchura del teléfono. El breve plano general da contexto; el plano cercano permite leer y entender.
- Una pulsación llega antes de la respuesta. Se verá hover/press, cambio del control, confirmación y resultado. No se trasladarán acciones a controles que no existen.
- Los HUD son textura secundaria. No contienen mensajes necesarios para comprender la publicidad y no invaden el logo ni los controles de plataforma.

## Cierre de marca

La línea de la última interacción se repliega detrás de una placa de color. La placa se abre como máscara y revela **todo el PNG oficial**, con sus colores y geometría intactos. Un arco exterior, separado del archivo, completa el recorrido. La escala del emblema pasa suavemente de 0,94 a 1 y se sostiene.

Debajo aparece «Bracket» compuesto en Poppins y «Más allá del amateur». En A, el cierre tiene tres segundos limpios; en B, al menos dos. El logo se lee completo, sin giros de perspectiva, recoloración ni partículas que sustituyan sus piezas.

No se añade URL por deducción de variables de entorno ni se muestran tiendas de descarga. Cuando el usuario confirme un destino comercial, podrá incorporarse como variante de cierre sin cambiar la narrativa.

## Música propuesta para elegir

La skill `sound-effects` exige archivos grabados y prohíbe sintetizar música/SFX. Se aplicará ese criterio a toda la cadena: los ejemplos de síntesis de las skills explainer no se utilizarán para crear las pistas. La música y los efectos se añadirán una sola vez en postproducción sobre el video silencioso.

| Candidata | Pieza propuesta | Motivo de selección | Fuente consultada |
|---|---|---|---|
| «It's Love» — Michael Ramir C., Mixkit #834 | A, recomendada | La descripción del catálogo la sitúa en electrónica de tono ascendente y relajado; deja espacio a las demostraciones | [Catálogo oficial corporate](https://mixkit.co/free-stock-music/corporate-music/) |
| «Pop Track 06» — Lily J, Mixkit #732 | A, alternativa | El catálogo la describe como electrónica instrumental y futurista; permite una versión con mayor sensación tecnológica | [Catálogo oficial corporate](https://mixkit.co/free-stock-music/corporate-music/) |
| «Techno Fights» — Alejandro Magaña (A. M.), Mixkit #171 | B, recomendada | El catálogo la presenta como house propulsivo, apropiado para una estructura de impactos y microacciones | [Catálogo oficial electronica](https://mixkit.co/free-stock-music/electronica/) |

Las fichas y autores se contrastaron en el catálogo oficial durante la planificación. No se descargó ni escuchó una pista en esta etapa y no se atribuye un BPM medido. La página general de [licencias de Mixkit](https://mixkit.co/license/) identifica una licencia específica para música; la extracción de texto no expuso sus cláusulas desplegables. **La autorización concreta para anuncios y los términos vigentes se confirmarán antes de utilizar y exportar el tema seleccionado**, conservando fuente, fecha y condiciones. No se trata la aprobación de un guion como sustituto de esa verificación.

Si se elige C, tendrá una cama grabada de groove mínimo compatible con el tempo medido; se propondrá su selección antes del montaje. Los contactos del protagonista llevarán la narración sonora.

## Qué se mantiene fuera de esta campaña

Las transferencias, gestión administrativa de managers, pronósticos, fases eliminatorias y solicitudes de delegado sí tienen implementación o evidencia de código, pero sumar todos esos temas convertiría la pieza principal en un catálogo. La campaña concentra la atención en la jornada y reserva esos asuntos para anuncios posteriores de audiencia específica.

`motion-broll` se evaluó y queda sin uso: no hay video base con discurso/transcripción. `object-separation` también queda sin uso: no hay sujetos filmados que deban separarse de un fondo. No aportaría nada aplicarla al logo transparente o a elementos de interfaz.
