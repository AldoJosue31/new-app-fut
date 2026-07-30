# M3 progress

Captured: 2026-07-25

Status: implementation and local gates complete. GitHub CI and a hosted
Preview remain pending because this branch has not been published.

## Runtime and styles

- Styled Components uses the Next compiler and a
  `ServerStyleSheet`/`useServerInsertedHTML` registry.
- The root layout imports the global Tailwind stylesheet and wraps the app in
  `app/providers.jsx`.
- Tailwind 4 now runs through `@tailwindcss/postcss`; the Vite plugin was
  removed from dependencies and from the rollback config.
- The Next Metadata API owns the production title, description, viewport and
  icon. The Vite rollback entry no longer reads `import.meta.env`.
- `#modal-root` is part of the root layout. Shared modal and photo-editor
  portals resolve it through a browser-only helper.

The legacy island is intentionally client-only until its routes are moved in
M6-M9. Its `ThemeProvider`, global styles and Auth provider live in
`src/legacy/LegacyProviders.jsx`, inside `BrowserRouter`, because the current
Auth context still calls React Router navigation. The root Styled Components
registry is ready for server-rendered Next routes as they replace the island.

## Hydration

- Theme state starts from a deterministic light server snapshot and reads
  local storage/system preference only after mount.
- Division persistence uses Zustand `skipHydration` and an explicit
  `rehydrate`.
- The legacy tree shows the existing loading screen until both stores report
  hydration complete.
- Public E2E asserts the themed body background, `#modal-root`, direct
  navigation and hard reload. It also fails on hydration, SSR mismatch or
  Styled Components console errors.

## Client/server boundaries

- The former universal Supabase config was replaced by
  `src/lib/supabase/browserClient.js`, marked `client-only`.
- The 39 browser consumers use that public client; Auth, Presence and
  Postgres Changes remain browser-side during the compatibility phase.
- The service-role client remains in `src/server/api/supabaseAdmin.js`, marked
  `server-only`.
- OCR, image processing, background removal, HTML image export and portal
  helpers are explicitly browser-only.
- `src/index.js` was removed, eliminating the barrel that reexported
  `main.jsx` and could execute `createRoot` as an import side effect.
- Route constants, encoded path builders and internal redirect sanitization
  now live in `src/lib/navigation/routes.js` with unit coverage.

The exact Supabase classification is recorded in
`docs/migration-evidence/m3/supabase-boundaries.md`.

## Environment

- `.env.example` documents public and server-only target names without
  values.
- Application source uses `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The server API accepts only server/Next names and never a `VITE_*` service
  credential.
- Vite and Next configs retain read-only `VITE_APP_*` fallbacks solely for the
  documented rollback window.
- `VITE_HF_API_KEY` was not migrated or exposed because it has no consumer.

## Local gates

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node unit/contracts | 77 passed, 0 failed |
| Next Route Handler contracts | 3 suites covering 7 routes passed |
| Edge HTTP contracts | 5 passed, 0 failed |
| Deno Edge tests | 53 passed, 0 failed |
| Next production build | passed |
| Vite rollback build | passed |
| Next production E2E | 12 passed in Chromium, mobile Chromium and WebKit |
| Client bundle secret scan | 69 JS files; private env name and local service-role value absent |
| Git whitespace check | passed |

Next emitted only webpack cache snapshot warnings after the successful build.
The Vite rollback build retains the previously measured OCR/OpenCV bundle-size
and browser externalization warnings. Neither warning is new to M3.

## Open items

- M4 replaces the browser Auth singleton with cookie-backed
  `@supabase/ssr` browser/server clients and adds the PKCE callback.
- Preview and CI validation require intentionally publishing the branch.
- The isolated Supabase reset and role fixtures remain M1 work; no Docker
  Desktop was used for M3.
