# M0 baseline

Captured: 2026-07-25

Status: completed with pre-existing issues documented

## Source control

- Branch: `refactor/migration-next`
- Commit: `0c08368f3b03d6c1680fe8fa5f9f0289ba14972b`
- The commit includes the existing `ResultModal.jsx` accessibility/scroll work and the migration plan.
- Worktree was clean before creating the M0 evidence files.
- The commit is also the current `develop` and `origin/develop` reference.

## Toolchain observed

- Default Node.js: `v25.0.0` (EOL at capture time).
- Direct npm CLI: `11.6.2`.
- Bundled LTS Node available to Codex: `v24.14.0`.
- Deno: not installed.
- Supabase CLI: not installed globally.
- Vercel CLI: not installed globally.

M1 will pin Node 24 LTS and a package manager version before installing Next.js.

## Vite production build

Command:

```text
.\node_modules\.bin\vite.cmd build
```

Result:

- Exit code: `0`.
- Vite: `7.2.7`.
- Modules transformed: `1,072`.
- Duration: `21.16s`.

Largest artifacts:

| Artifact | Size |
|---|---:|
| `ort-wasm-simd-threaded.jsep-C887KxcQ.wasm` | 25,014.75 kB |
| `ort-wasm-simd-threaded.jsep-D5Jk56-t.wasm` | 23,914.39 kB |
| `worker-entry-C9UNuyOJ-EhIzhVdm.js` | 11,341.49 kB |
| `index-Bq0Rqogf.js` | 10,477.04 kB |
| `index-ClXvVlyw.js` | 2,105.51 kB |

Warnings recorded:

- Node shims for `fs`, `path` and `crypto` in OpenCV.
- `html-to-image` is both statically and dynamically imported.
- Multiple chunks exceed 500 kB.

These sizes form the code-splitting baseline for M10.

## Node tests

Command:

```text
node --test tests/*.test.js
```

Result:

- Tests: `63`.
- Passed: `63`.
- Failed: `0`.
- Duration: approximately `0.53s`.

## Edge tests

- Eight Deno test files and 48 expected cases exist.
- They were not executable in M0 because Deno is not installed.
- M1 must make these tests reproducible before the Edge gate can pass.

## Lint

Application-scoped command:

```text
eslint src api scripts tests
```

Result:

- Errors: `30`.
- Warnings: `10`.
- Affected files: `27`.
- Fatal parser errors: `0`.

Repository-wide lint currently includes agent/plugin assets:

- Errors: `240`.
- Warnings: `10`.

M1 will scope lint to owned application files and deal explicitly with the 40 application findings.

## Browser baseline

The reusable capture command is implemented in:

```text
scripts/capture-migration-baseline.cjs
```

Captured routes:

- `/`
- `/landing`
- `/login`
- `/share/standings/1`

Viewports:

- Desktop: `1440x1000`.
- Mobile: `390x844`.

Artifacts:

- Eight PNG screenshots.
- `docs/migration-evidence/m0/screenshots/report.json`.

Observed:

- All eight navigations returned HTTP 200.
- No page exceptions were emitted.
- No response with status 5xx was observed.
- Landing emitted existing non-boolean DOM attribute warnings for `bad` and `secondary`.
- The placeholder standings ID emitted the expected `Torneo no encontrado` console error while preserving the current HTTP 200 UI behavior.

Authenticated/private screenshots are deferred to M1 because isolated role fixtures do not yet exist.

## M0 gate

- [x] Recoverable source commit exists.
- [x] Existing `ResultModal.jsx` work is preserved.
- [x] Build baseline is recorded.
- [x] Node test baseline is recorded.
- [x] Lint debt is quantified.
- [x] Public desktop/mobile screenshots are recorded.
- [x] Bundle risks are recorded.
- [x] Missing toolchain components are recorded.

