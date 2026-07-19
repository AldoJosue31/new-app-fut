---
type: "query"
date: "2026-07-19T08:57:21.962782+00:00"
question: "Pero cuando hago un escaneo dd una jornada y luego quiero corregir las demas jornadas porque quedaron mal, dice que no es posible por los partidos bloqueados cuando es posible, mejora el algoritmo para que sepa como resolverlo sin conflictos"
contributor: "graphify"
outcome: "dead_end"
source_nodes: ["GlobalStyles", "globals"]
---

# Q: Pero cuando hago un escaneo dd una jornada y luego quiero corregir las demas jornadas porque quedaron mal, dice que no es posible por los partidos bloqueados cuando es posible, mejora el algoritmo para que sepa como resolverlo sin conflictos

## Answer

Expanded from original query via graph vocab: [auto, fixture, conflicts, validation, matches, round, schedule, global, lock, teams, swap]. This traversal was a dead end because global matched GlobalStyles instead of the fixture flow. Direct inspection and a deterministic reproduction showed the local two-step search could leave 2 conflicts from an initially solvable 9-conflict schedule. The correction adds a complete single-leg round-robin reconstruction anchored on scanned and confirmed rounds, maps generated matchings onto actual rounds, preserves hard locks, and falls back to local search only when the global reconstruction does not apply.

## Outcome

- Signal: dead_end

## Source Nodes

- GlobalStyles
- globals