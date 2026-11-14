import type { ReactNode } from "react";
import { DOWNLOADS, downloadHref } from "@/components/content/downloads";
import "@/components/content/content.css";
import { cx, Article, Callout, Icon, PageHero, ProvenanceBadge, Stat, StatGroup, TBody, THead, TableFrame, Td, Th, Tr } from "@/components/ui";
import { doiUrl, safeUrl } from "@/lib/brief/citations";
import { HALO_DATA } from "@/lib/data/load";
import { buildBrief } from "@/lib/engine/brief";
import { PRESETS } from "@/lib/engine/presets";
import type { ConditionSource, FuelClass, Provenance } from "@/lib/engine/types";
import { psiNumber } from "@/lib/explore";
import { CHALLENGE_URL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Data",
  description:
    "The NASA Physical Sciences Informatics combustion data behind HALO: sources, provenance, eligibility rules, data-quality fixes, Saffire literature, downloads and every DOI.",
  path: "/data",
});

const TOC = [
  { id: "source", label: "Source" },
  { id: "provenance", label: "Provenance" },
  { id: "eligibility", label: "Eligibility" },
  { id: "fixes", label: "Data-quality fixes" },
  { id: "literature", label: "Saffire literature" },
  { id: "downloads", label: "Downloads" },
  { id: "sources", label: "Sources and DOIs" },
] as const;

const fmt = new Intl.NumberFormat("en-US");

const PROVENANCE: Array<{ p: Provenance; meaning: string }> = [
  { p: "measured", meaning: "Logged in the investigation's PSI data table." },
  { p: "assumed", meaning: "Not logged; taken from the experiment's documented setup, such as ISS cabin air." },
  { p: "inferred", meaning: "Derived from other recorded quantities or stated only in text." },
  { p: "literature", meaning: "Taken from a published paper or NASA technical report." },
  { p: "model", meaning: "Computed by HALO from the data: distances, rankings, the extinction model." },
  { p: "si", meaning: "Wording written by an LLM over cited facts. It never introduces a number." },
];

const CLASS_LABEL: Record<FuelClass, string> = { solid: "Real solid", solid_surrogate: "Solid surrogate", droplet: "Droplet", gas: "Gas flame" };

const FIXES: Array<[string, string]> = [
  ["The FLEX table is cp1252, not UTF-8, and several files start with a byte-order mark.", "Read as UTF-8 with BOM, falling back to cp1252."],
  ["One FLEX test reports an ambient pressure of 0 mmHg.", "Pressure set to missing, so the row is not eligible."],
  ["BRE oxygen holds Excel percent-format errors (“3400%”).", "Values over 100 are divided by 100."],
  ["Most rows of the CFI-G inverse-flame table are blank; flame-type labels mix case.", "Blank rows dropped; labels title-cased."],
  ["SPICE repeats rows exactly and logs some negative air rates.", "Duplicates dropped; negative flows set to missing."],
  ["E-FIELD repeats one row and uses blank-key continuation rows.", "Blank keys and the duplicate dropped."],
  ["Saffire-I’s PSI dates match SAME’s and predate the flight.", "Dates set to null with a note pointing to the NASA report."],
  ["BASS-II fuel names contain runs of spaces.", "Whitespace collapsed in the fuel label."],
];

function H2({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id}>{children}</h2>;
}

