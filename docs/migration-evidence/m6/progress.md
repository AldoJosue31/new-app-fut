# M6 progress

Captured: 2026-07-26

Status: public and authentication routes are native App Router routes locally.
Hosted OAuth and disposable valid-invitation validation remain rollout tasks.

## Native route map

| URL | App Router implementation |
|---|---|
| `/` | server-auth-aware page; anonymous sees landing, authenticated users redirect to their role home |
| `/landing` | static native page with public metadata |
| `/login` | dynamic server-auth-aware page; authenticated users redirect before private UI |
| `/auth/callback` | existing native PKCE Route Handler |
| `/share/standings/[torneoId]` | dynamic native page with server-provided public tournament bundle |
| `/invitation/[token]` | dynamic native manager invitation page |
| `/delegate/invitation/[token]` | dynamic native delegate invitation page |

The optional catch-all was changed from `[[...legacyPath]]` to
`[...legacyPath]`. It can no longer claim `/`, and explicit public routes take
precedence over it. React Router definitions remain only for the temporary
Vite rollback and private legacy shell.

## Server rendering and browser independence

- Public tournament and invitation reads use the request-scoped public
  Supabase client, never service role.
- Tournament, token and invitation status are passed to client components as
  serializable props. Invalid identifiers are rejected before any network
  request.
- The public standings table and invalid/expired invitation feedback are in
  the initial HTML.
- Landing/login links no longer import React Router. Standard anchors preserve
  native navigation with JavaScript disabled and keep the Vite rollback usable.
- Login and invitation actions no longer require a Router context.
- The shared Toast portal now has a hydration-stable mounted boundary. This
  fixed the only login hydration mismatch exposed by native SSR.
- Public metadata includes descriptions, canonical URLs and Open Graph data.
  `metadataBase` resolves from `NEXT_PUBLIC_SITE_URL`, Vercel host variables or
  localhost in development.

## Verification

| Gate | Result |
|---|---|
| Strict lint | 0 errors, 0 warnings |
| Node tests | 95 passed |
| Next/Auth and Route Handler tests | 21 passed |
| Next production build | passed; six explicit M6 pages plus native callback recognized |
| Browser E2E | 39 passed |
| Browser projects | Chromium, mobile Chromium and WebKit |
| JavaScript-disabled checks | landing, login, invalid standings and invalid delegate invitation passed in all three projects |
| Vite rollback build | passed |

The E2E suite uses malformed tournament IDs and invitation tokens, so these
checks do not query or mutate production. Existing callback contracts cover
PKCE success, external-return rejection, cancellation/error propagation and
return to `/configuracion`.

## Rollout validation still open

- Run Google sign-in/cancel against the hosted Preview redirect allowlist.
- Exercise one valid manager and delegate invitation with disposable isolated
  users, including expiration and cleanup.
- Verify generated Open Graph absolute URLs on the real Preview/Production
  domains.

No Docker Desktop was used and no production business data was changed.
