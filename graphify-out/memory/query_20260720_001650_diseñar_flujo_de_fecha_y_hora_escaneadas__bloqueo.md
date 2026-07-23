---
type: "query"
date: "2026-07-20T00:16:50.060705+00:00"
question: "Diseñar flujo de fecha y hora escaneadas, bloqueo y advertencia de desbloqueo en FixturePreviewModal"
contributor: "graphify"
outcome: "useful"
source_nodes: ["FixturePreviewModal.jsx", "useFixturePreview.js", "ScheduledMatchRow.jsx", "ConfirmModal.jsx"]
---

# Q: Diseñar flujo de fecha y hora escaneadas, bloqueo y advertencia de desbloqueo en FixturePreviewModal

## Answer

Expanded from original query via vocab: [fixture, preview, match, scan, lock, unlock, date, time, planning, scheduled, confirm, modal]. RolJuegoScanFlow descarta metadata al crear pairs; useFixturePreview solo alterna locked; FixtureMatchCard deshabilita scanLocked; los guardados de edición y creación fuerzan date null. Representar por partido date/time + scanScheduleApplied y conservarlas con spreads mientras scanLocked. Desbloquear mediante ConfirmModal y luego limpiar date/time. Persistir matches.date como YYYY-MM-DD HH:mm:00 y status Programado; usePlanificacionMatches ya mueve automáticamente los partidos con fecha desde PlanningSidebar a ScheduledMatchRow.

## Outcome

- Signal: useful

## Source Nodes

- FixturePreviewModal.jsx
- useFixturePreview.js
- ScheduledMatchRow.jsx
- ConfirmModal.jsx