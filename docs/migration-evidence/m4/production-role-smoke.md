# M4 production role smoke

Captured: 2026-07-26

## Scope and safety

Three existing role accounts supplied by the project owner were used only to
exercise authentication, server redirects, read-only navigation and logout
against the local Next production build connected to the current hosted
Supabase project.

- Credentials were entered interactively and were not written to the
  repository, test files, environment files or this evidence.
- No create, update, delete, unlink, suspension or tournament workflow was
  executed.
- Normal Auth, Presence and `last_seen_at` side effects already performed by
  the application may have occurred during login/logout.
- Every test session was closed when its checks finished.

## Results

| Role | Login destination | Reload | Allowed route | Denied route | Logout |
|---|---|---|---|---|---|
| Manager | `/dashboard` | session and role preserved | `/torneos` resolved to the selected division and loaded workspace data | `/admin/managers` redirected to `/dashboard` before private admin UI | passed |
| Admin | `/dashboard` | session and role preserved | `/admin/managers` loaded the read-only manager list | not applicable; the frozen matrix permits admin on manager routes | passed |
| Delegate | `/equipos` | session and role preserved | `/equipos` loaded the assigned team | `/torneos` redirected to `/equipos` before tournament UI | passed |

The checks exercised full document requests after login, so the catch-all
Server Component, cookie-backed session, verified profile lookup and role
matrix all participated in the result.

## Regressions found and fixed

1. The authenticated manager dashboard crashed because `PageHeader` rendered
   an undefined menu icon reference. It now imports and renders `MdMenu`
   directly.
2. The division workspace Route Handler could not resolve the hosted Supabase
   URL/key when the existing environment exposed only the rollback-era
   `VITE_APP_SUPABASE_*` names. The server-only config now accepts those names
   during the compatibility window. The service-role key remains server-only.
3. At the default 568 px viewport the sidebar trigger had zero size, making
   logout unreachable. The trigger is now visible on mobile and was verified
   at 32 by 32 px before logging out again.

## Final gates

| Gate | Result |
|---|---|
| Strict lint | passed, 0 errors and 0 warnings |
| Node tests | 87 passed |
| Next/Auth server tests | 15 passed |
| Edge Function tests | 53 passed |
| Next production build | passed |
| Vite rollback build | passed |
| Public/anonymous E2E | 21 passed across Chromium, mobile Chromium and WebKit |
| Client secret scan | 86 JS/MJS files; 0 service-role name/value hits |
| Git whitespace check | passed |

## Deliberately deferred

- Live suspension was not tested because it would mutate a production account.
- Concurrent multi-session Presence was not asserted from an admin session.
- Google OAuth still needs the actual Preview and Production callback URLs in
  the hosted Supabase allowlist.
- Route-group layouts will replace the temporary catch-all guard during
  M6/M7.

These checks should be completed with isolated staging users. They do not
invalidate the local SSR Auth implementation or the real role-routing smoke
above.
