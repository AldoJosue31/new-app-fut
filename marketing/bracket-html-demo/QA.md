# Validación de la demostración

**Resultado final:** 18 comprobaciones aprobadas sobre la página estática, cero errores de consola y cero peticiones externas. Se revisaron 112 fotogramas de secuencia (28 + 28 + 56), además de los estados principales, móviles y de movimiento reducido. Se trazaron 47 etiquetas a 62 archivos originales.

## Tres rondas

| Ronda | Evidencia | Hallazgos y correcciones |
|---|---|---|
| 1 · Estructura | `round-1/frame-0.png` … `frame-27.png`, cada 1 s | Se corrigió un color claro heredado del motor, anchura del panel lateral de planificación, altura del encabezado, filas de jugadores y marcador separado de cada equipo |
| 2 · Fidelidad y reloj | `round-2/frame-0.png` … `frame-27.png`, cada 1 s | Se contrastaron con la app real las filas, grilla y modales. Se corrigió el umbral real de visibilidad, estados finales al hacer seek con movimiento reducido y reinicio de referencia temporal al recuperar visibilidad. Se ajustaron proporciones de la tabla/exportación y se incorporaron las notificaciones auténticas |
| 3 · Entrega estática | `round-3/frame-0.png` … `frame-27.5.png`, cada 0.5 s, capturas finales, móviles y reporte | Se corrigió la normalización de la ruta base del servidor estático en Windows. Se verificó el bundle exportado, todos los clics, determinismo, reproducción, modos de movimiento, accesibilidad básica, red y consola. Los resultados exactos están en `round-3/report.json` |

Se utilizó `vendor/html-demo/shoot.mjs`, copia del capturador de la skill, con `--frozen`, escala de dispositivo 2 y el reloj expuesto como `window.__hd`. Se añadió una espera a que React y las fuentes estén listos antes del primer seek.

## Comprobaciones reproducibles

`scripts/verify.mjs` verifica:

- Autoplay visible, duración de 28 s, cinco pasos dentro de los límites y cálculo de clasificación original.
- Doce pulsaciones: coordenadas del puntero dentro de las cajas reales de sus objetivos y estado de pulsación activo.
- Igualdad de DOM **y hash SHA-256 de la captura** al volver a 10.2, 17.2 y 26.8 s después de recorrer otros instantes.
- Pausa/reanudación, bucle, slider, flechas de teclado y botones de capítulo.
- Pausa fuera de pantalla y por debajo de 30 % visible; reanudación sin tiempo acumulado.
- Guarda `document.hidden` y eventos `freeze`/`resume` con entradas controladas.
- Anchos 1440, 390 y 340: sin overflow horizontal, escenario 16:10 y etiquetas de pasos completas.
- Cinco estados finales de movimiento reducido, navegación entre ellos, scrubbing y cambio reactivo de la preferencia.
- Escenario `role="img"`, descripción y contenido simulado oculto a lectores de pantalla; controles reales externos.
- Sin errores de consola, peticiones externas, `video`, `canvas` o `iframe` en la demo.

En Chromium headless, `Page.setWebLifecycleState` no emitió eventos ni congeló una página visible. No se usa ese intento como prueba de una pestaña oculta real. La guarda de visibilidad y los eventos del ciclo de vida se ejercitan de forma controlada, mientras que la salida/entrada de pantalla sí se comprueba con scroll e IntersectionObserver real.

El archivo de referencias registra las capturas de la aplicación original, cero escrituras remotas y una respuesta de guardado simulada. La ausencia de una foto de cédula se responde con 404 en ese entorno de referencia; la demo final no hace esa petición y su consola se comprueba por separado.

## Integridad y límites

El cambio está aislado en `marketing/bracket-html-demo`. `git diff` de los archivos versionados de producción permanece vacío. No se alteró autenticación, esquema, servicios ni lógica de negocio.

Los estados de carga se comprimieron para la duración del guion; no se afirma latencia real. Se reconstruyeron elementos visuales con DOM/CSS desde código y capturas; no se montó una sesión privada dentro de la demo. El resultado de clasificación sí utiliza directamente el cálculo original.

Se compilaron tanto el código actual de Bracket, para obtener referencias frescas, como la página independiente. La salida estática de esta última es la que sirve `npm run preview`.

Durante la tarea se agotó el espacio del disco. Se conservó la caché regenerable antigua de Turbopack en `F:\Codex-cache-backup\bracket-html-demo-2026-11-08\turbopack` para liberar espacio. No se borraron materiales de usuario. Esa copia no forma parte de la demo.
