---
type: "query"
date: "2026-07-20T00:13:45.245556+00:00"
question: "Traza como matches.date y hora se cargan, asignan y persisten, y donde aplicar fechas y horas escaneadas al confirmar fixture"
contributor: "graphify"
outcome: "useful"
source_nodes: ["JornadaPlanificacion.jsx", "FixturePreviewModal.jsx", "ScheduledMatchRow.jsx", "usePlanificacionMatches.js"]
---

# Q: Traza como matches.date y hora se cargan, asignan y persisten, y donde aplicar fechas y horas escaneadas al confirmar fixture

## Answer

Expanded from original query via vocab: [planning, scheduled, match, matches, fixture, date, time, fechas, jornada, confirm, saved, update]. El punto de persistencia correcto es handleConfirmFixtureUpdate en TorneoJornadasTab: debe recibir el date/time aceptado en cada match y guardar matches.date/status. Al recargar, usePlanificacionMatches.formatMatch separa el timestamptz en date/time; currentScheduled incluye los que tienen date y ScheduledMatchRow los muestra, mientras PlanningSidebar solo recibe los que no tienen fecha. Riesgos verificados: transformarPartidosExistentes elimina date/status, handleConfirmFixtureUpdate fuerza date null/status Pendiente y no detecta cambios solo de fecha, y la base tiene un trigger de cancha para el mismo timestamp.

## Outcome

- Signal: useful

## Source Nodes

- JornadaPlanificacion.jsx
- FixturePreviewModal.jsx
- ScheduledMatchRow.jsx
- usePlanificacionMatches.js