---
type: "query"
date: "2026-07-19T09:26:04.374857+00:00"
question: "Sigue igual, si lo hubiera hecho manual no habria error"
contributor: "graphify"
outcome: "corrected"
correction: "Actualizar el grafo: autoCorregirFixture ahora usa repairCompleteScheduleByMultiStepSearch con conteo incremental de cruces y reinicios deterministas; la regresion real de torneo 332 queda en 0 sin tocar J1, J2 ni J3."
source_nodes: ["autoCorregirFixture()", "validarFixture()"]
---

# Q: Sigue igual, si lo hubiera hecho manual no habria error

## Answer

Expanded from original query via vocab: [auto, fixture, conflicts, validation, matches, round, lock, teams, validar]. La consulta identifico autoCorregirFixture() y validarFixture(), pero el grafo estaba desactualizado: el fallo real era que la reconstruccion global solo buscaba calendarios circulares y el fallback se limitaba a dos pasos. Se corrigio con una busqueda determinista multi-paso de 2-switches que conserva jornadas confirmadas, escaneadas y locks; el torneo 332 pasa de 8 conflictos a 0.

## Outcome

- Signal: corrected
- Correction: Actualizar el grafo: autoCorregirFixture ahora usa repairCompleteScheduleByMultiStepSearch con conteo incremental de cruces y reinicios deterministas; la regresion real de torneo 332 queda en 0 sin tocar J1, J2 ni J3.

## Source Nodes

- autoCorregirFixture()
- validarFixture()