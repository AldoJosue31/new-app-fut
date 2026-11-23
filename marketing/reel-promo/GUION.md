# Guion del reel: Bracket App (9:16, TikTok / Reels)

**Base:** la historia A de [STORYLINES.md](STORYLINES.md), «¿Cómo va la tabla?». Va en el **tema oscuro**, como pediste, y como **cadena de objetos**: cada toma termina en lo que abre la siguiente.
**Duración:** 36 s, a 30 fps (1080 fotogramas), en 1080×1920.
**Capturas:** todas salen de [capturas/INDICE.md](capturas/INDICE.md) (`bloque/dispositivo/estado`). Nada de la app se dibuja.
**Voz en off:** es opcional y está en [VOZ.md](VOZ.md). Sin voz, el reel se entiende solo con títulos, música y efectos.

---

## 1. Lo que dice la investigación sobre ganchos

Las fuentes son sobre todo blogs de marketing, así que hay que tomarlas como orientación y no como datos firmes (enlaces al final). En lo que coinciden:

| Regla | Cómo se aplica aquí |
| --- | --- |
| **La propuesta de valor va en los primeros 3 s.** Es la guía oficial de TikTok for Business. | En los ganchos H1 y H2, el problema y la respuesta caben en 3 s. |
| **El primer fotograma ya tiene texto grande.** Mucha gente ve el feed sin sonido. | El fotograma 0 nunca está negro: trae un título y la imagen ya en movimiento. |
| **Hay movimiento físico en los primeros 2 s.** Supera a una apertura estática. | El chat entra vibrando, o la fila de la tabla ya va subiendo. |
| **Ruptura de patrón (*pattern interrupt*):** algo que haga pensar «¿qué estoy viendo?», pero que lleve al producto de inmediato. | En H3, la palabra TABLA se rompe y de adentro salen las filas reales. |
| **Nombrar el dolor:** el espectador se reconoce en la primera línea. | H1: la pregunta que el organizador escucha cada domingo. |
| **Retener a mitad del video:** un gancho nuevo cada 2–4 s y otro cerca del segundo 15. | Cada toma acaba en un objeto que abre la siguiente. En el s 13 hay un bloque de cortes al ritmo. |
| **La marca aparece antes del final:** TikTok recomienda 3–5 apariciones; dejarla solo para el cierre baja el recuerdo de marca. | «Bracket App» sale en la burbuja del enlace (s 6), en la tabla pública, en la imagen exportada y en el cierre. |
| **TikTok se ve con sonido:** siempre lleva audio. | Música a 120 BPM con efectos amarrados a lo que pasa en pantalla. |
| **Probar 3 ganchos sobre el mismo video** y quedarse con el que más retenga. | Hay tres ganchos intercambiables (H1, H2, H3) sobre el mismo cuerpo desde el s 3. |

---

## 2. Tres ganchos para probar (0–3 s)

Los tres llevan al mismo cuerpo (E2 en adelante). El **recomendado es H1**: el dolor se reconoce y toda la historia se apoya en él. **H2** conviene para anuncios pagados, porque muestra la función desde el fotograma 0.

### H1 · «La pregunta del domingo» (recomendado)
- **Fotograma 0:** pantalla de chat genérica (sin marca de WhatsApp), ya llena de burbujas grises que dicen «¿Cómo va la tabla?». Arriba aparece el título blanco en dos líneas: **«Organizar una liga es contestar esto»**.
- **0–3 s:** las burbujas suben empujadas desde abajo, una cada 4 fotogramas, con un pop de notificación en cada una. El contador de no leídos pasa de 12 a 99+ (número ilustrativo). En el s 2.2 el teléfono vibra: 8 fotogramas de `camera-shake`, perfil *handheld*, intensidad baja.
- **Corte:** la última burbuja tapa la pantalla y se convierte en la siguiente (E2).

