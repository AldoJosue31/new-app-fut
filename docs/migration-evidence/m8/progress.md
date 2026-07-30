# M8 progress

Captured: 2026-07-27

Status: the team routes are native App Router routes locally. Hosted Preview
validation and mutation testing with isolated fixtures remain part of rollout.

## Native team route map

| URL | App Router implementation |
|---|---|
| `/equipos` | dynamic server-guarded legacy team list |
| `/equipos/[teamId]` | dynamic server-guarded legacy detail or `teamId = crear` |
| `/division/[divisionId]/equipos` | dynamic server-guarded canonical team list |
| `/division/[divisionId]/equipos/[teamId]` | dynamic server-guarded canonical detail or `teamId = crear` |

These four explicit pages take precedence over the legacy catch-all. The React
Router definitions remain only in the Vite rollback application.

## Routing and adapter architecture

- `TeamsPageContent` validates division/team path segments, sanitizes the
  optional detail view, preserves the complete return path during login and
  applies the SSR role guard before rendering.
- `NativeTeamsPage` is the small client adapter between the shared team view
  and Next `router.push`/`router.replace`.
- The shared team view receives `divisionId`, `teamId`, `initialView` and its
  navigation function as props. It no longer imports React Router hooks.
- `buildTeamsPath` is the single pure URL builder for legacy and canonical
  routes. Its validation and query behavior have dedicated Node tests.
- `location.state.initialView` was replaced by the reproducible query values
  `?view=stats` and `?view=delegate-requests`.
- Closing detail removes both the team segment and the view query. Next
  navigation keeps the prior no-scroll behavior.
- Manager/Admin legacy URLs canonicalize after the persisted division is
  available. Delegate remains on `/equipos`.
- Invalid route segments and invalid view values are redirected to a valid
  team URL before the client view renders.
- A delegate cannot open `teamId = crear`; the server redirects that request
  to `/equipos`.

## Real role validation

The local Next production server used the existing Supabase project. Testing
was limited to authentication, navigation, reads and opening/closing forms
without submitting them.

| Role | Verified behavior |
|---|---|
| Manager | `/equipos` canonicalized to `/division/94/equipos`; list data loaded; team detail opened at `/division/94/equipos/1168`; direct `?view=stats` and `?view=delegate-requests` loaded and closed; create, edit and transfer forms opened and closed without submission; logout |
| Delegate | login return to `/equipos/crear` was denied by the server and redirected to `/equipos`; assigned-team list loaded; hard reload remained on the legacy route; logout |

The final Manager session closed successfully and the browser reported no
console errors. No create, edit, transfer, delete, delegate review or other
business mutation was submitted. Only the normal auth session and
presence/last-seen effects of signing in and out could occur.

## Verification

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 98 passed |
| Edge Function tests | 53 passed |
| Next/Auth and Route Handler tests | 21 passed |
| Next production build | passed; all four explicit M8 routes recognized |
| Browser E2E | 51 passed |
| Browser projects | Chromium, mobile Chromium and WebKit |
| Real role smoke | Manager and Delegate passed |
| URL detail views | stats and delegate requests passed by direct URL |
| Safe modal smoke | detail, create, edit, transfer and delegate requests opened/closed without submit |
| Vite rollback build | passed |

The webpack cache snapshot warnings and the Vite OpenCV/large-chunk warnings
are pre-existing non-blocking build warnings.

## Rollout validation still open

- Run create, edit, transfer, delete and delegate-review persistence flows only
  against disposable records or isolated fixtures.
- Publish a hosted Preview and repeat the Manager/Delegate route smoke with the
  deployment cookie, origin and proxy behavior.
- Observe route errors, redirects and API mutations before promoting traffic.
- Keep the Vite rollback until M9, M10 and the final cutover gates pass.

No Docker Desktop was used and no production business data was changed.
