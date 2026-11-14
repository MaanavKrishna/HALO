# HALO

**Habitat Assessment from Low-gravity Observations.**

## What HALO is

In microgravity, a flame becomes a halo. HALO turns NASA's microgravity fire data into a one-page fire brief for your habitat: pick a habitat atmosphere and materials, and HALO shows which tested conditions are closest, how much evidence covers them, and where the evidence stops. Every number is cited to its source.

## Live demo

TBD (deployed on Vercel once the repository is public).

## How it works

Placeholder outline:

1. **Pipeline** (`pipeline/`): Python scripts turn the NASA Physical Sciences Informatics (PSI) combustion datasets into clean JSON.
2. **JSON** (`web/src/data/`): generated files, imported statically into the app.
3. **Engine** (`web/src/`): deterministic scoring of distance to tested conditions and per-fuel grades.
4. **SI** (synthetic intelligence): an LLM writes plain-language explanations on top of the engine's cited facts. It never introduces a number that is not in the data.

## Run locally

```
cd web && pnpm install && pnpm dev
```

Built with Next 16 (App Router), React 19, Tailwind 4. Tests: `pnpm test` (unit) and `pnpm exec playwright test` (end-to-end against a production build on port 3100). Copy `.env.example` to `.env` for local keys.

## Security

- Security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`) are set for every route in `web/next.config.ts`.
- `ANTHROPIC_API_KEY` is server-only. `.env` is gitignored, and a pre-commit hook (`.githooks/pre-commit`, enabled with `git config core.hooksPath .githooks`) rejects staged `.env` files and key-like strings.
- Cost and abuse control: a monthly spend limit in the Anthropic console plus a Vercel Firewall rate limit on `/api/explain`.

See `docs/ARCHITECTURE.md` for the rationale.

## Data & citation

Placeholder. Data: NASA Physical Sciences Informatics (CC0), cited by PSI dataset DOI. HALO summarizes published NASA test evidence. It is not a safety certification. Not affiliated with or endorsed by NASA.

## License

Apache-2.0. See `LICENSE`.
