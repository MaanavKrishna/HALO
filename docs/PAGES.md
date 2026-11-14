# Pages

| Route | Shows | Data |
|---|---|---|
| `/` | Habitat builder; submits to `/brief`. | presets, manifest counts |
| `/brief?...` | The Fire Brief for a habitat query: dark hero (name, atmosphere stats, grade on the halo dial, flag counts, actions) with a glass sticky bar on scroll; flags as callouts with fact chips; the halo evidence chart (hover and keyboard inspection); ranked investigations with score-part bars; detector meters with a sensor what-if; extinction, aftermath and next-test panels; "Ask HALO" (precomputed narrative, optional live SI narration via `POST /api/explain` that falls back on any error); Spinoff facts; numbered sources. Prints as an A4 paper brief. Layout in `docs/BRIEF.md`. | engine over all data; `/api/explain` |
| `/explore` | Sortable, filterable table (hazard, fuel class) of all investigations; cards on phones. Null O2 or pressure ranges read "not tabulated". | `investigations.json` |
| `/explore/[psiId]` | One investigation: SI summary (only if present and not flagged needsReview; otherwise the objective stands alone), objective, research impact, varied and not-varied variables, an O2 x pressure plot of its eligible tests with a data-table fallback, publications with DOI links, dataset DOI, license, and an "Open in PSI" link. Statically generated for every id. | `investigations.json`, `tests.json` (joined on psiId), `summaries.json` |
| `/compare?a=<query>&b=<query>` | Two compact brief summaries (grade, flags, smoke detection) with a change summary. `a` and `b` are habitat query strings as built by `habitatToQuery`; defaults are the ISS and Artemis Base presets. Each column links to its full brief. | engine (`buildBrief`) |
| `/about` | Method and disclosures. | n/a |

Notes
- Acronyms differ between `tests.json` and `investigations.json`; always join on `psiId`.
- Unknown `/explore/<id>` returns a real 404. With Cache Components a `notFound()` inside the page would stream under a 200, so `next.config.ts` rewrites ids absent from the data to a missing route before rendering. `notFound()` stays as a fallback (for example a lower-case id, which still matches the route and shows the not-found page with a noindex tag).
- Text from data is rendered as plain text; external links use `rel="noopener noreferrer"`.
