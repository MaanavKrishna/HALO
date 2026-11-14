# Pages

| Route | Shows | Data |
|---|---|---|
| `/` | Habitat builder; submits to `/brief`. | presets, manifest counts |
| `/brief?...` | The Fire Brief for a habitat query. | engine over all data |
| `/explore` | Sortable, filterable table (hazard, fuel class) of all investigations; cards on phones. Null O2 or pressure ranges read "not tabulated". | `investigations.json` |
| `/explore/[psiId]` | One investigation: SI summary (only if present and not flagged needsReview; otherwise the objective stands alone), objective, research impact, varied and not-varied variables, an O2 x pressure plot of its eligible tests with a data-table fallback, publications with DOI links, dataset DOI, license, and an "Open in PSI" link. Statically generated for every id. | `investigations.json`, `tests.json` (joined on psiId), `summaries.json` |
| `/compare?a=<query>&b=<query>` | Two compact brief summaries (grade, flags, smoke detection) with a change summary. `a` and `b` are habitat query strings as built by `habitatToQuery`; defaults are the ISS and Artemis Base presets. Each column links to its full brief. | engine (`buildBrief`) |
| `/findings` | Eight cited finding cards (solid O2 ceiling, Moon window, detector blind spot, droplet 50% point, Saffire spread, no partial gravity, EVA suit, next test to fly). Each has one sentence, a Stat, a vector figure, provenance badges, sources and a "See it in a brief" link to a preset brief with its grade. Every value is computed at build time in `components/content/findings.ts`. | engine over all data |
| `/method` | Evidence distance (HTML math), eligibility, rings diagram (eligible tests around Artemis Base in distance space), grade rules, preset grades table, ranking weights, detector calibration and why obscuration is omitted, extinction model, next-test scoring and picks, limits. | engine, `detector.json`, `extinction.json` |
| `/data` | PSI source and licences, provenance vocabulary with row counts, eligibility by fuel class, data-quality fixes, Saffire literature table, downloads, `#sources` (24 dataset DOIs, publication DOIs grouped by investigation, reports and other URLs). | all data files |
| `/data/files/<name>.json` | Static copies of the seven JSON contract files (route handler, prerendered); unknown names 404. | `web/src/data/*.json` |
| `/about` | What HALO is, the challenge and its three goals, team, use of SI (build-time model, runtime model, validators, eval pass rate from `eval.json`, development-time disclosure), licence, acknowledgements, disclaimer. | `summaries.json`, `eval.json` |
| plumbing | `/sitemap.xml` (static routes, 24 investigations, 5 preset briefs), `/robots.txt`, `/manifest.webmanifest`, `/icon` (32), `/apple-icon` (180), `/icons/{192,512}[-maskable]`, `/opengraph-image` + `/twitter-image` and per-page OG for findings/method/data/about (1200x630, Inter from local TTF), styled `not-found`, `error` (retry) and `global-error`. Site URL in `lib/site.ts` (override with `NEXT_PUBLIC_SITE_URL`). | |

Notes
- Acronyms differ between `tests.json` and `investigations.json`; always join on `psiId`.
- Unknown `/explore/<id>` returns a real 404. With Cache Components a `notFound()` inside the page would stream under a 200, so `next.config.ts` rewrites ids absent from the data to a missing route before rendering. `notFound()` stays as a fallback (for example a lower-case id, which still matches the route and shows the not-found page with a noindex tag).
- Text from data is rendered as plain text; external links use `rel="noopener noreferrer"`.
