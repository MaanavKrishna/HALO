import type { Metadata } from "next";
import { ButtonLink, Icon, PageHero } from "@/components/ui";
import { BriefSection, CloseSection, CoverageSection, DataSection, PillarsSection, PresetsSection, ProblemSection, WhySection } from "@/components/landing/Sections";
import { problem } from "@/components/landing/data";
import { TAGLINE } from "@/lib/site";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "HALO · Where the evidence runs out" },
  alternates: { canonical: "/" },
  description: TAGLINE,
};

const { artemis, richestSolid, moonWindow } = problem;

export default function Home() {
  return (
    <main className="flex flex-col">
      <PageHero
        size="cinematic"
        visual="orb"
        titleId="hero-title"
        eyebrow="Habitat Assessment from Low-gravity Observations"
        title="Where the evidence runs out."
        lede={
          <>
            NASA&apos;s recommended exploration atmosphere for Moon habitats is about {artemis.o2Pct}% O<sub>2</sub> at{" "}
            {artemis.pressurePsia} psia. In NASA&apos;s PSI archive, no solid-material test row that records its oxygen is above{" "}
            {richestSolid.o2}%. HALO shows what that gap means for your habitat.
          </>
        }
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
            {artemis.o2Pct}% planned · {richestSolid.o2}% tested · {moonWindow.solids} real-solid tests in the Moon window
          </p>
        }
      />
      <WhySection />
      <ProblemSection />
      <CoverageSection />
      <BriefSection />
      <PillarsSection />
      <DataSection />
      <PresetsSection />
      <CloseSection />
    </main>
  );
}
