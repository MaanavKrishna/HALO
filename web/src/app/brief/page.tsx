import type { Metadata } from "next";
import { Suspense } from "react";
import { AftermathCard } from "@/components/brief/AftermathCard";
import { BriefHeader } from "@/components/brief/BriefHeader";
import { CitationList } from "@/components/brief/CitationList";
import { CoolFlameNote } from "@/components/brief/CoolFlameNote";
import { DetectionCard } from "@/components/brief/DetectionCard";
import { EarthCard } from "@/components/brief/EarthCard";
import { EvidenceSection } from "@/components/brief/EvidenceSection";
import { ExplainPanel } from "@/components/brief/ExplainPanel";
import { ExtinctionCard } from "@/components/brief/ExtinctionCard";
import { FlagList } from "@/components/brief/FlagList";
import { NextTestCard } from "@/components/brief/NextTestCard";
import { RankedList } from "@/components/brief/RankedList";
import { SectionBoundary } from "@/components/brief/SectionBoundary";
import { HALO_DATA } from "@/lib/data/load";
import { buildBrief } from "@/lib/engine/brief";
import { queryToHabitat } from "@/lib/engine/url";
import "./brief.css";
import "./print.css";

export const metadata: Metadata = {
  title: "Fire Brief",
  description: "A cited fire-safety evidence brief for a habitat atmosphere, from NASA microgravity combustion data.",
  alternates: { canonical: "/brief" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function BriefPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="brief w-full">
      <Suspense fallback={<BriefSkeleton />}>
        <BriefBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function toQuery(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === "string") q.set(k, first);
  }
  return q;
}

async function BriefBody({ searchParams }: { searchParams: SearchParams }) {
  const { habitat, notices } = queryToHabitat(toQuery(await searchParams));
  const brief = buildBrief(habitat, HALO_DATA, notices);

  // Each section has its own boundary, so one failing card leaves the rest of the brief intact.
  return (
    <article aria-label={`Fire Brief for ${habitat.name}`}>
      <Part title="Brief header">
        <BriefHeader brief={brief} />
      </Part>
      <div className="container-page">
      <Part title="What to know first">
        <FlagList brief={brief} />
      </Part>
      <Part title="Where the evidence sits">
        <EvidenceSection brief={brief} />
      </Part>
      <Part title="Most relevant investigations">
        <RankedList brief={brief} />
      </Part>
      <Part title="Would your smoke detector notice?">
        <DetectionCard brief={brief} />
      </Part>
      <Part title="Will it go out on its own? (liquid droplet fuels)">
        <ExtinctionCard brief={brief} />
      </Part>
      <Part title="If a fire grows: the aftermath">
        <AftermathCard brief={brief} />
      </Part>
      {brief.habitat.liquids && (
        <Part title="Cool flames">
          <CoolFlameNote brief={brief} />
        </Part>
      )}
      <Part title="The test that would help most">
        <NextTestCard brief={brief} />
      </Part>
      <Part title="In plain words">
        <ExplainPanel brief={brief} />
      </Part>
      <Part title="Back on Earth">
        <EarthCard brief={brief} />
      </Part>
      <Part title="Sources">
        <CitationList brief={brief} />
      </Part>

      <footer className="brief-disclaimer flex flex-col gap-2 border-t border-line-strong py-12 sm:py-16">
        <p className="type-title text-fg">HALO summarizes published NASA test evidence. It is not a safety certification.</p>
        <p className="type-body-s max-w-[70ch] text-fg-2">
          Grades describe how close tested conditions are to this habitat, not whether the habitat is acceptable. Data
          built {HALO_DATA.manifest.builtAt.slice(0, 10)} from NASA Physical Sciences Informatics.
        </p>
      </footer>
      </div>
    </article>
  );
}

/**
 * One brief section: an error boundary with its own Suspense boundary inside,
 * so a server-side throw in one card is contained to that card.
 */
function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SectionBoundary title={title}>
      <Suspense fallback={null}>{children}</Suspense>
    </SectionBoundary>
  );
}

function BriefSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the fire brief">
      <div className="theater-well border-b border-line">
        <div className="container-page grid animate-pulse gap-10 pb-16 pt-14 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <div className="h-3 w-28 rounded-full bg-surface-2" />
            <div className="h-16 w-2/3 max-w-xl rounded-[var(--radius-md)] bg-surface-2" />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-surface-1" />
              ))}
            </div>
          </div>
          <div className="mx-auto aspect-square w-full max-w-[17rem] rounded-full border border-line" />
        </div>
      </div>
      <div className="container-page py-16">
        <div className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-surface-2 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
