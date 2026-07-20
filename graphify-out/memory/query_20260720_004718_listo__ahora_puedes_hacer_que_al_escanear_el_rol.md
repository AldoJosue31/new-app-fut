---
type: "query"
date: "2026-07-20T00:47:18.765575+00:00"
question: "Listo, ahora puedes hacer que al escanear el rol, si detecta la fecha y hora de los cruces. los ponga tambien y sea opcional que se guarde la fecha y hora detectada y si se acepta y se confirman los cruces y fechas y horas, se regresa al FixturePreviewModal.jsx con los partidos de la jornada bloqueados pero si se desbloquean, primero que se advierta con un modal que si se desbloquea un partido se borraran las fechas y horas guardadas para los partidos y si no se desbloquea ningun partido y se confirma el fixure de las jornadas, se aplica las fechas y horas de los partidos del PlanningSidebar.jsx al ScheduledMatchRow.jsx"
contributor: "graphify"
outcome: "useful"
source_nodes: ["FixturePreviewModal", "TorneoJornadasTab", "PlanningSidebar", "ScheduledMatchRow", "matches.date"]
---

# Q: Listo, ahora puedes hacer que al escanear el rol, si detecta la fecha y hora de los cruces. los ponga tambien y sea opcional que se guarde la fecha y hora detectada y si se acepta y se confirman los cruces y fechas y horas, se regresa al FixturePreviewModal.jsx con los partidos de la jornada bloqueados pero si se desbloquean, primero que se advierta con un modal que si se desbloquea un partido se borraran las fechas y horas guardadas para los partidos y si no se desbloquea ningun partido y se confirma el fixure de las jornadas, se aplica las fechas y horas de los partidos del PlanningSidebar.jsx al ScheduledMatchRow.jsx

## Answer

Expanded from original query via vocab: [fixture, planning, scheduled, date, time, matches, modal, jornada, lock, unlock, confirm, sidebar]. The graph correctly located FixturePreviewModal, TorneoJornadasTab, PlanningSidebar, ScheduledMatchRow and matches.date. Code verification showed there is no direct transfer between the planning components: persisting the accepted scanned timestamp in matches.date makes usePlanificacionMatches classify it as scheduled automatically. The scan review, guarded unlock, persistence and Edge Function were implemented and verified end to end.

## Outcome

- Signal: useful

## Source Nodes

- FixturePreviewModal
- TorneoJornadasTab
- PlanningSidebar
- ScheduledMatchRow
- matches.date