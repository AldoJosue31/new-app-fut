# M1 API contract baseline

Captured: 2026-07-25

These contracts describe the current Vite/Vercel implementation before it is
moved to Next.js Route Handlers. The default exports remain unchanged. Handler
factories were added only to replace Supabase and authorization dependencies in
tests; no contract test sends requests to the linked project.

All Vercel handlers return JSON. Unsupported methods return:

```json
{ "error": "Method not allowed" }
```

with status `405`.

| Path | Method | Authorization | Required input | Success |
|---|---|---|---|---|
| `/api/admin/managers/create` | `POST` | Bearer user with `profiles.role = admin` | `email`, `password`, `fullName`, `leagueName` | `200`, `{ success, userId }` |
| `/api/admin/managers/delete` | `DELETE` | Bearer admin | `email` | `200`, `{ success: true }` |
| `/api/admin/managers/limits` | `PATCH` | Bearer admin | positive `leagueId`; limits are nullable non-negative integers | `200`, `{ success, league }` |
| `/api/admin/managers/suspension` | `PATCH` | Bearer admin | `userId`, boolean-like `suspended`, optional `reason` | `200`, `{ success, profile }` |
| `/api/admin/managers/update` | `PATCH` | Bearer admin | `userId` and at least one of `email` or `password` | `200`, `{ success: true }` |
| `/api/delegates/unlink` | `POST` | Bearer manager or admin | positive `teamId`, optional `deleteAccount` | `200`, unlink/account outcome |
| `/api/divisions/:divisionId/workspace` | `GET` | Valid Bearer user; division must belong to that user | positive route `divisionId` | `200`, aggregated workspace |

## Persisted effects

- Manager creation creates a confirmed Auth user, calls
  `activar_nuevo_manager`, and deletes the new Auth user if activation fails.
- Manager deletion currently calls `borrar_usuario_por_email` with a
  service-role client. The remote function checks `auth.uid()` and is not
  versioned in migration history, so this path is recorded as a likely defect;
  it was not invoked against shared data.
- Limits update the three quota columns in `leagues`.
- Suspension updates `profiles` and then applies/removes the Auth ban.
- Credential updates call the server-only Auth Admin API.
- Delegate unlink calls `unlink_team_delegate` with the caller-scoped client.
  An account with remaining assignments is never deleted. With no assignments,
  the profile is suspended before Auth deletion; a deletion error returns a
  successful unlink plus a warning.
- Division workspace restricts the division through `leagues.owner_id`, then
  aggregates the active tournament, teams, standings and matches. The response
  aliases nested `leagues`/`categories`/`divisions` to
  `league`/`category`/`division`.

## Edge contract

`manage-delegate-account` remains at
`/functions/v1/manage-delegate-account` during the early migration.

- `OPTIONS` returns `200` and advertises `POST, OPTIONS`.
- Unsupported methods return `405` with
  `{ "error": "Metodo no permitido." }`.
- `POST` requires the three Supabase server environment values, a Bearer
  session and a positive `teamId`.
- `action = get` returns `{ success, email }`.
- `action = update` validates name, email, password, reason and explicit
  confirmation for credential changes before mutating Auth, team/profile
  records, audit log and security notification.

The function now exports an importable handler and calls `Deno.serve` only when
executed as the entry module. This makes its HTTP contract testable without
Docker while preserving the deployed entrypoint.

## Executed tests

- `tests/apiContracts.test.js`: 11 contract cases for all seven Vercel
  endpoints.
- `supabase/functions/manage-delegate-account/contract_test.ts`: 5 Edge HTTP
  contract cases.
- Full Node suite: 74 passed.
- Full Deno suite: 53 passed.

The official Supabase Auth Admin API requires the service-role key to stay on
the server. The migration keeps that boundary and will move it into Next.js
server-only modules:
<https://supabase.com/docs/reference/javascript/auth-admin-deleteuser>.
