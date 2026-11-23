# Capturas de Bracket App para el reel

Pantallas reales de la app (no maquetas), con datos ficticios, tema oscuro, en escritorio (1440×900) y móvil (390×844).
Generadas por `marketing/reel-promo/capture/` el 2026-11-22.

## Qué hay por cada estado

| Archivo | Para qué sirve en HyperFrames |
| --- | --- |
| `<estado>.html` | El DOM real congelado dentro de un marco `.bk-desktop` / `.bk-mobile`. Se abre solo en el navegador y se pega en una escena: el CSS ya está limitado al marco, las media queries resueltas y vw/vh en px. Es texto y vectores: se puede ampliar sin perder nitidez y animar fila por fila. |
| `<estado>.css` | El mismo CSS, aparte. |
| `<estado>.png` | Placa de referencia a resolución del dispositivo (2× escritorio, 3× móvil). |
| `<estado>.completa.png` | Página completa cuando la pantalla tiene scroll (para recorridos verticales). |
| `<estado>.json` | Ruta, viewport y cajas (x, y, w, h, centro, texto) de los elementos clave: destino del cursor, del acercamiento o del resaltado. |
| `piezas/<estado>--<objetivo>.png` | Recorte de cada elemento clave. |
| `descargas/*.png` | Las imágenes que la app exporta de verdad (tabla, goleadores, rol). |

Convertir un estado en escena: `node marketing/reel-promo/capture/to-hyperframes.mjs <proyecto-hf> <bloque/dispositivo/estado> <id-escena> [objetivo] [segundos]`.

## 01-reglas · Tu liga, tus reglas

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-plantilla-reglas | [html](01-reglas/desktop/01-plantilla-reglas.html) · [png](01-reglas/desktop/01-plantilla-reglas.png) | [html](01-reglas/mobile/01-plantilla-reglas.html) · [png](01-reglas/mobile/01-plantilla-reglas.png) | titulo, minJugadores |
| 02-puntuacion | [html](01-reglas/desktop/02-puntuacion.html) · [png](01-reglas/desktop/02-puntuacion.png) | [html](01-reglas/mobile/02-puntuacion.html) · [png](01-reglas/mobile/02-puntuacion.png) | seccion, victoria, desempate |
| 03-cambio-sin-guardar | [html](01-reglas/desktop/03-cambio-sin-guardar.html) · [png](01-reglas/desktop/03-cambio-sin-guardar.png) | [html](01-reglas/mobile/03-cambio-sin-guardar.html) · [png](01-reglas/mobile/03-cambio-sin-guardar.png) | campo, aviso |
| 04-reglas-activas | [html](01-reglas/desktop/04-reglas-activas.html) · [png](01-reglas/desktop/04-reglas-activas.png) | [html](01-reglas/mobile/04-reglas-activas.html) · [png](01-reglas/mobile/04-reglas-activas.png) | reglas, verConfig |
| 05-torneo-general | [html](01-reglas/desktop/05-torneo-general.html) · [png](01-reglas/desktop/05-torneo-general.png) | [html](01-reglas/mobile/05-torneo-general.html) · [png](01-reglas/mobile/05-torneo-general.png) | modal |
| 06-torneo-puntuacion | [html](01-reglas/desktop/06-torneo-puntuacion.html) · [png](01-reglas/desktop/06-torneo-puntuacion.png) | [html](01-reglas/mobile/06-torneo-puntuacion.html) · [png](01-reglas/mobile/06-torneo-puntuacion.png) | modal, pestana |
| 07-torneo-formato | [html](01-reglas/desktop/07-torneo-formato.html) · [png](01-reglas/desktop/07-torneo-formato.png) | [html](01-reglas/mobile/07-torneo-formato.html) · [png](01-reglas/mobile/07-torneo-formato.png) | modal, pestana |
| 08-torneo-reglas | [html](01-reglas/desktop/08-torneo-reglas.html) · [png](01-reglas/desktop/08-torneo-reglas.png) | [html](01-reglas/mobile/08-torneo-reglas.html) · [png](01-reglas/mobile/08-torneo-reglas.png) | modal, pestana |