### H2 · «El resultado primero» (para anuncios)
- **Fotograma 0:** la tabla pública en el móvil (`04-resultado/mobile/01-tabla-antes`), ampliada 1.8× sobre las filas 1 a 3. Encima, el título **«Mete un gol en tu liga…»**.
- **0–2 s:** el marcador «1 – 2» cae sobre la fila de Atlético San Isidro, que sube del 3.º al 2.º (`09-tabla-despues`) con su flecha verde. Sus puntos pasan de 12 a 15 como contador. El título termina: **«…y la tabla se mueve sola»**.
- **Corte:** la cámara se aleja y la tabla se encoge dentro de una burbuja de chat, la que abre E2.

### H3 · «TABLA» (la arriesgada)
- **Fotograma 0:** la palabra **TABLA** en Poppins Black, al 90 % del ancho, blanca sobre #131F24.
- **0–1.2 s:** las letras se parten en franjas horizontales, como las filas de una tabla. Se hace con `type-match-cut`: el titular se abre y deja crecer el panel. Cada franja se convierte en una fila real de la clasificación (`05-tabla/mobile/01-tabla`), con escudos y puntos.
- **1.2–3 s:** el título **«¿Todavía la haces a mano?»** entra palabra por palabra, desenfocado y luego nítido.
- **Corte:** la tabla se convierte en la imagen de una burbuja de chat.

---

## 3. Cuerpo, escena por escena (con gancho H1)

Cada escena dice qué captura usa, qué se mueve, el texto en pantalla, cómo pasa a la siguiente y qué suena.
- **Tiempos:** a 120 BPM, un tiempo dura 15 fotogramas (0.5 s) y un compás 2 s. Los cortes caen en tiempo.
- **Texto:** blanco sobre la UI oscura, como máximo 6 palabras por línea. Si una línea se debe leer, se queda en pantalla 0.5 s más 0.3 s por palabra.

### E1 · Gancho: 0.0–3.0 s (f 0–90)
Es H1, descrito arriba.

### E2 · Tensión: 3.0–5.5 s (f 90–165)
- **Mundo:** el mismo chat, pero ahora las preguntas cambian y se aceleran: «¿Quién va de goleador?», «¿Contra quién nos toca?», «¿Ya salió el rol?», «¿Pasamos a liguilla?».
- **Animación:**
  - Las burbujas entran una cada 3 fotogramas (antes 4).
  - Cada burbuja nueva empuja las demás con un resorte de amortiguación 0.6.
  - El chat se encoge un 4 % y se oscurece un 20 %, como si aplastara al organizador.
- **Texto en pantalla:** **«…y tú, uno por uno»**. Aparece completo con un desenfoque de 8 px a 0 en 0.15 s y se queda quieto.
- **Transición:** el ruido se corta en seco. Entra una burbuja azul del lado del organizador: la tarjeta del enlace.
- **Sonido:** pops de notificación que se aceleran (3 tomas que se alternan) y la música aún filtrada, con poco brillo.

