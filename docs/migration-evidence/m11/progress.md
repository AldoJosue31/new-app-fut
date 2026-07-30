# M11 progress

Captured: 2026-07-27

Status: the local framework cut is complete and verified. Next.js App Router is
the only active development, build and routing runtime. Hosted Preview,
isolated functional smoke, external telemetry, alias/canary, rehearsed rollback
and production observation remain pending.

## Framework cut

The following rollback-only entry points and adapters were removed after
confirming that no native Next route imported them:

- `app/[...legacyPath]/page.jsx`
- `app/legacyHost.jsx`
- `src/legacy/LegacyApplication.jsx`
- `src/App.jsx`
- `src/main.jsx`
- `src/router.jsx`
- `src/routes/routes.jsx`
- `src/hooks/ProtectedRoute.jsx`
- `src/views/RegisterManager.jsx`
- `src/views/RegisterDelegate.jsx`
- `index.html`
- `vite.config.js`
- `public/vite.svg`

The now-empty `src/routes` directory was also removed. Public manager and
delegate invitation pages already imported their Next templates directly, so
the deleted React Router views had no active consumers.

`package.json` and `package-lock.json` no longer contain:

- `react-router-dom`
- `vite`
- `@vitejs/plugin-react`
- `eslint-plugin-react-refresh`
- the `dev:legacy`, `build:legacy` or `preview:legacy` scripts

The Vite-only React Refresh ESLint preset was removed. The lockfile was
regenerated offline with `npm install --package-lock-only --ignore-scripts
--offline`; npm audited 262 packages and reported zero vulnerabilities.

## Unknown-route behavior

The custom not-found component moved from the unused `(public)` route group to
`app/not-found.jsx`. A new E2E case verifies direct navigation and reload of an
unknown URL:

- both responses return HTTP 404;
- the application heading and home link render;
- the root layout and modal root remain present;
- there are no `pageerror` events or unexpected 5xx responses.

This replaces the old catch-all behavior with an explicit, observable App
Router contract.

## Next component refactor

The five active Next modules that still lived under `src/legacy` were moved and
renamed according to their actual responsibilities:

| Previous module | Final module |
|---|---|
| `LegacyProviders.jsx` | `src/components/app/PrivatePageProviders.jsx` |
| `NativePageProviders.jsx` | `src/components/app/PublicPageProviders.jsx` |
| `PrivatePageShell.jsx` | `src/components/app/PrivatePageShell.jsx` |
| `NativeTeamsPage.jsx` | `src/components/app/TeamsPageClient.jsx` |
| `NativeTournamentsPage.jsx` | `src/components/app/TournamentsPageClient.jsx` |

All App Router pages and server content loaders now import the final modules.
The adapters use `next/navigation`, accept the server Auth snapshot and contain
no React Router compatibility. The empty `src/legacy` directory was removed.

The two `src/lib/supabase/legacySession*` modules remain intentionally because
they perform a one-time migration from the former local-storage session to SSR
cookies. They contain no React Router or Vite imports and prevent existing
users from being logged out during rollout.

## Server trace reduction

The M10 P2 was resolved by placing the two browser-only entry points behind
Next dynamic client boundaries with `ssr: false`:

- `RolJuegoScanFlow` is loaded only when the role scanner is opened.
- `TournamentSummaryModal` is loaded only when its export modal is opened.

This removed PaddleOCR/ONNX, its 10.35 MB worker and jsPDF from the tournament
server trace without moving or proxying the scanners.

| Route trace | Before | Final | Change |
|---|---:|---:|---:|
| Landing | 2.36 MB / 116 files | 2.36 MB / 116 files | stable |
| Teams | 3.69 MB / 131 files | 3.69 MB / 131 files | stable |
| Tournaments | 24.50 MB / 137 files | 3.20 MB / 129 files | -86.9% |

The final tournament trace contains no PaddleOCR, ONNX, jsPDF or files larger
than 700 KB. The browser build still emits three Paddle/ONNX chunks and two
jsPDF chunks; all five returned HTTP 200 from the final production server. The
functionality therefore remains available but deferred to the user action.

## Residue audit

Active source, tests, package manifests, lockfile and configuration were
searched for React Router DOM, BrowserRouter, Vite commands/plugins, React
Refresh, SPA rewrites and `import.meta.env`.

Result: zero active matches. All rollback targets are absent, the custom
not-found file exists at the root and `git diff --check` passes. The reported
Git messages are line-ending normalization warnings only.

## Verification

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 102 passed |
| Edge Function tests | 53 passed |
| Next/Auth/API tests | 21 passed |
| Next production build | passed with Next 16.2.12; build ID `XhueUPeFchWopgozUhe4n` |
| Browser E2E | 63 passed in Chromium, WebKit and mobile Chromium |
| Unknown route | HTTP 404 on direct navigation and reload in all three projects |
| Deferred engines | 3 Paddle/ONNX and 2 jsPDF browser chunks emitted; all returned HTTP 200 |
| Framework residue scan | zero active React Router/Vite/SPA matches |
| Diff validation | `git diff --check` passed |

The production build exposes the native App Router page/API table and
`/_not-found`; it no longer exposes a compatibility catch-all. The known
webpack cache snapshot warnings remain non-fatal and unchanged from M10.

The verified local Next server was stopped after E2E. No Docker Desktop was
used. No production league, division, team, tournament, round, match or account
record was created, edited or deleted. No credentials were written to the
repository.

## Remaining M11 work

- Connect the local Web Vitals and client-error events to the selected external
  telemetry service.
- Confirm the real Vercel project, production branch/domain, variables and
  deployment runtime.
- Deploy an isolated Preview and run contracts, E2E and role-based functional
  smoke against it.
- Rehearse rollback on a non-production alias, then perform canary/production
  rollout and the required observation window.