## 02-equipos · Equipos y jugadores

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-equipos | [html](02-equipos/desktop/01-equipos.html) · [png](02-equipos/desktop/01-equipos.png) | [html](02-equipos/mobile/01-equipos.html) · [png](02-equipos/mobile/01-equipos.png) | leones, crear, contadores |
| 02-ficha-equipo | [html](02-equipos/desktop/02-ficha-equipo.html) · [png](02-equipos/desktop/02-ficha-equipo.png) | [html](02-equipos/mobile/02-ficha-equipo.html) · [png](02-equipos/mobile/02-ficha-equipo.png) | modal, delegado, estadisticas |
| 03-plantilla | [html](02-equipos/desktop/03-plantilla.html) · [png](02-equipos/desktop/03-plantilla.png) | [html](02-equipos/mobile/03-plantilla.html) · [png](02-equipos/mobile/03-plantilla.png) | modal |
| 04-estadisticas | [html](02-equipos/desktop/04-estadisticas.html) · [png](02-equipos/desktop/04-estadisticas.png) | [html](02-equipos/mobile/04-estadisticas.html) · [png](02-equipos/mobile/04-estadisticas.png) | modal |
| 05-estadisticas-jugadores | [html](02-equipos/desktop/05-estadisticas-jugadores.html) · [png](02-equipos/desktop/05-estadisticas-jugadores.png) | [html](02-equipos/mobile/05-estadisticas-jugadores.html) · [png](02-equipos/mobile/05-estadisticas-jugadores.png) | modal |

## 03-calendario · Torneo y calendario

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-torneo | [html](03-calendario/desktop/01-torneo.html) · [png](03-calendario/desktop/01-torneo.png) | [html](03-calendario/mobile/01-torneo.html) · [png](03-calendario/mobile/01-torneo.png) | definir, avanzar, metricas |
| 02-editor-fixture | [html](03-calendario/desktop/02-editor-fixture.html) · [png](03-calendario/desktop/02-editor-fixture.png) | [html](03-calendario/mobile/02-editor-fixture.html) · [png](03-calendario/mobile/02-editor-fixture.png) | modal |
| 03-jornada-lista | [html](03-calendario/desktop/03-jornada-lista.html) · [png](03-calendario/desktop/03-jornada-lista.png) | [html](03-calendario/mobile/03-jornada-lista.html) · [png](03-calendario/mobile/03-jornada-lista.png) | resultado, selector |
| 04-jornada-grilla | [html](03-calendario/desktop/04-jornada-grilla.html) · [png](03-calendario/desktop/04-jornada-grilla.png) | [html](03-calendario/mobile/04-jornada-grilla.html) · [png](03-calendario/mobile/04-jornada-grilla.png) | calendario, exportarRol |

## 04-resultado · Resultado que mueve la tabla

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-tabla-antes | [html](04-resultado/desktop/01-tabla-antes.html) · [png](04-resultado/desktop/01-tabla-antes.png) | [html](04-resultado/mobile/01-tabla-antes.html) · [png](04-resultado/mobile/01-tabla-antes.png) | asi, leones, rcf |
| 02-jornada | [html](04-resultado/desktop/02-jornada.html) · [png](04-resultado/desktop/02-jornada.png) | [html](04-resultado/mobile/02-jornada.html) · [png](04-resultado/mobile/02-jornada.png) | partido, resultado |
| 03-definir-resultado | [html](04-resultado/desktop/03-definir-resultado.html) · [png](04-resultado/desktop/03-definir-resultado.png) | [html](04-resultado/mobile/03-definir-resultado.html) · [png](04-resultado/mobile/03-definir-resultado.png) | modal |
| 04-titulares-local | [html](04-resultado/desktop/04-titulares-local.html) · [png](04-resultado/desktop/04-titulares-local.png) | [html](04-resultado/mobile/04-titulares-local.html) · [png](04-resultado/mobile/04-titulares-local.png) | autorellenar |
| 05-gol-local | [html](04-resultado/desktop/05-gol-local.html) · [png](04-resultado/desktop/05-gol-local.png) | [html](04-resultado/mobile/05-gol-local.html) · [png](04-resultado/mobile/05-gol-local.png) | — |
| 06-goles-visita | [html](04-resultado/desktop/06-goles-visita.html) · [png](04-resultado/desktop/06-goles-visita.png) | [html](04-resultado/mobile/06-goles-visita.html) · [png](04-resultado/mobile/06-goles-visita.png) | — |
| 07-confirmar | [html](04-resultado/desktop/07-confirmar.html) · [png](04-resultado/desktop/07-confirmar.png) | [html](04-resultado/mobile/07-confirmar.html) · [png](04-resultado/mobile/07-confirmar.png) | confirmacion |
| 08-guardado | [html](04-resultado/desktop/08-guardado.html) · [png](04-resultado/desktop/08-guardado.png) | [html](04-resultado/mobile/08-guardado.html) · [png](04-resultado/mobile/08-guardado.png) | partido |
| 09-tabla-despues | [html](04-resultado/desktop/09-tabla-despues.html) · [png](04-resultado/desktop/09-tabla-despues.png) | [html](04-resultado/mobile/09-tabla-despues.html) · [png](04-resultado/mobile/09-tabla-despues.png) | asi, leones, rcf |
| 10-goleadores-despues | [html](04-resultado/desktop/10-goleadores-despues.html) · [png](04-resultado/desktop/10-goleadores-despues.png) | [html](04-resultado/mobile/10-goleadores-despues.html) · [png](04-resultado/mobile/10-goleadores-despues.png) | lider |

