import type { Metadata } from "next";
import { ButtonLink, Icon, PageHero } from "@/components/ui";
import { BriefSection, CloseSection, DataSection, PillarsSection, PresetsSection, ProblemSection, WhySection } from "@/components/landing/Sections";
import { dataset } from "@/components/landing/data";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "HALO · Where the evidence runs out" },
  alternates: { canonical: "/" },
  description:
    "In microgravity, a flame becomes a halo. HALO turns NASA's microgravity fire data into a one-page fire brief for your habitat.",
};

const fmt = new Intl.NumberFormat("en-US");

export default function Home() {
  return (
    <main className="flex flex-col">
      <PageHero
        size="cinematic"
        visual="orb"
        titleId="hero-title"
        eyebrow="Habitat Assessment from Low-gravity Observations"
        title="Where the evidence runs out."
        lede="In microgravity, a flame becomes a halo. HALO turns NASA's microgravity fire data into a one-page fire brief for your habitat."
        actions={
          <>
            <ButtonLink href="/build" size="lg" iconEnd={<Icon name="arrowRight" size={18} />}>
              Build a brief
            </ButtonLink>
            <ButtonLink href="/findings" size="lg" variant="secondary" prefetch={false}>
              See the findings
            </ButtonLink>
          </>
        }
        meta={
          <p className="font-mono text-[0.8125rem] text-fg-2 tabular-nums">
            {dataset.investigations} NASA investigations · {fmt.format(dataset.totalRows)} test rows · every number cited
          </p>
        }
      />
      <WhySection />
      <ProblemSection />
      <BriefSection />
      <PillarsSection />
      <DataSection />
      <PresetsSection />
      <CloseSection />
    </main>
  );
}
