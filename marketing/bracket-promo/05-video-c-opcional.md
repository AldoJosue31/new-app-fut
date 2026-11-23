# VIDEO C opcional — «Una jornada, un recorrido»

**Recomendación:** aporta una explicación visual diferente y funciona como segunda exposición de campaña. Su producción queda fuera de la aprobación básica de A/B salvo que el usuario la incluya expresamente.

**Duración propuesta:** 20 segundos, 1200 frames. **Skill:** `explainer-engaging`, con composición y renderer independientes. Vertical 1080 × 1920, 60 FPS. Sonido con `sound-effects`. Sin locución ni textos explicativos superpuestos: los propios rótulos de las estaciones cuentan el recorrido.

## La idea

Un disco claro recorre las etapas de una competición. A su paso, un campo recibe el nombre del torneo, los participantes se incorporan, los cruces obtienen horario, se confirma un marcador y aparece la tabla. La cámara se abre y descubrimos que ese viaje era una sola composición conectada.

El disco es una forma editorial independiente. No se extrae del balón, de los nodos ni de otra pieza del logo original. El emblema oficial aparece completo junto a la estación inicial y vuelve a ser protagonista cuando la cámara regresa.

## Storyboard de plano continuo

| Tiempo | Estación y texto real | Contacto y respuesta | Cámara y transición | Música y efectos |
|---|---|---|---|---|
| 00:00–00:03 | Torneo: **Temporada · Copa de Barrio** | El disco cae sobre el control e inicia el tipeo del nombre; se ve la configuración preparada | Comenzar en encuadre fijo y mezclar gradualmente con seguimiento durante 0,8 s. Sin corte | Groove grabado mínimo; contacto corto y escritura baja |
| 00:03–00:06 | **Equipos del Torneo** | Se desplaza por una lista; los cuatro participantes elegibles quedan incluidos. No «crea» equipos al tocarlos | Estación anclada y caída lateral a la siguiente. El disco deja una ranura tenue si abandonó un control | Un contacto por grupo, sin golpear cada nombre; música continúa |
| 00:06–00:10 | **Jornada 1**, **Confirmar Jornada** | El disco recorre los cruces y activa el horario preparado; el control confirma la jornada | Cámara abre ligeramente durante el salto y se acerca al control. Las estaciones no cambian de posición | Ticks discretos en contactos clave y pop de confirmación |
| 00:10–00:13 | **Guardar Marcador**, **Sí, guardar** | El disco activa la confirmación del 2–1 preparado con eventos válidos; aparece el estado guardado | Anclar al resultado durante la interacción. Sin sobreimpreso que invente una pantalla | Un clic al contacto y acento de guardado |
| 00:13–00:16 | **Clasificacion**, **PTS**, acceso público preparado | La fila correspondiente refleja el triunfo. Se sostiene el resultado de 0,4–0,6 s, totalmente en cuadro | La cámara favorece el ancla de la estación final antes del lanzamiento | El groove deja espacio al contacto final; no sumar un jingle nuevo |
| 00:16–00:18 | Rótulos propios de todas las estaciones | El disco se lanza hacia el inicio. Durante el primer segundo de apertura, el espectador ve todo el recorrido. Solo después comienzan los resets editoriales de la composición | Cámara deja de seguir y encuadra el lienzo completo, con inclinación de 15–25° y hold cercano a 1 s. Disco al menos 24 px visible | Whoosh ascendente; sostener la cola del arreglo |
| 00:18–00:20 | Emblema oficial completo junto al inicio; **Bracket · Más allá del amateur** | La cámara vuelve a la estación inicial y el disco aterriza en su ranura. El nombre y el eslogan pertenecen a esa estación de marca. La composición cierra el loop | Descenso hasta el encuadre inicial. Posición, escala y estado inicial/final coinciden; sin fundido a negro | Whoosh descendente y contacto; plegar cola sonora sobre el comienzo para evitar corte audible |

## Condiciones técnicas de la skill

- Un lienzo de aproximadamente tres veces el cuadro, con estaciones fijas y recorrido en zigzag. Gravedad lateral consistente; el protagonista nunca atraviesa tarjetas.
- Trayectorias parabólicas calculadas a los contactos; squash de unos 60 ms y estiramiento moderado en vuelo. No flotar entre estaciones.
- Cámara con adelanto de velocidad ~0,15 s y resorte críticamente amortiguado; hornear su historia a 1/240 s e interpolar desde `seek(t)`.
- Durante interacción, el disco mide aproximadamente 50–70 px en el encuadre final y permanece en la mitad central del cuadro.
- La apertura enseña el recorrido antes de resetear sus estaciones. Ese reset es una construcción de loop de motion graphics; no se presentará como una función que borra o revierte una competición.
- La retícula nominal de 120 BPM se ajustará a la pista grabada elegida y medida. El contacto visual conduce cada cue, con un único sonido por contacto importante.
- Renderer propio de `explainer-engaging`: revisión de stills, draft 30 FPS/1 subframe y final 60 FPS/8 subframes. No integrar el motor de B-roll ni el montaje de A dentro de esta cámara.

No se produce en esta etapa. Se conserva como guion listo para aprobar o descartar sin afectar A/B.
