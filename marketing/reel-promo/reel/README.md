# Reel de Bracket App (HyperFrames)

Es el [GUION.md](../GUION.md) construido con las capturas reales de la app: 36 s, 1080×1920, tema oscuro.

| Proyecto | Qué es |
| --- | --- |
| `reel/` | Versión **sin voz**: títulos en pantalla, música pendiente y efectos. |
| `../reel-voz/` | Versión **con voz**: voz «Isaac» de ElevenLabs (`assets/audio/voz-isaac.mp3`) y subtítulos sincronizados por palabra en la franja de títulos. |

## Cómo se genera

`tools/build.mjs` arma las 7 escenas a partir de `../capturas/`:
- Mete el DOM real congelado de cada estado.
- Reasigna los ids por escena.
- Monta el encuadre descrito abajo.

**Encuadre (v2):**
- **Teléfono a escala legible.** La app se ve siempre completa dentro de un teléfono a 2.2×: el texto de 14 px queda en 31 px. Nunca se recorta a lo ancho.
- **Navegación real dentro del teléfono:** empujes de pantalla, hojas que suben y bajan, pestañas y scroll de verdad.
- **Piezas elevadas.** Solo la pieza que importa salta al frente a ~2.8×: el marcador, las filas de la tabla, el carrusel de exportar, las probabilidades y el campeón. Mientras tanto el teléfono se encoge y se oscurece; luego la pieza regresa a su lugar.
- **Fondos por capítulo.** Cambian de color con la historia: noche, azul marino, dorado de la liga y naranja de Leones.

La versión anterior (cámara a 3–4× sobre la captura) quedó en `tools/build-v1.mjs`.

Además escribe los dos `index.html` y copia escenas y recursos a `reel-voz/`.

`tools/measure.mjs` mide dónde está cada elemento en las capturas y guarda el resultado en `tools/boxes.json`.

**No edites `compositions/*.html` a mano:** el generador los sobrescribe. Para cambiar algo, cambia `build.mjs` y vuelve a generar:

```powershell
node marketing/reel-promo/reel/tools/build.mjs
```

| Escena | Tiempo | Qué pasa |
| --- | --- | --- |
| `chat` | 0–7.5 s | Chat de delegados dentro del teléfono que se llena de «¿Cómo va la tabla?». Llega el enlace y el iris abre la tabla pública. |
| `resultado` | 7.5–13 s | Empuje a la jornada 8, toque en «Resultado» y la hoja sube. El marcador salta: 0–0 → 1–0 → 1–2. «Sí, guardar», la hoja baja y las filas saltan: ASI sube al 2.º con +3. |
| `reglas` | 13–16 s | La tabla regresa al teléfono. Ajustes del torneo con toques reales en las pestañas: puntos → formato → horarios. |
| `exportar` | 16–20.5 s | El carrusel salta y pasa por los 6 diseños y los colores de la liga. «Descargar»: el póster real sale sobre el dorado y la cámara entra por el escudo LDT. |
| `delegado` | 20.5–25.5 s | El teléfono sube sobre el naranja con la cuenta del delegado. Pestaña de análisis: la frase se escribe y las probabilidades se llenan. |
| `liguilla` | 25.5–30 s | Tabla final, toque en «Cuadro» y scroll real de cuartos a la final. Pausa y CAMPEÓN, que salta sobre el dorado. |
| `final` | 30–36 s | El escudo del campeón se envía al chat y llegan las respuestas. El teléfono baja, la imagen se vuelve el logo y cierra con «Empieza gratis». |

## Exportar el MP4

FFmpeg ya está instalado con winget. Desde una terminal nueva, para que tome el PATH:

```powershell
npx hyperframes render -o renders/bracket-reel-sin-voz.mp4
```

En `reel-voz/` es el mismo comando, con otro nombre de salida.

## Pendiente

- **Música.** El catálogo libre de HeyGen requiere iniciar sesión:

  ```powershell
  npx hyperframes auth login
  ```

  La otra opción es subir el video sin música y elegir un sonido en TikTok.

## Licencias

- **Efectos:** vienen de los efectos incluidos con HyperFrames y de Openverse. El impacto («Deep Cinematic Impact», de MeijstroAudio) es CC BY 4.0 y hay que darle crédito al publicar; los créditos están en `.media/audio/sfx/CREDITS.md`.
- **Voz:** la voz de ElevenLabs se generó con una cuenta gratuita. Antes de usarla en un anuncio, revisa si tu plan de ElevenLabs permite uso comercial.
