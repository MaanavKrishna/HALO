import type { Metadata } from "next";
import { HabitatForm } from "@/components/builder/HabitatForm";
import { PageHero } from "@/components/ui";
import { HALO_DATA } from "@/lib/data/load";

export const metadata: Metadata = {
  title: "Build a brief",
  alternates: { canonical: "/build" },
  description: "Describe a habitat atmosphere, its cabin materials and detectors, and generate a cited Fire Brief.",
};

const fmt = new Intl.NumberFormat("en-US");

export default function BuildPage() {
  const investigations = HALO_DATA.investigations.length;
  const eligible = HALO_DATA.manifest.eligibleRows;
  return (
    <main className="flex flex-col">
      <PageHero
        titleId="build-title"
        eyebrow="Habitat builder"
        title="Build a HALO brief"
        lede="Pick a reference atmosphere or set your own. The brief places it against every eligible NASA microgravity fire test and cites each number."
        visual="rings"
        meta={
          <p className="font-mono text-[0.8125rem] text-fg-2 tabular-nums">
            {investigations} investigations · {fmt.format(eligible)} eligible test rows
          </p>
        }
      />
      <section aria-label="Habitat builder" className="container-wide pt-10 sm:pt-14">
        <HabitatForm />
      </section>
    </main>
  );
}
