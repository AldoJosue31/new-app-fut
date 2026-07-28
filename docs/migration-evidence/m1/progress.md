# M1 progress

Captured: 2026-07-25

Status: in progress; toolchain, strict lint, API contracts, public safety net
and CI definition are operational. The Supabase reset and isolated
authenticated-fixture gates remain open.

## Reproducible toolchain

- Node.js is pinned to `24.14.0` in `.nvmrc` and to `24.x` in `engines`.
- npm is pinned to `11.6.2` through `packageManager` and `engines`.
- Deno is pinned as a project dependency at `2.9.0`.
- Playwright is pinned at `1.61.1`.
- Supabase CLI is pinned at `2.109.1`.
- A final clean `npm ci` completed in an isolated temporary directory with
  Node `24.14.0` and npm `11.6.2`.
- The check exposed an incomplete lock produced after the floating Tailwind
  range selected `4.3.3` on Windows. `@tailwindcss/vite` and `tailwindcss` are
  now pinned to the known baseline `4.1.17`, and the clean install succeeds.
- Supabase JS is pinned consistently at `2.110.8` in npm and both Deno import
  maps.
- Vercel CLI has not been installed because Preview/deploy work does not begin
  until M2.

## Dependency security

The non-forced npm remediation updated the existing Vite application within
compatible semver ranges, including:

- React Router DOM `7.10.1` to `7.18.1`.
- Vite `7.2.7` to `7.3.6`.
- Styled Components `6.1.19` to `6.4.4`.
- Protobuf.js `7.5.4` to `7.6.5`.
- PostCSS `8.5.6` to `8.5.23`.

The production audit fell from 13 findings, including one critical, to two high
findings. Both remaining findings are the same React Router RSC-mode advisory.
The current application is a browser SPA and does not use Router RSC mode.
Removing React Router during the migration is the planned remediation; a forced
intermediate upgrade to Router 8 was not applied.

## Quality gates executed

| Gate | Result |
|---|---|
| Clean install | final isolated `npm ci`: passed |
| Application lint | 0 errors, 0 warnings |
| Node tests | 74 passed, 0 failed |
| Deno Edge tests | 53 passed, 0 failed |
| Vite production build | passed with Vite 7.3.6 |
| E2E production artifact | 12 passed, 0 failed |

The lint command owns only `src`, `api`, `scripts` and `tests` and now fails on
the first warning through `--max-warnings 0`. The 40 baseline findings were
removed without disabling rules: dead code was deleted, state-reset boundaries
were made explicit, animation-only state moved to browser animation APIs, and
effect-only callbacks use React 19 `useEffectEvent`.

The audited lint toolchain is pinned exactly at ESLint `9.39.1`,
`eslint-plugin-react-hooks` `7.0.1` and React Refresh `0.4.24`. Allowing the
hooks plugin to float to `7.1.1` activated 121 additional React Compiler
findings and was deliberately reverted to preserve the measured baseline.

The build still contains the known OCR/WASM weight:

- two WASM artifacts around 23.9 MB and 25.0 MB;
- OCR worker around 11.3 MB;
- main JavaScript artifact around 10.5 MB.

The cold post-update build took 2m22s. This is recorded as an upper-bound
measurement; M10 owns code splitting and browser-only isolation.

## Edge Functions

Deno 2.9 found two type-level incompatibilities:

- the Google Vision test captured a `Headers` object through an async callback,
  which newer control-flow analysis narrowed incorrectly;
- Web Crypto now requires an `ArrayBuffer`-backed input rather than the broader
  `ArrayBufferLike` accepted by the existing `Uint8Array` type.

Both were fixed without changing their observable contracts. The
`manage-delegate-account` handler is now importable and has five HTTP contract
tests. All 53 Deno tests now type-check and pass.

The remote project currently has three active Edge Functions:

- `procesar-cedula`;
- `procesar-rol-juego`;
- `manage-delegate-account`.

