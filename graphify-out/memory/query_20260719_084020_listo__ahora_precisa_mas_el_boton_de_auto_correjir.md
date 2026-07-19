---
type: "query"
date: "2026-07-19T08:40:20.326849+00:00"
question: "Listo, ahora precisa mas el boton de Auto-correjir para que las corrija cuando si sea posible acomodando los partidos para que no se jueguen partidos repetidos en diferentes jornadas, etc"
contributor: "graphify"
outcome: "useful"
source_nodes: ["autoCorregirFixture()", "validarFixture()", "useFixturePreview.js", "FixturePreviewModal.jsx"]
---

# Q: Listo, ahora precisa mas el boton de Auto-correjir para que las corrija cuando si sea posible acomodando los partidos para que no se jueguen partidos repetidos en diferentes jornadas, etc

## Answer

Expanded from original query via graph vocab: [auto, fixture, conflicts, validation, matches, round, swap, lock, teams, validar]. The graph correctly traced FixturePreviewModal through useFixturePreview to autoCorregirFixture, performSwap and validarFixture. Source verification showed that moving whole matches between rounds could not remove a globally duplicated matchup. The autocorrector was replaced with bounded full-fixture search that rebuilds editable round pairings, swaps team slots, swaps whole matches for within-round duplicates, and preserves scanned, locked, confirmed, extra and reposition matches.

## Outcome

- Signal: useful

## Source Nodes

- autoCorregirFixture()
- validarFixture()
- useFixturePreview.js
- FixturePreviewModal.jsx