# M2 progress

Captured: 2026-07-25

Status: implementation and local gates complete. GitHub CI and a hosted
Preview have not run because the branch has not been published.

## Next.js host

- Next.js is pinned exactly at `16.2.12`; the resolved React and React DOM
  versions are `19.2.8`.
- Node remains pinned at `24.14.0`, above the current minimums for Next.js and
  the Supabase JavaScript clients.
- `app/layout.jsx` owns the HTML shell, metadata, viewport and global CSS.
- `app/[[...legacyPath]]/page.jsx` is the temporary UI catch-all.
- `app/legacyHost.jsx` loads `src/legacy/LegacyApplication.jsx` as a
  browser-only island, so `src/main.jsx` and `createRoot` are not executed by
  Next.
- `BrowserRouter` remains inside the legacy island. No React Router UI route
  has been migrated yet.
- The former `src/pages` component directory was renamed to `src/views` so
  Next does not mistake it for a second Pages Router.
- `#root` remains in the layout temporarily for existing portal targets.

The scripts now use `next dev --webpack`, `next build --webpack` and
`next start`. Webpack is a measured transition constraint: the current
PaddleOCR/OpenCV browser package imports Node built-ins and a bare ONNX Runtime
asset that Turbopack 16.2.12 cannot resolve. `next.config.mjs` limits the
`fs`/`path` fallbacks to the browser bundle and aliases the ONNX asset to the
installed pinned package. Returning to Turbopack belongs with OCR/browser-only
isolation and bundle optimization.

## API cutover

The seven active endpoints now live only under `app/api`:

- `POST /api/admin/managers/create`
- `DELETE /api/admin/managers/delete`
- `PATCH /api/admin/managers/limits`
- `PATCH /api/admin/managers/suspension`
- `PATCH /api/admin/managers/update`
- `POST /api/delegates/unlink`
- `GET /api/divisions/:divisionId/workspace`

The old root `api/` tree was removed. Business handlers were moved to
`src/server/api/handlers`, while the Supabase clients and role checks are
behind `server-only`. The adapter translates Web `Request`/`Response` objects
to the frozen Bearer contract without changing status or JSON payloads.

The privileged client is lazy, so importing route modules during `next build`
does not require or expose the service-role key. User identity continues to be
verified with `auth.getUser(accessToken)` before role checks.

Two development-only divergences were removed:

- manager limit and suspension changes always call their authenticated API;
- division workspace no longer falls back to direct browser queries when the
  endpoint returns non-JSON.

`vercel.json` and its global rewrite to `/index.html` were removed. The Vite
configuration and explicit `dev:legacy`, `build:legacy` and `preview:legacy`
scripts remain available as the rollback implementation; no existing
deployment was changed.

## Local gates

| Gate | Result |
|---|---|
| Dependency lock | `npm ci --dry-run`: passed |
| Strict lint | 0 errors, 0 warnings |
| Legacy Node tests | 74 passed, 0 failed |
| Deno Edge tests | 53 passed, 0 failed |
| Legacy API contracts | 11 passed, 0 failed |
| Next Route Handler contracts | 3 suites covering 7 routes passed |
| Edge HTTP contracts | 5 passed, 0 failed |
| Next production build | passed; 1 UI route and 7 API routes |
| Vite rollback build | passed with Vite 7.3.6 |
| Next production E2E | 12 passed in Chromium, mobile Chromium and WebKit |
| Git whitespace check | passed |

The public smoke covers direct navigation and hard reload for `/`, `/landing`,
`/login` and `/share/standings/1`. The public tournament RPC is intercepted
with its frozen “not found” response in the last case, so CI does not read from
the linked production project or depend on browser-specific CORS behavior.

## Open items

- Run the workflow and a hosted Preview after the branch is intentionally
  published.
- Run the Firefox job on Linux; the installed Windows Firefox binary still has
  the compositor limitation recorded in M1.
- Complete the isolated Supabase schema reset and role fixtures when a
  compatible container or CI database runner is available. Docker Desktop is
  not needed for the completed M2 code.
- Test and version a replacement for `borrar_usuario_por_email`; its current
  service-role/RPC authorization mismatch remains frozen and was not invoked.
- A detailed npm advisory audit remains pending. The sandboxed registry
  response was invalid, and an unsandboxed audit was not allowed because it
  would disclose dependency metadata to npm. No forced remediation was run.
