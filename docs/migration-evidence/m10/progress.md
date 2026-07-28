# M10 progress

Captured: 2026-07-27

Status: browser-only hardening, hydration stability, client observability and
route-level client bundle splitting are complete locally. Hosted Preview,
external telemetry delivery and server deployment-trace slimming remain for
M11.

## Hydration and browser-only hardening

- Browser storage, viewport, origin, clocks and tournament redirect preferences
  now start from deterministic server-safe values and hydrate browser state
  after mount.
- Tournament draft, standings preference, scanner cooldown and theme storage
  reads/writes are guarded against unavailable or blocked `localStorage`.
- Invitation URLs no longer read `window.location.origin` while rendering.
- Tournament and planning responsive state no longer reads `window.innerWidth`
  during the first render.
- Countdown views initialize without `Date.now()` hydration drift.
- Public invitation date formatting uses the canonical
  `America/Mexico_City` timezone.
- Open portals in `Modal` and `FixturePreviewModal` use a mounted snapshot gate,
  so server rendering cannot access `document`.
- The tournament summary modal no longer reads storage during render and is
  mounted only when opened.
- The final browser-sensitive inventory contains 73 files. Static checks found
  no remaining `useState`/`useRef` initializer that directly reads
  `window`, storage or `Date.now()`. The only top-level browser entry is the
  isolated Vite rollback entry `src/main.jsx`, scheduled for removal in M11.

## Deferred browser engines

- `html-to-image`, background removal and both IMG.LY engines load only when an
  export or image-processing action is requested.
- PaddleOCR remains behind the scanner action. Its worker, engine and WASM do
  not overlap Landing, Teams, the tournament shell or any initial tournament
  tab graph.
- The four tournament tabs and the tournament summary modal are lazy-loaded.
- Anonymous Landing no longer receives the Auth provider graph and contains no
  Supabase, `AuthStore` or React Router code.

## Observability

- `useReportWebVitals` buffers the latest 20 normalized metrics and emits the
  `bracket:web-vital` event.
- Client global errors and unhandled rejections are sanitized, buffered and
  emitted through `bracket:client-error`.
- Next Route Handlers return `x-request-id` and `Server-Timing: app;dur=...`.
- E2E verifies that the client instrumentation installs, a real `TTFB` metric is
  captured and the buffered client error list stays empty.

These buffers intentionally remain local for M10. Sending them to an external
telemetry service requires the deployment/environment decision in M11.

## Bundle evidence

The final build is `Xqibv283V2gLljkFyDTcS`. The route graph was audited before
the final isolated mobile-header hardening and the final Landing delta was then
measured from the production script graph. Teams and Tournaments did not change.

| Route graph | Baseline raw/gzip | Final raw/gzip | Gzip change |
|---|---:|---:|---:|
| Landing route graph | 657.5 / 193.3 KB | 410.4 / 128.4 KB | -33.6% |
| Teams | 961.2 / 283.1 KB | 881.1 / 261.3 KB | -7.7% |
| Tournaments shell | 1,356.9 / 388.0 KB | 524.9 / 157.2 KB | -59.5% |
| Shell + scorers | 1,356.9 / 388.0 KB | 598.4 / 178.6 KB | -54.0% |
| Shell + definition | 1,356.9 / 388.0 KB | 764.6 / 226.6 KB | -41.6% |
| Shell + rounds | 1,356.9 / 388.0 KB | 975.7 / 283.2 KB | -27.0% |
| Shell + standings | 1,356.9 / 388.0 KB | 746.6 / 226.4 KB | -41.6% |

The complete final Landing production script set, including Next framework,
polyfills and shared layout chunks, is 970.9 KB raw / 300.8 KB gzip. No loaded
Landing script contains PaddleOCR, IMG.LY/ONNX, `html-to-image` or jsPDF.

The remaining deployment-trace issue is server-side rather than a client
download regression:

- Landing trace: approximately 2.64 MB raw / 0.74 MB gzip.
- Teams trace: approximately 3.78 / 1.06 MB and still contains about 762 KB raw
  of server-traced ONNX.
- Tournament traces: approximately 25.09 / 7.97 MB and still contain the Paddle
  worker, Paddle/ONNX chunk and PDF code.

This is a P2 for M11 because it affects packaging and possible cold deployment,
not the browser's initial route payload.

## Responsive and accessibility verification

The reduced-motion failure was a Playwright configuration bug, not a CSS bug.
Playwright 1.61.1 requires `reducedMotion` under `contextOptions`; the test now
asserts the media query itself before checking opacity, transforms and
transitions.

Manual mobile inspection also found that Landing's existing menu button toggled
unused state without rendering navigation. It now:

- exposes `aria-expanded` and `aria-controls`;
- changes its accessible name between `Menú` and `Cerrar menú`;
- renders all section links plus Login;
- uses 44 px minimum targets and visible focus outlines;
- closes on a link, Escape or transition to a desktop viewport.

The production browser check passed at 390 x 844 with no console errors and no
horizontal overflow (`scrollWidth === clientWidth`). Desktop rendering and the
reduced-motion variants also passed.

## Verification

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 102 passed |
| Edge Function tests | 53 passed |
| Next/Auth/API tests | 21 passed, including request ID and Server-Timing assertions |
| Next production build | passed with Next 16.2.12; final build ID `Xqibv283V2gLljkFyDTcS` |
| Browser E2E | 60 passed in Chromium, WebKit and mobile Chromium |
| Manual browser | desktop/mobile Landing, menu, hydration/error logs and overflow passed |
| Vite rollback build | passed; 1,026 modules in 45.83 seconds |

The final Vite entry is 1,450.54 KB raw / 419.88 KB gzip. Its known OpenCV
externalization, mixed public-standings imports and large rollback chunks remain
non-blocking because Vite is removed in M11.

No Docker Desktop was used. No production league, division, team, tournament,
round, match or account record was created, edited or deleted. No credentials
were written to the repository.

## M11 handoff

- Run the complete verification set against an isolated hosted Preview.
- Connect the local metrics/error events to the selected telemetry backend.
- Remove the remaining React Router, Vite, catch-all and compatibility shell.
- Slim Next server traces for browser-only OCR, ONNX and PDF dependencies.
- Replace the private compatibility loader with true request-rendered private
  content and eliminate the remaining theme flash.
- Validate the deployment, canary/alias and documented rollback before any
  production cutover.
