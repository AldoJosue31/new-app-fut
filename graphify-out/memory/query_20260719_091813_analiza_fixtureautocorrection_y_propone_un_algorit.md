---
type: "query"
date: "2026-07-19T09:18:13.936975+00:00"
question: "Analiza fixtureAutoCorrection y propone un algoritmo robusto para K18 con dos jornadas confirmadas y una escaneada"
contributor: "graphify"
outcome: "useful"
source_nodes: ["autoCorregirFixture()", "validarFixture()", "useFixturePreview.js"]
---

# Q: Analiza fixtureAutoCorrection y propone un algoritmo robusto para K18 con dos jornadas confirmadas y una escaneada

## Answer

Expanded from original query via vocab: [auto, fixture, conflicts, validation, matches, rounds, lock, teams, swap, search, schedule, validar]. El rebuild global solo recorre factorizaciones circulares y el fallback es una busqueda greedy de profundidad efectiva dos. La reparacion fiable es min-conflicts sobre emparejamientos por jornada: 2-switch entre dos partidos editables, costo incremental sum(max(0, usosDelCruce-1)), movimientos dirigidos a cruces duplicados, mesetas, 8 reinicios deterministas y tope 40000. Preserva locked/roundLocked, extra/reposition y BYE. En prueba sintetica K18 no-circular resolvio 20/20 en 85 ms total; el solver actual dejo 2 conflictos.

## Outcome

- Signal: useful

## Source Nodes

- autoCorregirFixture()
- validarFixture()
- useFixturePreview.js