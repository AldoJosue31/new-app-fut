# Guion de voz (opcional): Bracket App

> **Construida** en [reel-voz/](reel-voz/), con la voz «Isaac» de ElevenLabs.
>
> Cambio respecto a la tabla final: los títulos con palabras clave chocaban con los subtítulos y con la UI. Por eso, en la versión con voz los subtítulos ocupan la franja de los títulos (arriba) y los títulos se ocultan; solo la palabra que rueda en Reglas se mantiene.

Este guion es para la versión narrada del [GUION.md](GUION.md). Las imágenes y los tiempos son los mismos; cambia el texto en pantalla (ver al final).

- **Tono:** un organizador de liga hablándole a otro. Español de México, cercano y con energía de cancha, sin voz de locutor de radio.
- **Ritmo:** unas 2.7 palabras por segundo y unas 85 palabras en total para los 36 s. La voz deja huecos donde la música y el campeón tienen que respirar.
- **Quién la graba, de mejor a peor opción:**
  1. **Tú mismo con el celular**, en un cuarto sin eco y a un palmo del micrófono. En TikTok rinde más una voz real de creador que una de anuncio.
  2. Una voz de **HeyGen** (de pago, desde `/media-use`).
  3. Una voz sintética local gratuita, que suena más plana.
- **Subtítulos:** con voz, se queman subtítulos palabra por palabra en la franja inferior segura (y ≈ 1100–1240 px), porque mucha gente ve el feed sin sonido.

---

## Gancho H1 (recomendado)

| Tiempo | Escena | Voz | Palabras |
| --- | --- | --- | --- |
| 0.0–2.8 | E1 · chat lleno | «Si organizas una liga, ya sabes qué te van a preguntar…» | 10 |
| 3.0–5.3 | E2 · avalancha | *(sin voz: se oyen las notificaciones)* … «cada domingo, uno por uno.» | 5 |
| 5.6–7.3 | E3 · enlace | «Ahora contestas con un solo link.» | 6 |
| 7.6–10.4 | E4 · resultado | «Capturas el resultado del partido…» | 5 |
| 11.3–13.0 | E4 · la tabla se mueve | «…y la tabla y los goleadores se actualizan solos.» | 9 |
| 13.0–16.0 | E5 · reglas (cortes al ritmo) | «Con tus puntos, tus desempates y tu liguilla.» | 8 |
| 16.2–20.3 | E6 · exportar | «La sacas en imagen, con el diseño que quieras, lista para el grupo.» | 13 |
| 20.6–25.3 | E7 · delegado | «Y cada delegado tiene su propia cuenta: ve sus números y el análisis de su próximo rival.» | 17 |
| 25.6–28.3 | E8 · liguilla | «Llevas toda la liga hasta la final…» | 7 |
| 28.5–30.0 | E8 · campeón | *(sin voz: pausa, golpe y estadio)* | 0 |
| 30.2–32.4 | E9 · mensaje final | «Tu liga entera, en un link.» | 6 |
| 32.7–35.5 | E10 · cierre | «Bracket App. Empieza gratis: link en la bio.» | 7 |

**Total:** unas 93 palabras.

Si al grabar no cabe, el primer recorte es la frase de E6 («con el diseño que quieras» sobra) y el segundo, «del partido» en E4.

### Reglas de tiempo

- **La palabra cae sobre su imagen:**
  - «resultado» llega cuando el cursor toca el marcador.
  - «solos», cuando la fila de ASI aterriza en el 2.º.
  - «rival», cuando se llenan las barras.
  - «final», justo antes de la pausa del campeón.
- **Huecos sin voz:** la avalancha de E2 (3.0–4.4 s) y el golpe del campeón (28.5–30.0 s). Esos dos momentos los carga el sonido.
- **Música bajo la voz:** a 0.14 de volumen. Sube a pleno en los huecos.

---

## Variantes de voz para los otros ganchos

**H2 · «El resultado primero»** (0–2.5 s):
> «Mete un gol en tu liga… y mira la tabla.»

Después sigue igual desde E2, pero E2 cambia a: «Sin hacer cuentas. Sin contestar a nadie uno por uno.»

**H3 · «TABLA»** (0–3 s):
> «¿Todavía haces la tabla de tu liga a mano?»

Después sigue igual desde E2.

---

## Versión corta de 15 s, narrada

| Tiempo | Voz |
| --- | --- |
| 0.0–2.5 | «Mete un gol en tu liga… y mira la tabla.» |
| 2.5–6.5 | «La sacas en imagen, lista para el grupo.» |
| 6.5–9.5 | «Tus delegados ven el análisis de su rival.» |
| 9.5–12.5 | «Y llegas hasta el campeón.» |
| 12.5–15.0 | «Bracket App. Empieza gratis.» |

**Total:** unas 33 palabras.

---

## Texto en pantalla cuando hay voz

La pantalla no repite lo que dice la voz palabra por palabra: eso ya lo hacen los subtítulos. Los títulos grandes del guion se cambian por **una o dos palabras clave**, que se quedan arriba en la zona segura:

| Escena | Sin voz (GUION.md) | Con voz |
| --- | --- | --- |
| E1 | Organizar una liga es contestar esto | *(sin título; solo el chat y los subtítulos)* |
| E2 | …y tú, uno por uno | *(sin título)* |
| E3 | Un solo enlace | **1 link** |
| E4 | Capturas el resultado / La tabla se acomoda sola / Goleadores, al instante | **Resultado → Tabla** · **Goleadores** |
| E5 | Con tus reglas + palabra que gira | Solo la palabra que gira |
| E6 | Lista para compartir | **6 diseños** |
| E7 | Cada delegado, su cuenta / Y su próximo rival, analizado | **Delegados** · **Análisis del rival** |
| E8 | De la jornada 1 a la final | *(sin título; el «CAMPEÓN» de la app basta)* |
| E9 | Tu liga entera. Un enlace. | Se queda igual: es el mensaje y la voz lo dice junto con el texto. Es la única repetición. |
| E10 | Bracket App · Empieza gratis · Link en la bio | Se queda igual |