## 05-tabla · Tabla y goleadores en tiempo real

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-tabla | [html](05-tabla/desktop/01-tabla.html) · [png](05-tabla/desktop/01-tabla.png) | [html](05-tabla/mobile/01-tabla.html) · [png](05-tabla/mobile/01-tabla.png) | tabla, fila1, selector, criterios |
| 02-resultados-equipo | [html](05-tabla/desktop/02-resultados-equipo.html) · [png](05-tabla/desktop/02-resultados-equipo.png) | [html](05-tabla/mobile/02-resultados-equipo.html) · [png](05-tabla/mobile/02-resultados-equipo.png) | — |
| 03-goleadores | [html](05-tabla/desktop/03-goleadores.html) · [png](05-tabla/desktop/03-goleadores.png) | [html](05-tabla/mobile/03-goleadores.html) · [png](05-tabla/mobile/03-goleadores.png) | lider, tabla |

## 06-liguilla · Liga → liguilla

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-tabla-final | [html](06-liguilla/desktop/01-tabla-final.html) · [png](06-liguilla/desktop/01-tabla-final.png) | [html](06-liguilla/mobile/01-tabla-final.html) · [png](06-liguilla/mobile/01-tabla-final.png) | tabla, liguilla |
| 02-cruces-cuartos | [html](06-liguilla/desktop/02-cruces-cuartos.html) · [png](06-liguilla/desktop/02-cruces-cuartos.png) | [html](06-liguilla/mobile/02-cruces-cuartos.html) · [png](06-liguilla/mobile/02-cruces-cuartos.png) | modal, confirmar |
| 03-cuadro-cuartos | [html](06-liguilla/desktop/03-cuadro-cuartos.html) · [png](06-liguilla/desktop/03-cuadro-cuartos.png) | [html](06-liguilla/mobile/03-cuadro-cuartos.html) · [png](06-liguilla/mobile/03-cuadro-cuartos.png) | — |
| 04-cruces-semis | [html](06-liguilla/desktop/04-cruces-semis.html) · [png](06-liguilla/desktop/04-cruces-semis.png) | [html](06-liguilla/mobile/04-cruces-semis.html) · [png](06-liguilla/mobile/04-cruces-semis.png) | modal, confirmar |
| 05-cruces-final | [html](06-liguilla/desktop/05-cruces-final.html) · [png](06-liguilla/desktop/05-cruces-final.png) | [html](06-liguilla/mobile/05-cruces-final.html) · [png](06-liguilla/mobile/05-cruces-final.png) | modal, confirmar |
| 06-cuadro-completo | [html](06-liguilla/desktop/06-cuadro-completo.html) · [png](06-liguilla/desktop/06-cuadro-completo.png) | [html](06-liguilla/mobile/06-cuadro-completo.html) · [png](06-liguilla/mobile/06-cuadro-completo.png) | — |
| 07-torneo-con-campeon | [html](06-liguilla/desktop/07-torneo-con-campeon.html) · [png](06-liguilla/desktop/07-torneo-con-campeon.png) | [html](06-liguilla/mobile/07-torneo-con-campeon.html) · [png](06-liguilla/mobile/07-torneo-con-campeon.png) | — |
| 09-publico-cuadro | [html](06-liguilla/desktop/09-publico-cuadro.html) · [png](06-liguilla/desktop/09-publico-cuadro.png) | [html](06-liguilla/mobile/09-publico-cuadro.html) · [png](06-liguilla/mobile/09-publico-cuadro.png) | cuadro |

