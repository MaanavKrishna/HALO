import type { Metadata } from "next";
import { Suspense } from "react";
import { AftermathCard } from "@/components/brief/AftermathCard";
import { BriefHeader } from "@/components/brief/BriefHeader";
import { CitationList } from "@/components/brief/CitationList";
import { CoolFlameNote } from "@/components/brief/CoolFlameNote";
import { DetectionCard } from "@/components/brief/DetectionCard";
import { EarthCard } from "@/components/brief/EarthCard";
import { EvidenceSection } from "@/components/brief/EvidenceSection";
import { ExplainPanel } from "@/components/brief/ExplainStub";
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
  title: "Fire Brief · HALO",
  description: "A cited fire-safety evidence brief for a habitat atmosphere, from NASA microgravity combustion data.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function BriefPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="brief mx-auto w-full max-w-6xl px-5 sm:px-8">
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

      <footer className="brief-disclaimer border-t-2 border-ink py-8">
        <p className="font-semibold">HALO summarizes published NASA test evidence. It is not a safety certification.</p>
        <p className="mt-1.5 text-sm text-muted">
          Grades describe how close tested conditions are to this habitat, not whether the habitat is acceptable. Data
          built {HALO_DATA.manifest.builtAt.slice(0, 10)} from NASA Physical Sciences Informatics.
        </p>
      </footer>
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
    <div aria-busy="true" aria-label="Loading the fire brief" className="animate-pulse pb-16 pt-12">
      <div className="h-3 w-24 rounded bg-rule" />
      <div className="mt-6 h-14 w-2/3 max-w-xl rounded bg-rule" />
      <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded bg-rule/70" />
        ))}
      </div>
      <div className="mt-14 h-72 rounded-lg bg-rule/50" />
    </div>
  );
}
