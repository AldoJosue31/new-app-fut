# Bracket App — Funciones y flujo de presentación (reel 9:16)

Inventario sacado del código (`app/`, `src/`). Cada función indica dónde vive y si ya hay captura.
Prioridad: **★ = la mencionaste tú** (núcleo del reel) · **+ = extra llamativo** (opcional).
Capturas existentes: `marketing/bracket-html-demo/evidence/references/` (escritorio, 1200×750, datos demo Halcones / Leones / Lobos / Tigres).

---

## Flujo propuesto (orden de presentación)

El orden sigue la vida real de una temporada: **configuras → registras → juegas → se calcula solo → lo compartes → los delegados lo consultan**. Cada paso entrega el dato que usa el siguiente.

| # | Bloque | Funciones | Captura |
|---|--------|-----------|---------|
| 1 | Tu liga, tus reglas | 1.1, 1.2 | falta |
| 2 | Equipos y jugadores | 2.1, 2.2, 2.3 | parcial (`04-roster-vacio`) |
| 3 | Torneo y calendario | 3.1, 3.2 | parcial (`01-jornada`, `02-grilla`) |
| 4 | Resultados del partido | 4.1, 4.2 | sí (`03-general`, `05-gol`, `06-confirmar`, `06b-guardado`) |
| 5 | Tabla y goleadores en tiempo real | 5.1, 5.2 | tabla sí (`07-clasificacion`), goleadores falta |
| 6 | Liga → liguilla | 6.1, 6.2 | falta |
| 7 | Exportar en imagen | 7.1, 7.2, 7.3 | tabla sí (`08-exportar`), resto falta |
| 8 | Enlace público | 8.1 | falta |
| 9 | Cuentas de delegado | 9.1, 9.2, 9.3 | falta |

Bloques núcleo (★): 1, 2, 3, 5, 6, 7, 8, 9. El bloque 4 es el puente que hace "moverse" la tabla.

---

## 1. Tu liga, tus reglas ★

**1.1 Reglas de la liga** — `tabs/liga/LigaRulesTab.jsx` (Liga → Reglas)
- Puntos por victoria, empate y derrota.
- Desempate de partido: "Tradicional (Empate directo)" o "Penales/Shootouts (Punto Extra)".
- Mínimo y máximo de jugadores, límite de equipos.
- Hora de inicio / hora límite, duración de jornada, minutos por tiempo y descanso.
- Cambios ilimitados o limitados; observaciones libres.

**1.2 Reglas por torneo** — `tabs/torneos/subcomponents/TorneoFormTabs.jsx`
- "Sistema de Puntuación Personalizado", "Solo Ida (1 vuelta)" o "Ida y Vuelta (2 vueltas)".
- "Fase Final (Playoffs)": clasificados directos, equipos de repechaje, desde dieciseisavos hasta final.
- "Habilitar Ascensos y Descensos" entre divisiones.
- Criterio de desempate en tabla (visible bajo la clasificación: puntos → DIF → GF → menos PJ).

+ **Colores de la liga** — `LeagueColorSettings.jsx`: color principal y secundario, "Detectando color del logo…" (los toma del escudo de la liga).
+ **Divisiones** — dashboard "Mis Divisiones", "Nueva División"; "Transferir de División" para equipos.
+ **Cuerpo arbitral** — `LigaRefereesTab.jsx`: registro de árbitros y asignación a partidos.

## 2. Equipos y jugadores ★

**2.1 Tarjeta de equipo** — `equipos/TeamCard.jsx`: escudo, color, delegado, estado, número de jugadores.
**2.2 Plantilla** — `formularios/PlayerManager.jsx`: jugadores con dorsal.
**2.3 Estadísticas del equipo** — `TeamDetailModal` → "Rendimiento Individual" ordenable por goles, partidos, amarillas y rojas; pestaña de resultados.

+ **Foto sin fondo automática** — `moleculas/PhotoUploader.jsx` + `utils/bgRemoval` (recorta fondo de fotos de jugadores y logos).
+ **Escudo automático** — `DynamicTeamLogo.jsx` (escudo con iniciales y color cuando no hay logo; se ve en la tabla: HA, LE, LO, TI).

## 3. Torneo y calendario ★

**3.1 Fixture automático** — `FixturePreviewModal.jsx`: "Editor de Fixture", "Regenerar las jornadas no confirmadas con Round Robin", "Auto-Corregir", detección de conflictos, "Modifica partidos futuros. El pasado es inmutable."
**3.2 Planificación semanal** — `planificacion/WeeklyGridView.jsx`: calendario semanal con arrastrar y soltar partidos por día y hora, partidos de otras divisiones visibles.

+ **Escanear rol de juego** — `RolJuegoScanFlow.jsx`: foto del rol en papel → "Interpretando cruces" → jornada completa con fechas y horas.

