# Pages

| Route | Shows | Data |
|---|---|---|
| `/` | Cinematic landing, one idea per section: hero (orb + rings, "Build a brief" to `/build`, "See the findings"); the problem (O2 strip of every real-solid test against ISS, Moon envelope and Artemis Base, with the untested gap; stat trio: richest real-solid test, Artemis O2, real solids in the Moon envelope); a live miniature Fire Brief for Artemis Base (grade, flags, evidence-halo thumbnail, link to the real brief); the three challenge goals with the Kapton detector blind spot as the proof; dataset counts and the provenance legend; the five presets with their grades, each linking to its brief; closing CTA and challenge credit. Every number is computed at build time (`components/landing/data.ts`); nothing is typed into copy. Static. | `tests.json`, `investigations.json`, `detector.json`, manifest, engine (`buildBrief`, `sensorWhatIf`) |
| `/build` | Habitat builder as an instrument panel: preset mission cards (mono readout + O2 gauge ring), atmosphere channels (slider + number field with units, live O2 partial pressure vs ISS air), material toggle chips, detector and liquid-fuel switches, habitat name, and a sticky action bar (`data-sticky-action`) with the live summary and "Generate brief". Validation shows rose errors after submit and focuses the first invalid field; editing a loaded preset renames it "(modified)"; submits to `/brief?{habitatToQuery}`. Static. | presets, materials, manifest counts |
| `/brief?...` | The Fire Brief for a habitat query. | engine over all data |
| `/explore` | Sortable, filterable table (hazard, fuel class) of all investigations; cards on phones. Null O2 or pressure ranges read "not tabulated". | `investigations.json` |
| `/explore/[psiId]` | One investigation: SI summary (only if present and not flagged needsReview; otherwise the objective stands alone), objective, research impact, varied and not-varied variables, an O2 x pressure plot of its eligible tests with a data-table fallback, publications with DOI links, dataset DOI, license, and an "Open in PSI" link. Statically generated for every id. | `investigations.json`, `tests.json` (joined on psiId), `summaries.json` |
| `/compare?a=<query>&b=<query>` | Two compact brief summaries (grade, flags, smoke detection) with a change summary. `a` and `b` are habitat query strings as built by `habitatToQuery`; defaults are the ISS and Artemis Base presets. Each column links to its full brief. | engine (`buildBrief`) |
| `/about` | Method and disclosures. | n/a |

Notes
- Acronyms differ between `tests.json` and `investigations.json`; always join on `psiId`.
- Unknown `/explore/<id>` returns a real 404. With Cache Components a `notFound()` inside the page would stream under a 200, so `next.config.ts` rewrites ids absent from the data to a missing route before rendering. `notFound()` stays as a fallback (for example a lower-case id, which still matches the route and shows the not-found page with a noindex tag).
- Landing links to routes built in parallel (`/findings`, `/method`, `/data`) use `prefetch={false}` so a missing route never logs a 404 from a viewport prefetch; switch it back once those pages exist.
- Text from data is rendered as plain text; external links use `rel="noopener noreferrer"`.
