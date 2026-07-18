---
type: "query"
date: "2026-07-18T06:12:01.975329+00:00"
question: "Puedes arreglar el error teams_contact_phone_valid al editar un delegado vinculado en TeamForm y hacer que la razon no sea obligatoria al cambiar solo el nombre"
contributor: "graphify"
outcome: "dead_end"
source_nodes: ["Form", "delegates.js"]
---

# Q: Puedes arreglar el error teams_contact_phone_valid al editar un delegado vinculado en TeamForm y hacer que la razon no sea obligatoria al cambiar solo el nombre

## Answer

Expanded from graph vocab via team, teams, delegate, contact, form, invalid, reason, update, valid, validation, name, change. The DFS traversal landed on generic Form nodes and unrelated delegate screens, so it did not identify the failing path. Direct inspection found manage-delegate-account updates teams.delegate_name, which rechecked NOT VALID constraints against 67 legacy blank phones; the fix normalizes blank optional team fields and makes reason conditional on email or password changes.

## Outcome

- Signal: dead_end

## Source Nodes

- Form
- delegates.js