function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    // relative: keeps the sr-only hint inside scrolling tables (an absolute child would escape their clip).
    <a href={href} target="_blank" rel="noopener noreferrer" className={cx("relative", className)}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const bytes = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export default function DataPage() {
  const { tests, investigations, manifest, literature } = HALO_DATA;
  const invs = [...investigations].sort((a, b) => psiNumber(a.psiId) - psiNumber(b.psiId));
  const licences = new Map<string, number>();
  for (const i of investigations) licences.set(i.license, (licences.get(i.license) ?? 0) + 1);
  const cc0 = licences.get("CC0-1.0") ?? 0;
  const srcCount = (field: "o2Src" | "pSrc", v: ConditionSource) => tests.filter((t) => t[field] === v).length;
  const classes: FuelClass[] = ["solid", "solid_surrogate", "droplet", "gas"];
  const pubCount = investigations.reduce((s, i) => s + i.publications.filter((p) => p.doi).length, 0);

  // Every other source a brief can cite (NASA reports, guides, Spinoff, the challenge).
  const factSources = buildBrief({ ...PRESETS.artemis, liquids: true }, HALO_DATA).facts.map((f) => f.source);
  const others = new Map<string, string>();
  for (const s of factSources) {
    if (s.psiId) continue;
    const href = s.doi ? doiUrl(s.doi) : safeUrl(s.url);
    if (href && !others.has(href)) others.set(href, href === CHALLENGE_URL ? "NASA Space Apps 2026: Flame in Freefall challenge" : s.note && s.note.length < 90 ? s.note : s.doi ? `doi:${s.doi}` : href);
  }
  for (const r of literature) {
    const href = safeUrl(r.sourceUrl);
    if (href && !others.has(href)) others.set(href, `NASA Technical Reports Server ${href.split("/").pop()} (${r.mission})`);
  }

  return (
    <main>
      <PageHero
        titleId="data-title"
        eyebrow={`${investigations.length} investigations · ${fmt.format(manifest.totalRows)} rows · CC0`}
        title="Every number has a source"
        lede="HALO is built on NASA Physical Sciences Informatics combustion records, cleaned in reviewable code. Each value keeps a record of where it came from, and every file is downloadable."
        visual="rings"
      />
      <Article toc={TOC}>
        <H2 id="source">Source</H2>
        <p>
          The NASA Physical Sciences Informatics (PSI) repository holds the combustion experiments NASA flew on the Space Shuttle,
          the International Space Station and uncrewed cargo vehicles. HALO uses all {investigations.length} combustion
          investigations: their experiment tables, their detail records and the SAME smoke-detector workbook. {cc0} of them are
          released under CC0 1.0{investigations.length - cc0 > 0 ? `; ${investigations.length - cc0} leaves its licence field blank in PSI and is cited the same way` : ""}.
        </p>
        <StatGroup className="content-list">
          <Stat label="Investigations" value={investigations.length} />
          <Stat label="Rows read" value={fmt.format(manifest.totalRows)} />
          <Stat label="Eligible rows" value={fmt.format(manifest.eligibleRows)} />
          <Stat label="Data built" value={<span className="text-[1.5rem] tracking-[-0.02em]">{manifest.builtAt.slice(0, 10)}</span>} />
        </StatGroup>
        <p>
          A short list of Saffire results comes from NASA technical reports, because PSI does not carry the later Saffire flights.
          Those rows are marked <ProvenanceBadge provenance="literature" /> everywhere they appear.
        </p>

        <H2 id="provenance">Provenance</H2>
        <p>
          Every number HALO shows carries one of six provenance marks. The marker shape differs for each, so it still reads in
          greyscale print.
        </p>
        <TableFrame caption="Provenance vocabulary">
          <THead>
            <Tr>
              <Th>Mark</Th>
              <Th>Meaning</Th>
              <Th numeric>O2 values</Th>
              <Th numeric>Pressure values</Th>
            </Tr>
          </THead>
          <TBody>
            {PROVENANCE.map(({ p, meaning }) => {
              const cond = p === "measured" || p === "assumed" || p === "inferred";
              return (
                <Tr key={p}>
                  <Td>
                    <ProvenanceBadge provenance={p} />
                  </Td>
                  <Td className="min-w-[16rem]">{meaning}</Td>
                  <Td numeric>{cond ? fmt.format(srcCount("o2Src", p)) : <span className="text-fg-3">n/a</span>}</Td>
                  <Td numeric>{cond ? fmt.format(srcCount("pSrc", p)) : <span className="text-fg-3">n/a</span>}</Td>
                </Tr>
              );
            })}
          </TBody>
        </TableFrame>
        <p className="type-body-s text-fg-3">Counts are over the {fmt.format(tests.length)} eligible test rows.</p>

        <H2 id="eligibility">Eligibility</H2>
        <p>A row counts toward habitat coverage only if all of these hold:</p>
        <ul>
          <li>its ambient conditions are valid: inverse flames issue oxygen from the burner, so their O2 is not the cabin’s;</li>
          <li>it is not ACME Flame Design;</li>
          <li>it is not SAME or SAME-R, which heat solids without a flame and are used as detection data;</li>
          <li>O2 and pressure are both present, and O2 is at most 100%.</li>
        </ul>
        <TableFrame caption="Eligible rows by fuel class">
          <THead>
            <Tr>
              <Th>Fuel class</Th>
              <Th numeric>Rows</Th>
              <Th>Investigations</Th>
            </Tr>
          </THead>
          <TBody>
            {classes.map((c) => {
              const rows = tests.filter((t) => t.fuelClass === c);
              return (
                <Tr key={c}>
                  <Td className="whitespace-nowrap font-medium text-fg">{CLASS_LABEL[c]}</Td>
                  <Td numeric>{fmt.format(rows.length)}</Td>
                  <Td>{[...new Set(rows.map((t) => t.acronym))].join(", ")}</Td>
                </Tr>
              );
            })}
          </TBody>
        </TableFrame>

        <H2 id="fixes">Data-quality fixes</H2>
        <p>
          The raw PSI tables are kept unmodified in the repository. Every fix is applied in the pipeline’s code, so it can be
          reviewed and reverted.
        </p>
        <TableFrame caption="Data-quality fixes">
          <THead>
            <Tr>
              <Th>Issue</Th>
              <Th>Fix</Th>
            </Tr>
          </THead>
          <TBody>
            {FIXES.map(([issue, fix]) => (
              <Tr key={issue}>
                <Td className="min-w-[14rem]">{issue}</Td>
                <Td className="min-w-[12rem]">{fix}</Td>
              </Tr>
            ))}
          </TBody>
        </TableFrame>

        <H2 id="literature">Saffire literature</H2>
        <p>
          Saffire burned large samples inside cargo vehicles after they left the station. These {literature.length} points are
          transcribed from NASA reports <ProvenanceBadge provenance="literature" />; blank cells were not reported.
        </p>
        <TableFrame caption="Saffire literature points" maxHeight="34rem">
          <THead>
            <Tr>
              <Th>Sample</Th>
              <Th>Material</Th>
              <Th numeric>O2 %</Th>
              <Th numeric>psia</Th>
              <Th numeric>Spread mm/s</Th>
              <Th>Report</Th>
            </Tr>
          </THead>
          <TBody>
            {literature.map((r) => {
              const href = safeUrl(r.sourceUrl);
              return (
                <Tr key={r.sampleId}>
                  <Td className="whitespace-nowrap font-mono text-[0.8125rem] text-fg">
                    {r.mission} {r.sampleId}
                  </Td>
                  <Td className="min-w-[14rem]">{r.material}</Td>
                  <Td numeric>{r.o2Pct ?? "–"}</Td>
                  <Td numeric>{r.pressurePsia ?? "–"}</Td>
                  <Td numeric>{r.spreadRateMmS ?? "–"}</Td>
                  <Td className="whitespace-nowrap">
                    {href ? <ExtLink href={href}>NTRS {href.split("/").pop()}</ExtLink> : "–"}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </TableFrame>

        <H2 id="downloads">Downloads</H2>
        <p>
          The JSON files the app is built from, served byte for byte. The {DOWNLOADS.filter((d) => d.sha256).length} files the pipeline writes carry the sha256 it
          recorded in <code>manifest.json</code>, so you can check a download against the build.
        </p>
        <ul className="content-list flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1">
          {DOWNLOADS.map((d) => (
            <li key={d.file} className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <a href={downloadHref(d.file)} download={d.file} className="inline-flex items-center gap-2 self-start font-mono text-[0.9375rem]">
                  {d.file}
                  <Icon name="arrowRight" size={14} className="rotate-90" />
                </a>
                <span className="text-sm leading-snug text-fg-2">{d.what}</span>
              </div>
              <span className="flex shrink-0 flex-col font-mono text-[0.8125rem] text-fg-3 sm:items-end">
                <span>{bytes(d.bytes)}</span>
                {d.sha256 && <span title={`sha256 ${d.sha256}`}>sha256 {d.sha256.slice(0, 12)}…</span>}
              </span>
            </li>
          ))}
        </ul>

        <H2 id="sources">Sources and DOIs</H2>
        <p>
          HALO cites each investigation by its PSI dataset DOI. The {fmt.format(pubCount)} publication DOIs PSI lists for them
          follow, grouped by investigation.
        </p>
        <TableFrame caption="PSI dataset DOIs">
          <THead>
            <Tr>
              <Th>PSI</Th>
              <Th>Investigation</Th>
              <Th>Dataset DOI</Th>
              <Th>Licence</Th>
            </Tr>
          </THead>
          <TBody>
            {invs.map((i) => {
              const doi = manifest.psiDatasetDois[i.psiId] ?? i.datasetDoi;
              return (
                <Tr key={i.psiId}>
                  <Td className="whitespace-nowrap font-mono text-[0.8125rem]">{i.psiId}</Td>
                  <Td className="min-w-[10rem]">
                    <a href={`/explore/${i.psiId}`}>{i.acronym}</a>
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-[0.8125rem]">
                    <ExtLink href={doiUrl(doi)}>{doi}</ExtLink>
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-[0.8125rem] text-fg-3">{i.license}</Td>
                </Tr>
              );
            })}
          </TBody>
        </TableFrame>

        <h3>Publications by investigation</h3>
        <div className="content-block flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1">
          {invs
            .filter((i) => i.publications.some((p) => p.doi))
            .map((i) => {
              const pubs = i.publications.filter((p) => p.doi);
              return (
                <details key={i.psiId} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[0.9375rem] text-fg hover:bg-surface-2 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="font-mono text-[0.8125rem] text-fg-3">{i.psiId}</span> {i.acronym}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-[0.8125rem] text-fg-3">{pubs.length}</span>
                      <Icon name="plus" size={16} className="text-fg-3 transition-transform duration-[var(--dur-fast)] group-open:rotate-45" />
                    </span>
                  </summary>
                  <ol className="content-list flex flex-col gap-2.5 px-4 pb-4 pt-1 text-sm sm:px-5">
                    {pubs.map((p) => (
                      <li key={p.doi} className="flex flex-col gap-0.5">
                        <span className="text-fg-2">
                          {p.title}
                          {p.year ? <span className="text-fg-3"> ({p.year})</span> : null}
                        </span>
                        <ExtLink href={doiUrl(p.doi as string)} className="self-start font-mono text-[0.8125rem] [overflow-wrap:anywhere]">
                          doi:{p.doi}
                        </ExtLink>
                      </li>
                    ))}
                  </ol>
                </details>
              );
            })}
        </div>

        <h3>Reports and other sources</h3>
        <ul>
          {[...others.entries()].map(([href, label]) => (
            <li key={href} className="[overflow-wrap:anywhere]">
              <ExtLink href={href}>{label}</ExtLink>
            </li>
          ))}
        </ul>
        <Callout title="Licence">
          PSI data is released under CC0 1.0 and cited here by dataset DOI. HALO is not affiliated with or endorsed by NASA.
        </Callout>
      </Article>
    </main>
  );
}
