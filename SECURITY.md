# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's **Report a vulnerability** button on the repository's Security tab (private vulnerability reporting). Do not open a public issue.

Include what you found, how to reproduce it, and the impact you expect. You will get an acknowledgement within a few days.

## Scope

- The web app under `web/`, including the `/api/explain` route (rate-limited, server-only API key, validated output).
- The data pipeline under `pipeline/`.

## How the project protects itself

- Secrets live only in `.env` files, which are gitignored; `.env.example` holds placeholders. A pre-commit hook in `.githooks/` refuses to commit `.env` files or API-key-shaped strings.
- GitHub secret scanning with push protection is on, and CI scans the full history with gitleaks.
- CodeQL analyses JavaScript/TypeScript, Python and the workflows on every push and weekly.
- Dependabot watches npm, pip and GitHub Actions dependencies; every action in the workflows is pinned to a commit SHA.
- Workflows run with read-only repository permissions by default.
- The site sends a strict Content-Security-Policy and related headers (see `web/next.config.ts`).
