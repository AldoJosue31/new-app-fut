# Investigación de Bracket

## Arquitectura y fuentes de verdad

El `package.json` vigente usa Next.js 16.2.12, React 19.2, App Router, styled-components, Framer Motion y Zustand. El README raíz conserva texto de una plantilla Vite y no describe la arquitectura actual. La demo utiliza el Next instalado en la raíz, pero tiene su propio directorio `app`, configuración, salida y servidor.

Se inventariaron `app/`, `src/`, `public/`, `tests/`, documentación y materiales de marketing existentes. Las referencias anteriores de `marketing/bracket-promo` sirvieron para localizar pantallas; las evidencias finales de esta entrega se regeneraron desde el build actual y los datos de `src/data.mjs`. No se modificaron los materiales anteriores.

Las rutas privadas montan vistas y templates. Los hooks de página y planificación coordinan servicios; las utilidades contienen cálculos de fixture, resultados y clasificación. Los servicios y las API Next conectan con Supabase. Las pruebas de navegador existentes proporcionan un patrón de autenticación sintética y respuestas interceptadas, reutilizado para observar la interfaz sin operar datos reales.

## Funcionalidades comprobadas

| Área | Evidencia de código | Hallazgo y valor |
|---|---|---|
| Liga y divisiones | `src/hooks/pages/useLigaLogic.js`, `src/components/template/LigaTemplate.jsx`, tabs de liga | Configuración de liga, categorías/divisiones, reglas, árbitros y solicitudes. Permite adaptar la organización a su estructura |
| Equipos y jugadores | `useEquiposLogic.js`, `EquiposTemplate.jsx`, `EquiposStore.jsx`, `JugadoresStore.jsx` | Crear/editar equipos, plantillas, jugadores, invitaciones y solicitudes. Centraliza participantes |
| Torneo y participantes | `useTorneosLogic.js`, `TorneoDefinicionTab.jsx`, `services/torneos/mutations.js` | Requisitos de participación, alta de torneo, jornadas y enfrentamientos |
| Fixture | `fixtureAlgorithms.js`, `useFixturePreview.js`, `FixturePreviewModal.jsx`, validadores | Round robin, revisión, edición y restricciones. La demo no promete programación perfecta automática |
| Jornadas | `TorneoJornadasTab.jsx`, `JornadaPlanificacion.jsx`, `PlanningHeader.jsx`, `ScheduledMatchRow.jsx`, `WeeklyGridView.jsx` | Lista/grilla semanal, fechas, horas, confirmación, pendientes y resultados. **Representado** |
| Resultados | `ResultModal.jsx`, `RosterTab.jsx`, `GeneralTab.jsx`, `ScoreHeader.jsx`, `ConfirmResultOverlay.jsx` | Plantillas, goles, autogoles, tarjetas, árbitro opcional, W.O., penales cuando corresponden y confirmación. **Representado: titulares, un gol y confirmación** |
| Guardado | `handleFinalSave`, `saveMatchResultAtomicService` | Eventos y marcador viajan a `save_match_result_atomic`; el partido pasa a `Finalizado`. Se observó la ruta real de guardado con respuesta RPC sintética. **Representado** |
| Clasificación | `standingsSnapshot.js`, `useTorneoStandingsLogic.js`, `StandingsTable.jsx` | Acumula PJ, DIF, puntos y resultados, con cortes por jornada. **Representado y calculado con la función original** |
| Estadísticas | `estadisticas.js`, `GoleadoresTab.jsx`, resultados por equipo | Goleadores y estadísticas por torneo. Fuera del guion para mantener una sola historia |
| Exportación | `StandingsExportModal.jsx`, `StandingsExportLayout.jsx`, `standingsExportStyles.js`, `imageExporter.js` | Tabla en PNG, Post/Historia, combinaciones y personalización. **Representado: apertura y vista previa de Post Clásica + Liso** |
| Consulta pública | `TorneosStandingsTab.jsx`, `PublicStandings.jsx`, loader público | Activar/desactivar enlace de consulta y copiarlo. No se representa publicación en redes ni actualización continua |
| Cédulas | `CedulaPhotoFlow.jsx`, `CedulaScanFlow.jsx`, hooks/servicios de cédulas | Adjuntar foto y escaneo con revisión. Excluido: no se ejecutó un proveedor remoto ni se fabricó una interpretación OCR |
| Rol de juego | `RolJuegoScanFlow.jsx`, utilidades OCR y programación | Importación asistida de horarios. Excluido del recorrido |
| Liguilla y reposiciones | `playoffUtils.js`, `PlayoffAdvanceModal.jsx`, planificador de reposiciones | Implementados en código; no se representan para no mezclar fases de competición |
| “Partidos” del menú | `PartidosTemplate.jsx` | Estado “Próximamente”. No se muestra como una herramienta operativa; los partidos de la demo están en Jornadas |

