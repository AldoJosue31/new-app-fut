# M3 Supabase boundaries

Captured: 2026-07-25

## Classification

The audited 41 Supabase units are split as follows:

| Class | Units | Boundary |
|---|---:|---|
| Browser singleton | 1 | `src/lib/supabase/browserClient.js`, marked `client-only` |
| Browser data/auth consumers | 36 | Context, hooks, stores, services, views and UI components |
| Browser Realtime consumers | 3 | `AuthContent`, `AdminManagers` and `EquiposTemplate` |
| Privileged server client | 1 | `src/server/api/supabaseAdmin.js`, marked `server-only` |

The 39 browser consumers import only the browser singleton. Realtime remains a
browser concern during the compatibility phase. The privileged client is
reachable only through `src/server/api/dependencies.js` and the Next Route
Handlers.

## Security properties

- The browser singleton accepts only
  `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is read only by the server-only API module.
- User-scoped server clients still validate the incoming Bearer token with
  `auth.getUser` before role checks.
- No browser module imports the server API dependency tree.
- The former universal config and the `src/index.js` side-effect barrel were
  removed.

Cookie-backed `@supabase/ssr` clients and the Auth callback belong to M4. Until
that cutover, the existing public singleton and frozen Bearer API contract
remain the rollback-compatible implementation.

## Reproducible inventory

```powershell
rg -l 'lib/supabase/browserClient' src
rg -n 'channel\(|onAuthStateChange|postgres_changes' src
rg -n 'SUPABASE_SERVICE_ROLE_KEY' src app
```
