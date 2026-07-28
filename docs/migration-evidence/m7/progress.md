# M7 progress

Captured: 2026-07-27

Status: the private shell and the simple private routes are native App Router
routes locally. Hosted Preview validation remains part of rollout.

## Native private route map

| URL | App Router implementation |
|---|---|
| `/dashboard` | dynamic server-guarded page rendering the existing dashboard view |
| `/partidos` | dynamic server-guarded page rendering the existing matches view |
| `/configuracion` | dynamic server-guarded page that preserves the complete query string as the login return path |
| `/liga` | dynamic server-guarded page with the `general` tab |
| `/liga/[tab]` | dynamic server-guarded page that receives the tab from App Router params |
| `/admin/managers` | dynamic server-guarded page with a direct AdminManagers import |

Explicit App Router pages now take precedence over the legacy catch-all. React
Router definitions for these URLs remain only as a temporary Vite rollback.
The catch-all continues to host the team and tournament flows assigned to M8
and M9.

## Private shell and authorization

- `PrivatePageShell` is the shared private layout primitive. It owns the
  responsive Sidebar, provider boundary, error boundary and sidebar open state.
- The shell derives its active route with Next `usePathname`; native pages no
  longer pass a duplicated current-path prop.
- Every page calls `getPrivatePageAuth` before rendering. That helper reads the
  request-scoped SSR auth snapshot, evaluates the frozen route/role matrix and
  uses a server redirect when access is denied.
- Private pages are dynamic, have revalidation disabled and publish `noindex`
  metadata.
- The existing dashboard, matches, settings, league and admin views are
  explicit client boundaries. League tabs receive their route parameter as a
  prop instead of reading React Router params.
- Sidebar, DivisionSelector, dashboard cards and the league template no longer
  depend on React Router in the native path. Standard links preserve the Vite
  rollback and browser history.

## Real role validation

The local Next production server used the existing Supabase project. Testing
was limited to authentication, navigation and reads.

| Role | Verified behavior |
|---|---|
| Manager | login to `/dashboard`; hard reload; `/partidos`; `/liga/divisions`; mobile menu at 390 x 844; Dashboard/Partidos back and forward navigation; logout |
| Admin | login to `/admin/managers`; manager-list read; hard reload; logout |
| Delegate | login to `/configuracion`; hard reload; `/dashboard` redirected to `/equipos`; legacy M8 fallback rendered; logout |

Anonymous direct access to `/dashboard`, `/partidos`, `/liga/divisions`,
`/admin/managers` and `/configuracion?tab=cuenta` redirected to `/login` with
the exact internal return path before the private shell rendered.

All three sessions closed successfully and the browser reported no console
errors. No create, edit, delete, unlink, suspension or league/team/tournament
action was invoked. Only the normal auth session and presence/last-seen effects
of signing in and out could occur.

## Verification

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 95 passed |
| Edge Function tests | 53 passed |
| Next/Auth and Route Handler tests | 21 passed |
| Next production build | passed; all six explicit M7 routes recognized |
| Browser E2E | 45 passed |
| Browser projects | Chromium, mobile Chromium and WebKit |
| Real role smoke | Manager, Admin and Delegate passed |
| Responsive private shell | Manager mobile menu and logout control passed at 390 x 844 |
| Browser history | Dashboard to Partidos, back and forward passed |
| Vite rollback build | passed |

The webpack cache snapshot warnings and the Vite OpenCV/large-chunk warnings
are pre-existing non-blocking build warnings.

## Rollout validation still open

- Publish a hosted Preview and repeat the role-routing smoke with the real
  deployment cookie, origin and proxy behavior.
- Observe request errors and private-route redirects before promoting traffic.
- Keep the legacy catch-all and Vite rollback until M8, M9 and the final cutover
  gates pass.

No Docker Desktop was used and no production business data was changed.
