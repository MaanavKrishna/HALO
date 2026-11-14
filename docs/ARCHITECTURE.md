# Architecture

## Repo layout

```
halo/
  pipeline/   Python data pipeline (PSI datasets -> JSON)
  data/       raw and intermediate data inputs
  web/        Next.js app (src/app, src/components, src/data, tests/e2e)
  docs/       this file and other project docs
  .githooks/  pre-commit secret guard
```

## Data flow

PSI datasets -> `pipeline/` (clean, normalise, attach provenance) -> JSON in `web/src/data/` -> imported statically by the engine and UI (no runtime `fs` reads, so Vercel functions always have the data) -> deterministic engine (distance, grades, coverage) -> Fire Brief page. The SI layer sits on top of engine facts and may only restate numbers that exist as Fact values. "Download data" builds its file client-side.

## Security headers

Set once in `web/next.config.ts` via `headers()` for `/:path*`. There is no middleware and no per-request nonce, so pages stay statically prerendered and hydrate normally.

CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.

Why `script-src` allows `'unsafe-inline'`: Next injects inline bootstrap and hydration scripts into prerendered HTML. A strict nonce policy would require per-request rendering (middleware), which defeats static prerendering. Without it, hydration would be blocked.

How XSS is prevented instead: HTML is never rendered from data or SI output. Everything is rendered through React's escaping, and `dangerouslySetInnerHTML` is not used. All other CSP directives stay locked down (same-origin only, no framing, no plugins, no foreign form targets).

Other headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Frame-Options: DENY`. The end-to-end smoke test asserts these on a production build and fails on any CSP console violation.

## Secrets and cost control

`ANTHROPIC_API_KEY` is server-only. Primary abuse controls are the Anthropic console spend limit and a Vercel Firewall rate limit on `/api/explain`; any in-app limiter is best-effort only.

## Design system

The visual system (tokens, type scale, colour rules, motion, components, accessibility and print rules) is documented in [DESIGN.md](DESIGN.md). Tokens live in `web/src/styles/tokens.css`, the Tailwind bridge and shared recipes in `web/src/app/globals.css`, components in `web/src/components/ui/`, and the living styleguide at `/design`.