## Roles y navegación

`src/lib/auth/routeAccess.js` define los roles `admin`, `manager` y `delegate`. Torneos y Liga requieren manager/admin; Equipos también permite delegado con su alcance. Administrar managers está reservado a admin. El público accede a una competición publicada mediante `/share/standings/:id`, no al panel de edición.

La demo sigue a un manager en `/division/94/torneos/123/jornadas/456/list`, su vista `grid` y la pestaña `standings`. No inventa un panel para jugadores, mensajería, pagos, reservas, streaming ni notificaciones push. Tampoco promociona permisos administrativos como si pertenecieran al delegado.

## Identidad visual

| Recurso | Original |
|---|---|
| Escudo oficial | `public/logo_app.png`, también referenciado por `v.logo` y Sidebar |
| Escudos de equipos ficticios | `src/components/organismos/equipos/DynamicTeamLogo.jsx`: forma, iniciales, colores y patrones deterministas |
| Tipografía | Poppins declarada en `GlobalStyles.jsx`; WOFF2 400/600/700 de `public/fonts/poppins/` |
| Paleta clara | `themes.jsx`: `#1cb0f6`, `#84d8ff`, `#EDF3FB`, blanco y texto `#3C3C3C` |
| Paleta oscura | `#131F24`, `#10191d`, texto blanco; existe, pero no se mezcla con el tema claro elegido |
| Navegación | Sidebar colapsado de 88 px; pestañas Torneo / Jornadas / Clasificacion / Goleadores |
| Componentes | Radios, badges, campos, filas y modales reconstruidos desde sus estilos; iconos SVG estáticos de react-icons, sin peticiones a una API de iconos |

Se conserva una **interfaz web de escritorio** porque Bracket sí la implementa. No se convirtió una app móvil nativa en escritorio. En teléfono se escala el escenario entero: ningún breakpoint interno mueve los objetivos del puntero.

## Por qué este guion

El atractivo comercial verificable es conectar el trabajo del organizador: encontrar el partido, capturar lo sucedido con sus jugadores, revisar el resultado y convertirlo en una clasificación presentable. Cada estado se explica sin métricas comerciales, testimonios ni promesas de ahorro inventadas.

Se eligió `StepWindow` por tratarse de un flujo corto de una competición, con capítulos que deben poder revisarse por separado. La variante `film.md` resulta útil para múltiples flujos con cámara y canvases; aquí agregaría movimiento sin ayudar a leer la interfaz. No se usa cámara cinematográfica ni se cambia de producto entre escenas.

## Prueba del dato

Jornada 1: Halcones 2–0 Tigres y Leones 1–0 Lobos. Jornada 2: Tigres 1–1 Lobos y Halcones 1–0 Leones. Victoria: 3 puntos, empate: 1, derrota: 0. La función real devuelve:

| Equipo | PJ | G | E | P | GF | GC | DIF | PTS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Halcones | 2 | 2 | 0 | 0 | 3 | 0 | +3 | 6 |
| Leones | 2 | 1 | 0 | 1 | 1 | 1 | 0 | 3 |
| Lobos | 2 | 0 | 1 | 1 | 1 | 2 | −1 | 1 |
| Tigres | 2 | 0 | 1 | 1 | 1 | 3 | −2 | 1 |

Los datos son demostrativos. La implementación y la ruta de UI se comprobaron; esto no certifica el despliegue de una base de datos remota. Las capturas de referencia registran la app con respuestas de red interceptadas, no una liga real.

Las rutas completas y hashes de los originales se conservan en `evidence/source-manifest.json`.
