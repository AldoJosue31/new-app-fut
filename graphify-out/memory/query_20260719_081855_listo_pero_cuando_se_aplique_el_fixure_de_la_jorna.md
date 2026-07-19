---
type: "query"
date: "2026-07-19T08:18:55.675964+00:00"
question: "Listo pero cuando se aplique el fixure de la jornada excaneada, no hagas que este bien todo, ya que si esta configurado solo ida, no se pueden enfrentar 2 veces los mismos equipos en diferentes jornadas, solo en jornadas extra, asi que corrije para que no sea excepcion y marque error y no permitas confirmar el fixure"
contributor: "graphify"
outcome: "dead_end"
source_nodes: ["preview", "package.json"]
---

# Q: Listo pero cuando se aplique el fixure de la jornada excaneada, no hagas que este bien todo, ya que si esta configurado solo ida, no se pueden enfrentar 2 veces los mismos equipos en diferentes jornadas, solo en jornadas extra, asi que corrije para que no sea excepcion y marque error y no permitas confirmar el fixure

## Answer

Expanded from original query via graph vocab: [fixture, conflicts, validation, matches, round, extra, lock, preview, validar]. The traversal matched only the package.json preview script and did not locate the fixture validation flow. Direct source inspection found validarFixture only checked duplicate teams inside one round; the implementation was corrected in src/utils/fixtureValidation.js.

## Outcome

- Signal: dead_end

## Source Nodes

- preview
- package.json