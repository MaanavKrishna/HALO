import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { ExploreBrowser } from "@/components/explore/ExploreBrowser";
import { HALO_DATA } from "@/lib/data/load";
import { investigationRows } from "@/lib/data/schema";
import { psiNumber, sensorMap } from "@/lib/explore";

export const metadata: Metadata = {
  title: "Explore the investigations",
  alternates: { canonical: "/explore" },
  description: "All NASA Physical Sciences Informatics combustion investigations HALO draws on, with the atmospheres each one tested.",
};

const fmt = new Intl.NumberFormat("en-US");

export default function ExplorePage() {
  const { investigations, manifest } = HALO_DATA;
  const sorted = [...investigationRows(HALO_DATA)].sort((a, b) => psiNumber(a.psiId) - psiNumber(b.psiId));
  const sensors = sensorMap(HALO_DATA.summaries);
  const pubs = investigations.reduce((s, i) => s + i.publications.length, 0);
  const readouts: Array<[string, string]> = [
    ["Investigations", fmt.format(investigations.length)],
    ["Test rows read", fmt.format(manifest.totalRows)],
    ["With a known atmosphere", fmt.format(manifest.eligibleRows)],
    ["Publications", fmt.format(pubs)],
  ];
  return (
    <main>
      <PageHero
        titleId="explore-title"
        visual="rings"
        eyebrow="NASA Physical Sciences Informatics · Combustion"
        title={<>{investigations.length} investigations. Every one cited.</>}
        lede="Every microgravity combustion investigation HALO reads, with the atmospheres it tested, the hardware it flew on and the papers it produced. Open one for its full dossier."
        meta={
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {readouts.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <dt className="type-label text-fg-3">{k}</dt>
                <dd className="font-mono text-xl tracking-[-0.02em] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        }
      />
      <section aria-label="Investigation list" className="container-wide pb-24 pt-10 sm:pt-14">
        <ExploreBrowser investigations={sorted} sensors={sensors} />
      </section>
    </main>
  );
}