## Public route safety net

Playwright covers direct navigation and hard reload for:

- `/`;
- `/landing`;
- `/login`;
- `/share/standings/1`.

The production artifact passed in Chromium desktop, Chromium mobile and WebKit.
Firefox is installed and configured, but its Windows headless binary blocked
before page creation with `RenderCompositorSWGL failed mapping default
framebuffer`. This is recorded as an environment limitation, not an application
failure. Firefox remains a required M1/CI gate on a compatible runner.

Authenticated routes remain pending until isolated role fixtures exist.

## API contract safety net

All seven Vercel handlers now export a dependency-injectable factory while
preserving their existing default export. Eleven Node contract cases cover
method gates, authorization ordering, payload validation, normalized calls,
manager-creation rollback, quota and suspension updates, delegate account
protection and the aggregated division workspace response.

The Edge function adds five Deno HTTP contract cases for CORS, method,
configuration, `teamId`, account lookup and update validation. No test invokes
the linked project. The complete frozen contract is recorded in
`docs/migration-evidence/m1/api-contracts.md`.

## CI definition

`.github/workflows/migration-ci.yml` runs on Ubuntu with the pinned Node
version. It defines:

- clean npm installation, strict lint, Node tests, Deno tests and production
  build;
- separate Chromium, WebKit and Firefox smoke jobs;
- a mobile Chromium smoke job;
- Playwright diagnostics uploaded only on failure.

The workflow is defined locally but has not run on GitHub because this branch
has not been pushed.

## Supabase migration inventory

The local `.env` and linked Supabase metadata both point to project
`onctxrztfpkijuawqqmo`.

Read-only inspection found:

- 21 public tables;
- 3 public views;
- 28 migrations recorded remotely;
- 3 active Edge Functions.

`supabase migration fetch --linked` recovered all 28 remote migration files.
The active `supabase/migrations` directory now matches remote history 28/28.

Eleven pre-existing local files were not present in remote migration history.
Leaving them active would make a future `db push` attempt to execute them on
production. Their contents were preserved under `supabase/migration-review`:

- eight duplicate a remote descriptive name with another timestamp;
- one likely overlaps `normalize_blank_team_optional_fields`;
- two security/comment migrations need comparison against a full schema
  snapshot.

No remote migration, SQL mutation, seed or reset was executed.

The recovered history now versions `activar_nuevo_manager` and
`unlink_team_delegate`. `borrar_usuario_por_email` still exists only in the
remote schema and is absent from migration history.

Read-only inspection also exposed a contract to test before migration:
`api/admin/managers/delete.js` calls that RPC with the service-role client,
while the current `SECURITY DEFINER` function checks `auth.uid()` for an admin
profile. A service-role JWT normally has no user ID, so this path is likely to
return an authorization error. The destructive delete operation was not invoked
against shared data.

## Supabase blocker

The migration history begins at a phase-3 delegate migration and does not create
the base tables. Supabase CLI requires a Docker-compatible container runtime to
run `db dump`, `db pull`/diff and `db reset`; no container runtime is used in
this environment.

Therefore M1 still needs:

1. Run the database job later in an isolated CI runner or another
   Docker-compatible environment; Docker Desktop is not required for the
   current code work.
2. Pull a complete schema baseline from the linked project.
3. Reconcile the 11 files in `supabase/migration-review`.
4. Version or replace `borrar_usuario_por_email` after its contract is tested.
5. Add isolated anon/delegate/manager/admin fixtures to `supabase/seed.sql`.
6. Prove `supabase db reset` from zero.

The current `seed.sql` is intentionally data-free and prevents the configured
path from being missing. It must not receive copied production data.

## Remaining M1 work

- Add authenticated role/session E2E coverage.
- Create and verify the complete Supabase snapshot and fixtures.
- Run the defined Firefox job on GitHub.
- Add scanner HTTP smoke tests against an isolated local stack.
- Execute CI and Preview after the branch is published.