## 07-exportar · Exportar en imagen

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-tabla-clasica | [html](07-exportar/desktop/01-tabla-clasica.html) · [png](07-exportar/desktop/01-tabla-clasica.png) | [html](07-exportar/mobile/01-tabla-clasica.html) · [png](07-exportar/mobile/01-tabla-clasica.png) | modal, siguiente, descargar |
| 02-tabla-combinacion-2 | [html](07-exportar/desktop/02-tabla-combinacion-2.html) · [png](07-exportar/desktop/02-tabla-combinacion-2.png) | [html](07-exportar/mobile/02-tabla-combinacion-2.html) · [png](07-exportar/mobile/02-tabla-combinacion-2.png) | modal |
| 03-tabla-combinacion-3 | [html](07-exportar/desktop/03-tabla-combinacion-3.html) · [png](07-exportar/desktop/03-tabla-combinacion-3.png) | [html](07-exportar/mobile/03-tabla-combinacion-3.html) · [png](07-exportar/mobile/03-tabla-combinacion-3.png) | modal |
| 04-tabla-combinacion-4 | [html](07-exportar/desktop/04-tabla-combinacion-4.html) · [png](07-exportar/desktop/04-tabla-combinacion-4.png) | [html](07-exportar/mobile/04-tabla-combinacion-4.html) · [png](07-exportar/mobile/04-tabla-combinacion-4.png) | modal |
| 05-tabla-combinacion-5 | [html](07-exportar/desktop/05-tabla-combinacion-5.html) · [png](07-exportar/desktop/05-tabla-combinacion-5.png) | [html](07-exportar/mobile/05-tabla-combinacion-5.html) · [png](07-exportar/mobile/05-tabla-combinacion-5.png) | modal |
| 06-tabla-combinacion-6 | [html](07-exportar/desktop/06-tabla-combinacion-6.html) · [png](07-exportar/desktop/06-tabla-combinacion-6.png) | [html](07-exportar/mobile/06-tabla-combinacion-6.html) · [png](07-exportar/mobile/06-tabla-combinacion-6.png) | modal |
| 07-tabla-colores-liga | [html](07-exportar/desktop/07-tabla-colores-liga.html) · [png](07-exportar/desktop/07-tabla-colores-liga.png) | [html](07-exportar/mobile/07-tabla-colores-liga.html) · [png](07-exportar/mobile/07-tabla-colores-liga.png) | modal, colores |
| 08-goleadores | [html](07-exportar/desktop/08-goleadores.html) · [png](07-exportar/desktop/08-goleadores.png) | [html](07-exportar/mobile/08-goleadores.html) · [png](07-exportar/mobile/08-goleadores.png) | modal |
| 09-goleadores-barras | [html](07-exportar/desktop/09-goleadores-barras.html) · [png](07-exportar/desktop/09-goleadores-barras.png) | [html](07-exportar/mobile/09-goleadores-barras.html) · [png](07-exportar/mobile/09-goleadores-barras.png) | modal |
| 10-rol-de-juego | [html](07-exportar/desktop/10-rol-de-juego.html) · [png](07-exportar/desktop/10-rol-de-juego.png) | [html](07-exportar/mobile/10-rol-de-juego.html) · [png](07-exportar/mobile/10-rol-de-juego.png) | modal |

