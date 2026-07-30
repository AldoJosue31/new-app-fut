# M5 progress

Captured: 2026-07-26

Status: the main local API migration and security hardening are implemented.
M5 remains open for isolated persisted-effect tests, complete multi-system
compensation, endpoint metrics, scanner rate limiting, Preview validation and
traffic-based retirement of compatibility paths.

## Authentication and request boundary

- All eight Route Handlers accept the SSR cookie session and the existing
  Bearer token during the compatibility window.
- Cookie-authenticated unsafe methods require an exact same-origin `Origin`.
  Bearer remains usable by explicit non-browser clients.
- Every private response is dynamic, uses the Node runtime and sends
  `Cache-Control: private, no-store`, legacy no-cache headers, and
  `Vary: Authorization, Cookie, Origin`.
- Every response gets a validated or generated `X-Request-ID`; the same ID is
  available to the handler for structured server logs.
- A contract test makes two simultaneous requests with distinct identities and
  verifies distinct bodies plus the private no-store policy.

## Authorization policy

- The service-role client remains `server-only`; user identity is verified
  from the cookie or Bearer token before privileged access.
- Manager/delegate actors marked suspended or deleted are denied. Admin keeps
  the previously frozen suspension exception.
- Admin update, delete and suspension operations verify that the target role is
  `manager`, so those endpoints cannot target admin accounts.
- Delegate account management allows admin, league owner and `league_admin`;
  another league, a delegate actor, a suspended actor and a deleted actor are
  denied.
- Division workspace intentionally preserves its original owner-only policy:
  the authenticated user must own the league, and a foreign division is hidden
  behind `404`.
- Delegate unlink still calls `unlink_team_delegate` through the user-scoped
  client, preserving its RLS/authorization boundary before service-role
  cleanup.

## Eighth Route Handler

`POST /api/delegates/account` now preserves the former
`manage-delegate-account` actions:

- `get` returns the linked delegate email.
- `update` validates name, email, password, reason and explicit confirmation;
  updates Auth/team/profile as needed; and retains audit-log and notification
  writes.
- `src/services/delegates.js` now calls the Next endpoint. No frontend consumer
  invokes `manage-delegate-account`.
- The Edge Function remains intact as a rollback artifact. It must not be
  removed until Preview passes and traffic confirms zero callers.

No update action was invoked against production during this phase.

## Error handling and partial failure

- Generic 5xx responses no longer expose Supabase/provider messages.
- The unlink partial-success warning no longer returns the raw Auth error.
- Server logs are limited to a controlled message and request ID.
- Manager creation retains its Auth deletion rollback when activation fails.
- Manager suspension now restores the original profile state if the Auth
  ban/unban step fails; a unit test verifies that compensation.

Complete compensation is still open for unlink and delegate account update.
Those flows cross Auth and Postgres, and password changes cannot be reversed
without a purpose-built transactional/idempotent design. They will be tested
with disposable users in an isolated Supabase project, not production.

## Local gates

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 95 passed |
| Next/Auth and Route Handler tests | 21 passed |
| Edge Function tests | 53 passed |
| Next production build | passed; all eight API routes recognized |
| Vite rollback build | passed |
| Anonymous browser regression | all 21 cases reported `ok` across Chromium, mobile Chromium and WebKit; the runner timed out after the final case while exiting |
| Client service-role name scan | 73 client JS/MJS files, 0 hits |
| Git whitespace check | passed |

Browser-role sessions from M4 remain valid evidence because this phase did not
alter UI routing; no destructive authenticated browser action was run.

## Remaining M5 work

1. Create disposable manager/delegate fixtures in an isolated project and
   verify successful persisted effects plus each partial-failure branch.
2. Finish an idempotent compensation design for unlink and account update.
3. Add per-endpoint latency/error metrics and a durable per-user rate limit (or
   verify an equivalent Supabase control) for both scanner Edge Functions.
4. Publish Preview, run scanner smoke tests and validate the eight APIs there.
5. Measure callers before retiring internal Bearer and the rollback Edge
   Function.

No Docker Desktop was used.