## 4. Resultados del partido (puente)

**4.1 Registro de resultado** — `ResultModal.jsx`: marcador, goles por jugador, plantilla, penales, walkover, árbitro; overlay de confirmación.
+ **4.2 Escanear cédula** — `CedulaScanFlow.jsx`: foto de la cédula → "Leyendo cédula" → equipos y goles detectados → "Aplicar escaneo". Muy visual para reel.

## 5. Tabla y goleadores en tiempo real ★

**5.1 Clasificación** — `TorneosStandingsTab.jsx` / `StandingsTable.jsx`: PJ, DIF, PND, PTS, G, E, P, GF, GC; selector "Vista Actual (J. n)" para ver la tabla en cualquier jornada; tocar un equipo abre sus resultados.
**5.2 Goleadores** — `GoleadoresTab.jsx`.

## 6. Liga → liguilla ★

**6.1 Armado de cruces** — `PlayoffAdvanceModal.jsx`: "Vista previa" del BRACKET, "Primeros vs ultimos" o "Mejor posicion", "Resiembra" / "Mantener llave", arrastrar para intercambiar equipos, "Confirmar cruces".
**6.2 Cuadro final** — `PlayoffBracketView.jsx`: llaves con Ida, Vuelta y Global; empate global por goles en tabla o penales.

## 7. Exportar en imagen ★

**7.1 Tabla general** — `exports/standings/`: carrusel de **6 combinaciones** de diseño (p. ej. "Clásica + Liso"), "Personalizar", "Colores de la liga", elegir jornada a exportar.
**7.2 Goleadores** — `exports/goleadores/`: formatos "Historia", "Personalizado", cambio de tema.
**7.3 Rol de juego (calendario)** — `exports/schedule/`: "Historia (9:16)", "Post (4:5)", horizontales, grid.

+ **Resumen del torneo en PDF A4** — `exports/summary/`.
+ **Cédulas para imprimir** (pre y post partido) — `exports/match-sheets/`.

## 8. Enlace público ★

**8.1 Página pública** — `app/(public)/share/standings/[torneoId]` → `views/PublicStandings.jsx`
- Se activa con el interruptor Público / Privado en Clasificación; el enlace se copia desde ahí.
- Tres pestañas sin cuenta: **Tabla**, **Cuadro** (liguilla) y **Goleadores**.
- Si el admin lo apaga: "Enlace Privado". Pie: "Powered by Bracket App".

## 9. Cuentas de delegado ★

**9.1 Invitación** — `DelegateInviteModal.jsx`: "Acceso para delegado", "Comparte un link o QR para que el responsable del equipo cree su cuenta."
**9.2 Panel del equipo** — `DelegateTeamOverview.jsx` / `DelegateStandingsView.jsx`: plantilla, contacto, torneo actual, Puntos / Partidos / Diferencia, "Tabla de posiciones" con "Tu equipo" resaltado.
**9.3 Análisis del rival** — `DelegateForecastView.jsx`: "Análisis y probabilidades", "Tu próximo rival y el camino de tu equipo en el torneo", probabilidades del partido en tiempo reglamentario (ganar / empatar / perder), "Goles estimados", "El rival, en contexto", "Dificultad", frases como "Tu equipo parte con ventaja".

+ **Solicitudes de cambios** — `LigaDelegateRequestsTab.jsx`: el delegado propone altas o cambios de jugadores y el manager aprueba o rechaza.

---

## Capturas (listas)

Los 9 bloques están capturados de la app real, en tema oscuro, escritorio y móvil, con datos ficticios:
ver [capturas/INDICE.md](capturas/INDICE.md). Cada estado es HTML animable + PNG + coordenadas; el
capturador está en [capture/](capture/README.md) y el conversor a escena de HyperFrames en
`capture/to-hyperframes.mjs` (prueba en `hf-prueba/`).

## Capturas que faltaban (resuelto, se conserva como referencia)

1. Liga → Reglas y la configuración de torneo (puntos, penales, fase final).
2. Detalle de equipo con plantilla llena y "Rendimiento Individual".
3. Editor de fixture y/o calendario semanal (hay versión vieja en `02-grilla`).
5. Pestaña Goleadores.
6. Modal de cruces de liguilla y el cuadro final.
7. Carrusel de exportación de goleadores y del rol en "Historia (9:16)".
8. Página pública abierta en celular (Tabla, Cuadro, Goleadores).
9. Invitación de delegado (link/QR), panel del delegado y "Análisis y probabilidades".

Preferible con datos demo, sin nombres de personas reales, y en celular cuando la pantalla se vaya a ver en el reel.

## Datos que no hay y no se deben inventar

Cifras de usuarios, ligas o partidos; testimonios; ahorros de tiempo. El reel solo muestra lo que la app hace.
