import type { Metadata } from "next";
import { InvestigationTable } from "@/components/explore/InvestigationTable";
import { HALO_DATA } from "@/lib/data/load";
import { psiNumber } from "@/lib/explore";

export const metadata: Metadata = {
  title: "Explore the investigations | HALO",
  description: "All NASA Physical Sciences Informatics combustion investigations HALO draws on, with the atmospheres each one tested.",
};

const fmt = new Intl.NumberFormat("en-US");

export default function ExplorePage() {
  const { investigations, manifest } = HALO_DATA;
  const sorted = [...investigations].sort((a, b) => psiNumber(a.psiId) - psiNumber(b.psiId));
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <h1 className="wide text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight">Explore the investigations</h1>
      <p className="mt-3 max-w-[44rem] text-[17px] leading-snug text-muted">
        HALO covers all {investigations.length} NASA PSI combustion investigations. {fmt.format(manifest.totalRows)} test
        rows were read; the rows with a known atmosphere feed the habitat comparison. Entries with no tabulated oxygen or
        pressure are listed as not tabulated. Open one to see its objective, tested atmospheres and publications.
      </p>
      <div className="mt-8 border-t-2 border-ink pt-5">
        <InvestigationTable investigations={sorted} />
      </div>
    </main>
  );
}