Imágenes exportadas por la app: [goleadores.png](07-exportar/desktop/descargas/goleadores.png) · [rol-jornada-8.png](07-exportar/desktop/descargas/rol-jornada-8.png) · [tabla-general.png](07-exportar/desktop/descargas/tabla-general.png)

## 08-publico · Enlace público

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-interruptor-publico | [html](08-publico/desktop/01-interruptor-publico.html) · [png](08-publico/desktop/01-interruptor-publico.png) | [html](08-publico/mobile/01-interruptor-publico.html) · [png](08-publico/mobile/01-interruptor-publico.png) | publico, copiar |
| 02-enlace-copiado | [html](08-publico/desktop/02-enlace-copiado.html) · [png](08-publico/desktop/02-enlace-copiado.png) | [html](08-publico/mobile/02-enlace-copiado.html) · [png](08-publico/mobile/02-enlace-copiado.png) | copiar |
| 03-publico-tabla | [html](08-publico/desktop/03-publico-tabla.html) · [png](08-publico/desktop/03-publico-tabla.png) | [html](08-publico/mobile/03-publico-tabla.html) · [png](08-publico/mobile/03-publico-tabla.png) | titulo, tabla |
| 04-publico-goleadores | [html](08-publico/desktop/04-publico-goleadores.html) · [png](08-publico/desktop/04-publico-goleadores.png) | [html](08-publico/mobile/04-publico-goleadores.html) · [png](08-publico/mobile/04-publico-goleadores.png) | lider |

## 09-delegado · Cuentas de delegado

| Estado | Escritorio | Móvil | Objetivos |
| --- | --- | --- | --- |
| 01-equipos-sin-vincular | [html](09-delegado/desktop/01-equipos-sin-vincular.html) · [png](09-delegado/desktop/01-equipos-sin-vincular.png) | [html](09-delegado/mobile/01-equipos-sin-vincular.html) · [png](09-delegado/mobile/01-equipos-sin-vincular.png) | sinVincular, invitaciones |
| 02-invitaciones | [html](09-delegado/desktop/02-invitaciones.html) · [png](09-delegado/desktop/02-invitaciones.png) | [html](09-delegado/mobile/02-invitaciones.html) · [png](09-delegado/mobile/02-invitaciones.png) | modal, crear |
| 03-invitaciones-creadas | [html](09-delegado/desktop/03-invitaciones-creadas.html) · [png](09-delegado/desktop/03-invitaciones-creadas.png) | [html](09-delegado/mobile/03-invitaciones-creadas.html) · [png](09-delegado/mobile/03-invitaciones-creadas.png) | — |
| 04-mi-equipo | [html](09-delegado/desktop/04-mi-equipo.html) · [png](09-delegado/desktop/04-mi-equipo.png) | [html](09-delegado/mobile/04-mi-equipo.html) · [png](09-delegado/mobile/04-mi-equipo.png) | equipo, resumen |
| 05-analisis-proximo-rival | [html](09-delegado/desktop/05-analisis-proximo-rival.html) · [png](09-delegado/desktop/05-analisis-proximo-rival.png) | [html](09-delegado/mobile/05-analisis-proximo-rival.html) · [png](09-delegado/mobile/05-analisis-proximo-rival.png) | titulo, selector |
| 06-probabilidades | [html](09-delegado/desktop/06-probabilidades.html) · [png](09-delegado/desktop/06-probabilidades.png) | [html](09-delegado/mobile/06-probabilidades.html) · [png](09-delegado/mobile/06-probabilidades.png) | — |
| 08-temporada | [html](09-delegado/desktop/08-temporada.html) · [png](09-delegado/desktop/08-temporada.png) | [html](09-delegado/mobile/08-temporada.html) · [png](09-delegado/mobile/08-temporada.png) | pestana |
| 09-tabla-delegado | [html](09-delegado/desktop/09-tabla-delegado.html) · [png](09-delegado/desktop/09-tabla-delegado.png) | [html](09-delegado/mobile/09-tabla-delegado.html) · [png](09-delegado/mobile/09-tabla-delegado.png) | tuEquipo |
| 07-rival-en-contexto | — | [html](09-delegado/mobile/07-rival-en-contexto.html) · [png](09-delegado/mobile/07-rival-en-contexto.png) | boton |