### E3 · Revelación: 5.5–7.5 s (f 165–225)
- **Mundo:** la burbuja azul (#1cb0f6) del organizador, con una tarjeta de vista previa: el logo de Bracket App y «Liga Valle Dorado · Tabla, Cuadro y Goleadores».
- **Animación:**
  - La burbuja entra desde la derecha con un resorte de amortiguación 0.75.
  - Las preguntas grises de arriba se desenfocan 12 px y bajan al 40 % de opacidad.
  - Un dedo o cursor grande (6 % del cuadro) entra desde abajo y toca la tarjeta.
- **Texto en pantalla:** **«Un solo enlace»**.
- **Transición:** **iris desde el toque** (`iris-reveal`). Un círculo se abre desde el punto tocado en 0.15 s sobre la tabla pública (`08-publico/mobile/03-publico-tabla`), que llega 4 % más grande y se asienta.
- **Sonido:** clic seco en el toque. La música abre el filtro de golpe y entra el bajo: ahí empieza el compás.

### E4 · Prueba 1, resultado → tabla: 7.5–13.0 s (f 225–390)
1. **7.5–8.5:** sobre la tabla pública, la cámara (`ui-focus-zoom`) se acerca a la fila de Real Cuauhtémoc FC, el líder.
   - **Transición:** **zoom a través de la fila**. La fila se infla hasta llenar el cuadro y su fondo se vuelve el modal de resultado (`04-resultado/mobile/03-definir-resultado`).
2. **8.5–10.5:** el modal hace su trabajo.
   - Se rellenan los titulares (`04-titulares-local`).
   - Gol de Diego Herrera para RCF (`05-gol-local`).
   - Dos goles de Luis Flores Estrada para ASI (`06-goles-visita`).
   - Cada gol rueda el marcador como tragamonedas (0.1 s por giro). Queda **1 – 2**.
   - **Texto:** **«Capturas el resultado»**.
3. **10.5–11.3:** el cursor toca **«Sí, guardar»** (`07-confirmar`).
   - **Transición:** **morph**. El modal se condensa en una tira con el marcador, que viaja y se mete en la fila de ASI en la tabla (`morph-swap`, 0.35 s, `power3.out`).
4. **11.3–13.0:** la tabla se reacomoda (`09-tabla-despues`).
   - La fila de ASI sube del 3.º al 2.º y Leones de Tlalpan baja: es una animación real de filas, cada una en su posición.
   - Los PTS de ASI pasan de 12 a 15 como contador.
   - Aparece la flecha verde.
   - **Texto:** **«La tabla se acomoda sola»**.
   - **Remate a 12.4:** corte en tiempo a la pestaña Goleadores (`04-resultado/mobile/10-goleadores-despues`), donde Luis Flores Estrada sube a la cima con sus 11 goles. **Texto:** **«Goleadores, al instante»**.
- **Sonido:** un tic por cada giro del marcador, clic en «Sí, guardar», un *whoosh* corto cuando la tira viaja y un pop cuando la fila llega.

### E5 · Prueba 2, tus reglas: 13.0–16.0 s (f 390–480): el gancho de mitad de video
- **Forma:** **cortes al ritmo**, uno cada medio tiempo (7–8 fotogramas). Es el cambio de ritmo que retiene en el s 15.
- **Planos en orden**, cada uno con un acercamiento de 1.8× al control que importa:
  1. `01-reglas/mobile/02-puntuacion`: «Victoria 3».
  2. Desempate «Penales (Punto Extra)».
  3. `01-reglas/desktop/07-torneo-formato`: «Ida y Vuelta».
  4. Fase final con los 8 clasificados.
  5. `01-reglas/desktop/06-torneo-puntuacion`.
- **Texto:** una sola línea fija abajo, **«Con tus reglas»**. Encima, una palabra que gira como tragamonedas al ritmo de los cortes: **«puntos · desempates · vueltas · liguilla»**.
- **Transición:** **corte de choque** (`beat-freeze-cut`). En el último tiempo la imagen se congela 2 fotogramas, destella y corta a E6.
- **Sonido:** la percusión toma el frente con un golpe por corte. No hay *whoosh* en cada corte; la música carga los cortes.

### E6 · Prueba 3, exportar en imagen: 16.0–20.5 s (f 480–615)
1. **16.0–17.5:** se abre el carrusel de exportación (`07-exportar/mobile/01-tabla-clasica`).
   - Los diseños pasan con **barridos** (`whip-pan-cut`, 0.13 s cada uno): `02` → `03` → `04` → `05` → `06`.
   - Cada diseño se queda 0.2 s.
2. **17.5–18.5:** frena en **«Colores de la liga»** (`07-tabla-colores-liga`): la tabla en el dorado de Valle Dorado.
   - **Texto:** **«Lista para compartir»**.
3. **18.5–20.5:** el cursor toca «Descargar». Sale la imagen real `07-exportar/desktop/descargas/tabla-general.png`:
   - Se despega del modal y sube a pantalla completa como un póster que cae, con resorte de amortiguación 0.7 y una sombra que crece.
   - La cámara recorre la imagen de arriba abajo en 1.2 s, de «LIGA VALLE DORADO» hasta Leones de Tlalpan.
- **Transición:** **zoom a través del escudo**. La cámara se mete en el escudo LDT de Leones de Tlalpan (de 8 % a 250 % del cuadro en 0.35 s, `power3.in`). Su naranja se vuelve el fondo del siguiente mundo.
- **Sonido:** un *whoosh* por diseño (3 tomas que se alternan, más bajos que la música) y un golpe grave cuando el póster aterriza.

### E7 · Prueba 4, cuentas de delegado: 20.5–25.5 s (f 615–765)
1. **20.5–22.0:** del naranja sale la vista del delegado de Leones (`09-delegado/mobile/04-mi-equipo`).
   - **Texto:** **«Cada delegado, su cuenta»**.
2. **22.0–23.0:** la cámara baja hasta **«Análisis y probabilidades»** (`05-analisis-proximo-rival`). El próximo rival es Deportivo Colonia Norte.
3. **23.0–25.5:** las barras se llenan en cadena (`06-probabilidades`):
   - **Ganar 45 %** (verde), **Empatar 21 %** (amarillo) y **Perder 34 %** (rojo), con 0.12 s entre una y otra, en `expo.out`.
   - Los números suben como contador junto a su barra.
   - La frase de la app **«Tu equipo parte con ventaja»** aparece letra por letra.
   - **Texto:** **«Y su próximo rival, analizado»**.
- **Transición:** **el objeto se vuelve el mundo**. La cámara se aleja a la tabla del delegado (`09-tabla-delegado`) con «Tu equipo» resaltado. Las filas de abajo se pliegan y las 8 de arriba se ordenan en pares: es la entrada al cuadro.
- **Sonido:** un tic suave por barra y un pop en la frase.

### E8 · Pago, liga → liguilla → campeón: 25.5–30.0 s (f 765–900). El momento más grande, una sola vez
1. **25.5–26.5:** la tabla final (`06-liguilla/mobile/01-tabla-final`) se pliega.
   - Cada fila del 1 al 8 vuela a su lugar en el cuadro de cuartos: 1 contra 8, 2 contra 7 y así.
   - Es un *stagger* de 60 ms por fila.
2. **26.5–28.5:** el cuadro completo en escritorio (`06-liguilla/desktop/06-cuadro-completo`).
   - La cámara viaja de izquierda a derecha por cuartos → semis → final (`pan-stations`, una parada de 0.6 s en cada ronda).
   - Las líneas del cuadro se dibujan delante de la cámara y los marcadores de ida, vuelta y global aparecen con un pop.
   - **Texto:** **«De la jornada 1 a la final»**.
3. **28.5–30.0:** **CAMPEÓN** (`06-liguilla/mobile/07-torneo-con-campeon`).
   - El escudo de Real Cuauhtémoc FC llega al centro, la corona baja y encaja, y aparece el «CAMPEÓN» dorado de la app.
   - Antes del golpe hay una pausa de 0.4 s y luego todo corre a velocidad normal.
   - Aquí sí va el brillo dorado, porque es de la propia app.
- **Sonido:** un *riser* desde el s 27 hasta el golpe del campeón, y 1 s de grito de estadio. Es el único lugar del reel con *riser*.

### E9 · Mensaje final: 30.0–32.5 s (f 900–975)
- **Animación:**
  1. **Llevar al chat:** la pantalla del campeón se encoge a 0.6 con un desenfoque de 6 px a mitad del viaje y aterriza como imagen enviada en el **mismo chat del gancho**.
  2. Las burbujas grises de antes ahora contestan con reacciones 🔥⚽👏, que saltan con un resorte de 0.5 de amortiguación y 80 ms entre una y otra.
  3. La última pregunta, «¿Cómo va la tabla?», recibe la respuesta **«Ya está en el link 👆»**.
- **Texto:** **«Tu liga entera. Un enlace.»** Es el mensaje para recordar; se queda 2 s y no se mueve.
- **Sonido:** dos o tres pops de reacción y la música en su parte más alta.

### E10 · Cierre: 32.5–36.0 s (f 975–1080)
- **Animación:**
  1. **Morph:** la tarjeta del enlace del chat se condensa en el logo real (`public/logo_app.png`), centrado y al 25 % del ancho del cuadro.
  2. «Bracket App» entra con una cortinilla de izquierda a derecha.
  3. Abajo, el botón de la landing: **«Empieza gratis»**. Es el texto tal cual de `src/views/landing/copy.js`.
  4. Debajo, **«Link en la bio»** en tamaño menor.
- **Fondo:** #131F24 con el azul #1cb0f6 solo en el botón.
- **Duración:** el cierre se queda 2.5 s.
- **Sonido:** un golpe suave cuando el logo encaja, y la música termina en un compás con fundido de 0.5 s.

---

## 4. La cadena completa (la toma termina en lo que abre la siguiente)

```
burbuja «¿Cómo va la tabla?» → avalancha de preguntas → burbuja del enlace → [iris desde el toque]
→ tabla pública → [zoom a través de la fila] → modal de resultado → [morph: marcador a la fila]
→ la tabla se reacomoda → goleadores → [cortes al ritmo] → reglas → [congelado y destello]
→ carrusel de exportar → [barridos] → póster real → [zoom a través del escudo LDT]
→ cuenta del delegado → probabilidades → [la tabla se pliega] → cuadro de liguilla
→ campeón → [llevar al chat] → reacciones → [morph: enlace a logo] → cierre
```

Hay **6 tipos de transición** (iris, zoom a través de un objeto, morph, barrido, corte de choque y llevar de un mundo a otro), y cada una tiene una causa en pantalla. Solo 1 de las 9 uniones es un corte seco. Ningún mundo se funde encima de otro.

---

## 5. Look y movimiento en números

```
LOOK:    fondo: las propias superficies oscuras de la app (#131F24 / #10191D), siempre a sangre completa,
         nunca un vacío negro con UI pequeña flotando: la UI ocupa al menos 60 % del alto del cuadro.
         Tinta: blanco #FFFFFF y gris #9AA7AE. Acento 1: azul de la marca #1cb0f6, solo en la burbuja del enlace,
         en el botón del cierre y en lo que toca el cursor. Acento 2: dorado de la liga #F2B705, solo en
         la exportación «Colores de la liga» y en el campeón.
         Títulos: Poppins 700, 88 px (4.6 % del alto), tracking -1 %, máx. 6 palabras por línea, sin punto final.
         Texto secundario: Poppins 600, 44 px.
         Chat: burbujas con radio 28 px; gris #1E2A30 las preguntas, azul #1cb0f6 la del organizador.
         Sombra de la UI ampliada: desplazamiento 0 24 px, desenfoque 60 px, opacidad 0.45.
MOTION:  llegadas en expo.out o power4.out (0.5–0.7 s); cámara en power2.inOut (0.5 s);
         zoom a través y salidas en power3.in (0.35 s).
         Resortes de 0.6–0.75 en burbujas y póster; nunca en opacidad ni color.
         Stagger: palabras a 80 ms, filas a 60 ms, burbujas a 3–4 fotogramas.
         Desenfoque de movimiento con data-motion-blur="on" en la raíz (barridos y zooms).
ZONA SEGURA: todo texto entre y = 288 y 1248 px, x = 120 a 888 px (780 px de ancho debajo de y = 840).
         Abajo y a la derecha van la descripción y los botones de TikTok: ahí solo puede ir textura.
```

**PROHIBIDO en este reel:**
- Brillos, partículas u orbes decorativos. El único brillo es el dorado del campeón, que pertenece a la app. Por eso se quita el resplandor que la prueba técnica `hf-prueba` ponía sobre el objetivo.
- Gradientes morados o azules y tarjetas de vidrio.
- La UI inclinada en 3D.
- Tres tarjetas en fila.
- Un título sobre una captura oscurecida.
- Que todo entre con fundido y deslizamiento hacia arriba.
- Títulos que siguen moviéndose cuando ya aterrizaron.
- El logo pegado en una esquina.
- La marca de WhatsApp.
- Cifras de usuarios o testimonios.
- «En segundos», «revoluciona», «sin esfuerzo».

---

## 6. Sonido

- **Música:** urbana latina o *afro-house* a **120 BPM**, con mucho golpe en medios. Un bajo que solo pesa por debajo de 150 Hz no se oye en el altavoz del teléfono.
  - Arranca **filtrada** durante el gancho y se **abre de golpe en el toque del enlace** (s 6). Ese contraste es el gancho sonoro.
  - Si no tienes pista, se busca en el catálogo de HyperFrames (requiere tu sesión de HeyGen) o en una biblioteca libre de derechos.
  - **Para TikTok,** también se puede subir el video sin música y elegir un sonido en tendencia dentro de la app. Los efectos quedan horneados y la música la pone TikTok.
- **Efectos, cada uno con causa en pantalla:**

  | Efecto | Dónde |
  | --- | --- |
  | Pops de notificación (3 tomas) | E1 y E2 |
  | Clic | Cada toque del cursor |
  | Tics | Contadores y marcador |
  | *Whoosh* (3 tomas que se alternan) | Barridos de E6 y la tira del marcador |
  | *Riser* con golpe | Solo en el campeón |
  | Pops de reacción | E9 |

- **Mezcla:** efectos 3–6 dB sobre la música. El total ronda −14 LUFS con pico máximo de −1 dBTP.

---

## 7. Versión corta de 15 s (opcional, para anuncios)

**H2** (0–2.5) → **E6** comprimida: 3 diseños y el póster (2.5–6.5) → **E7** solo con las probabilidades (6.5–9.5) → **E8** solo con el cuadro y el campeón (9.5–12.5) → **E10** (12.5–15).
Usa la misma música y los mismos efectos. Es buena para comparar retención contra la versión de 36 s.

---

## 8. Datos que salen en pantalla (todos reales de la app, con datos ficticios)

- **Real Cuauhtémoc FC 1 – 2 Atlético San Isidro:** ASI sube del 3.º al 2.º y pasa de 12 a 15 puntos.
- **Goleador:** Luis Flores Estrada, con 11 goles.
- **Leones de Tlalpan contra Deportivo Colonia Norte:** Ganar 45 %, Empatar 21 %, Perder 34 %, «Tu equipo parte con ventaja».
- **Campeón:** Real Cuauhtémoc FC. **Subcampeón:** Leones de Tlalpan.
- **El «99+» del chat** es ilustrativo, porque el chat es el único mundo dibujado. No es un dato de la app.

---

## Fuentes de la investigación

- [TikTok for Business: Creative best practices from good to great](https://ads.tiktok.com/business/en/blog/creative-best-practices-from-good-to-great)
- [TikTok for Business: Creative Solutions, the ultimate how-to guide](https://ads.tiktok.com/business/en/blog/tiktok-creative-ultimate-guide)
- [TikTok Ads: Creative best practices for performance ads](https://ads.tiktok.com/help/article/creative-best-practices)
- [TikTok SMB Creative Playbook (PDF)](https://ads.tiktok.com/business/library/SMB_Creative_Playbook.pdf)
- [OpusClip: 8 things viral TikToks do in the first 3 seconds](https://www.opus.pro/blog/viral-tiktoks-first-3-seconds-2026)
- [OpusClip: TikTok hook formulas](https://www.opus.pro/blog/tiktok-hook-formulas)
- [Winning Hunter: 30 openers from top-performing TikTok ads](https://winninghunter.com/blog/scroll-stopping-hooks-tiktok-ads)
- [Imagine.art: Advertising hook examples](https://www.imagine.art/blogs/advertising-hook-examples)
- [tlinky: What is a 3 second hook](https://tlinky.com/3-second-hook/)
