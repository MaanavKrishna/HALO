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

Direction: a calm scientific instrument. The motif is the microgravity flame, a dim blue sphere; the wordmark's O carries a soft blue halo (CSS only, decorative, never data).

**Tokens** live as CSS variables in `web/src/app/globals.css` and are exposed to Tailwind through `@theme inline` (`bg-paper`, `text-ink`, `border-rule`, `text-flame`, `bg-amber-soft`, ...).

| Token | Light / print | Dark | Use |
|---|---|---|---|
| `--paper` | #f4f6f8 | #070f19 | page background (print: white) |
| `--surface` | #ffffff | #0e1a28 | inputs, cards |
| `--ink` | #0d1b2a | #e4eaf1 | text |
| `--muted` | #4a5868 | #97a6b6 | secondary text |
| `--rule` / `--rule-strong` | #d3dbe3 / #7d8a97 | #22334a / #5a7192 | dividers / control borders (rule-strong ≥ 3:1 on paper and surface) |
| `--flame` | #2453d0 | #86a8ff | the one accent: selection, links, primary action, good evidence |
| `--amber` | #8f5300 | #f0b052 | reserved for warnings, critical flags, grades D and F |

Dark mode follows `prefers-color-scheme`. A `@media print` block forces light tokens on white, hides `.no-print` elements (the nav), avoids breaking sections and tables across pages, and sets A4 margins.

**Type.** Archivo (variable, with a width axis) for all text: `wdth 125` for the wordmark and section titles (`.wide`), `wdth 100` for body. IBM Plex Mono for instrument readouts (numeric inputs, preset values). Both are self-hosted by `next/font/google` at build time, so the CSP needs no external font origin. Every number uses tabular figures (`.num`, number inputs, tables).

**Accessibility rules.**
- Text and controls meet WCAG AA contrast in both themes.
- Every input has a visible `<label>`; groups use `<fieldset>`/`<legend>`; errors are linked with `aria-describedby` and focus moves to the first invalid field.
- Material chips are real checkboxes inside labels, so they are keyboard-operable and announced as checkboxes; the liquids toggle is a checkbox with `role="switch"`.
- A 2px `--focus` outline on `:focus-visible` everywhere; a skip link precedes the nav.
- Motion is limited to one halo fade-in on load and short state transitions; `prefers-reduced-motion: reduce` removes them.
- Verdict copy never says "safe" or "unsafe"; grades describe evidence.

**Components in `web/src/components/ui/`.**
- `ProvenanceBadge({ provenance })`: marker plus label for measured, inferred, assumed, literature, model; the marker shape (filled, half, hollow, square, dashed diamond) stays readable in greyscale print. `si` renders `SiChip`. The help text is part of the accessible name (sr-only), not title-only.
- `SiChip()`: dashed "SI" chip attached to every SI-written sentence; its accessible name carries the explanation ("SI-generated from the cited facts; ...").
- `GradeBadge({ grade, size? })`: the grade letter inside a ring whose closure shrinks from A to F; A and B use flame blue, C ink, D and F amber. Sizes `sm` (28px), `md` (44px), `lg` (76px). Its accessible name is "Evidence grade X: ...".
- `NavLinks`: the main nav (Brief, Explore, Compare, About) with `aria-current` on the active page.
