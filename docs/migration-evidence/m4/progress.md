# M4 progress

Captured: 2026-07-26

Status: SSR Auth is complete locally. In addition to the fixture-independent
gates, real manager, admin and delegate sessions passed login, hard reload,
server role redirects, read-only navigation and logout against the local Next
production build. Deployment-specific validation remains open for isolated
Presence/suspension tests and the hosted Preview/Production redirect allowlist.

## Cookie-backed Auth

- `@supabase/ssr` is pinned at `0.10.0`.
- The browser singleton uses `createBrowserClient`, which stores and refreshes
  the PKCE session through shared cookies.
- The request-scoped server factory uses `createServerClient` and Next
  `cookies()`. No user client is cached in module scope.
- `proxy.js` calls `auth.getClaims()` and mirrors refreshed cookies to the
  request and response.
- Responses for authenticated UI requests are marked
  `private, no-cache, no-store`.
- The service-role client remains separate and `server-only`.

The existing Bearer contract for the seven APIs is intentionally unchanged
until M5. Browser API consumers can still read the access token from the new
cookie-backed Supabase session.

## Server identity and role gate

The temporary catch-all page now verifies the user with `auth.getUser`, reads
the user's profile through the request-scoped client and applies the frozen
React Router role matrix before loading the client island:

| Route family | Anonymous | Delegate | Manager | Admin |
|---|---|---|---|---|
| Landing, login, standings, invitations | allowed | allowed/redirected from login | allowed/redirected from login | allowed/redirected from login |
| Teams | login redirect | allowed | allowed | allowed |
| Dashboard, matches, tournaments, league | login redirect | teams redirect | allowed | allowed |
| Configuration | login redirect | allowed | allowed | allowed |
| Admin managers | login redirect | role-home redirect | role-home redirect | allowed |

Unknown routes redirect at the server. A transient profile query renders only
the loading boundary, never private UI. Manager/delegate suspension blocks the
snapshot; the existing rule that the admin role ignores `is_suspended` remains
unchanged.

Reusable server-only `requireUser` and `requireRole` helpers now expose
401/403/503 distinctions. Route-group layouts will replace the catch-all guard
when the UI routes move in M6/M7.

## Client provider and compatibility

- Zustand is the single source for `user`, `profile`, loading state and Auth
  actions. `AuthContext` now provides that state plus Realtime/Presence and
  security notices instead of maintaining a duplicate user/profile copy.
- The verified server snapshot hydrates the store before the Auth provider
  mounts.
- Existing local-storage sessions are migrated once to the SSR cookie using
  `setSession`, then the old entry is removed.
- Realtime, Presence, live suspension and delegate security notifications
  remain client-side.
- Missing/unauthorized profiles fail closed and clear the cookie session.

## PKCE and redirects

- Google sign-in and Google identity linking redirect to
  `/auth/callback?next=...`.
- The callback exchanges the Auth code server-side and writes cookies on a
  `303` redirect.
- Provider and exchange errors return to `/login` as query params; the former
  hash parser was removed.
- Every return path is passed through the shared internal-path sanitizer.
- Local Supabase redirect URLs now cover ports 3000, 4173 and the Vite rollback
  port 5173; local manual identity linking is enabled.

## Local gates

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 87 passed |
| Next/Auth server tests | 15 passed |
| Legacy API contracts | 11 passed |
| Edge account contracts | 5 passed |
| All Edge Function tests | 53 passed |
| Next production build | passed; Proxy and `/auth/callback` recognized |
| Vite rollback build | passed |
| SSR/public E2E | 21 passed across Chromium, mobile Chromium and WebKit |
| Real role smoke | manager, admin and delegate passed |
| Client secret scan | 86 JS/MJS files; service-role name/value absent |
| Lockfile dry run | passed |
| Git whitespace check | passed |

The new tests cover cookie refresh propagation, anti-cache headers, PKCE code
exchange, malicious return URLs, anonymous redirects, all three roles,
suspension rules, profile outages, legacy-session migration and hard reloads.

## Remaining deployment validation

- Create isolated delegate, manager and admin fixtures and run concurrent
  Presence plus live-suspension E2E. Login, logout, reload and role routing were
  validated with the supplied existing accounts, but suspension was not
  changed in production.
- Add the actual Preview and Production `/auth/callback` URLs to the hosted
  Supabase allowlist once those URLs are known. Only local `config.toml` was
  changed.
- Replace the catch-all policy guard with protected Next route-group layouts
  as routes move in M6/M7.

No Docker Desktop was used. Full details of the real-session checks and the
regressions they found are in `production-role-smoke.md`.
