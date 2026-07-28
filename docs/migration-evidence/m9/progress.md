# M9 progress

Captured: 2026-07-27

Status: tournament and round routing is complete locally on App Router. Hosted
Preview validation and interactive testing with an active tournament, including
exports, remain pending against isolated fixtures.

## Native tournament route map

| URL | App Router implementation |
|---|---|
| `/torneos` | dynamic server-guarded legacy tournament root |
| `/torneos/[tournamentOrTab]` | dynamic legacy tab or tournament route |
| `/torneos/[tournamentOrTab]/[tab]` | dynamic legacy tournament/tab or tab/round route |
| `/torneos/[tournamentOrTab]/[tab]/[jornadaId]` | dynamic legacy tournament/tab/round route |
| `/division/[divisionId]/torneos` | dynamic server-guarded canonical tournament root |
| `/division/[divisionId]/torneos/[tournamentOrTab]` | dynamic canonical tab or tournament route |
| `/division/[divisionId]/torneos/[tournamentOrTab]/[tab]` | dynamic canonical tournament/tab or tab/round route |
| `/division/[divisionId]/torneos/[tournamentOrTab]/[tab]/[jornadaId]` | dynamic canonical tournament/tab/round route |

These eight explicit pages take precedence over the legacy catch-all. The React
Router definitions remain only in the Vite rollback application.

## Routing, guards and adapters

- `parseTournamentRoute` and `buildTournamentPath` are the shared pure routing
  contract. They distinguish a numeric tournament ID from a tab, validate the
  supported tabs and only retain `jornadaId` under `jornadas`.
- `TournamentsPageContent` validates the optional division segment, reconstructs
  the requested return path, applies the request-scoped SSR auth/role guard and
  performs route cleanup before rendering the client application.
- `NativeTournamentsPage` adapts the shared view to Next `usePathname`,
  `router.push` and `router.replace`, including the private shell's responsive
  sidebar state.
- `Torneos`, `TorneosTemplate`, `TorneoDefinicionTab` and
  `TorneoJornadasTab` receive route state and navigation through props. The
  native tournament graph no longer imports React Router.
- Tournament, tab and round remain reproducible in the URL. Moving between
  rounds updates history, and the dedicated route request ID prevents an older
  round request from leaving or overwriting the current loading state.
- Legacy tournament URLs canonicalize after the current division and active
  tournament are known. Changing division preserves the tab while deliberately
  discarding the prior tournament and round IDs.
- The Vite wrapper reads the same route parameters and passes the React Router
  navigation adapter into the shared view, preserving rollback compatibility.
- Resetting `DivisionStore` when auth changes between roles is implemented and
  confirmed with consecutive real Manager and Admin sessions.

## Real role smoke

The local Next production server used the existing Supabase project. The
Manager smoke covered tournament routing and the no-active-tournament state
across all four available divisions. The final cross-role verification passed:

- Manager started at `/division/94/torneos/definir` and then signed out.
- Admin opened `/torneos` without inheriting the Manager division and without
  rendering `División no encontrada`.
- After reload, Admin canonicalized cleanly to `/torneos/definir` and retained
  the no-division state, then signed out.

The account had no active tournament in those divisions, so no fixture,
planning, result, playoff, scanner or export workflow was executed. No
tournament, round, match, division or other business record was created,
updated or deleted. Only normal authentication/session and presence effects
could occur.

## Verification

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 102 passed |
| Edge Function tests | 53 passed |
| Next/Auth/API tests | 21 passed |
| Next production build | passed; all eight explicit M9 routes recognized |
| Browser E2E | 57 passed |
| Real role smoke | Manager routing passed in four divisions; Manager-to-Admin `DivisionStore` reset and no-division reload passed |
| Vite rollback build | passed after the final `AuthStore` patch; 1,026 modules in approximately 39 seconds |

The Vite build reported only the known non-blocking OpenCV externalization and
large-chunk warnings.

## Isolated rollout validation still open

- Publish a hosted Preview and repeat route, cookie, origin and proxy checks.
- Use disposable fixtures with an active tournament to exercise fixture
  generation, planning, results, playoffs and browser history across rounds.
- Exercise role and ID-card scanning without touching production records.
- Verify calendar, standings, ID-card and tournament-summary exports.

No Docker Desktop was used and no production business data was changed.
