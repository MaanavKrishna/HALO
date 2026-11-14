import type { ReactNode } from "react";
import "@/components/content/content.css";
import { Article, Callout, PageHero, SiChip, Stat, StatGroup, TBody, THead, TableFrame, Td, Th, Tr } from "@/components/ui";
import evalResult from "@/data/eval.json";
import { HALO_DATA } from "@/lib/data/load";
import { SI_MODEL } from "@/lib/si/prompt";
import { CHALLENGE_URL, DISCLAIMER, REPO_URL, SITE_EXPANSION, TAGLINE, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "About",
  description:
    "What HALO is, how it answers NASA Space Apps 2026 Flame in Freefall, how SI is used at build time and at run time, and its licence and acknowledgements.",
  path: "/about",
});

const TOC = [
  { id: "what", label: "What HALO is" },
  { id: "challenge", label: "The challenge" },
  { id: "team", label: "Team" },
  { id: "si", label: "Use of SI" },
  { id: "license", label: "Licence" },
  { id: "acknowledgements", label: "Acknowledgements" },
] as const;

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default function AboutPage() {
  const { investigations, summaries } = HALO_DATA;
  const buildModels = [...new Set(Object.values(summaries).map((s) => s.model))];
  const nSummaries = Object.keys(summaries).length;
  const reviewed = Object.values(summaries).filter((s) => !s.needsReview).length;
  const evalPct = evalResult.total ? Math.round((evalResult.passed / evalResult.total) * 100) : 0;
  const evalDate = evalResult.runAt.slice(0, 10);

  const goals: Array<{ goal: string; answer: ReactNode }> = [
    {
      goal: "Find the investigations most relevant to crew habitats",
      answer: (
        <>
          A transparent weighted ranking of all {investigations.length} investigations for the habitat you enter, every score part
          shown. See the <a href="/method#ranking">ranking method</a>.
        </>
      ),
    },
    {
      goal: "Use the data for predictive flammability modelling",
      answer: (
        <>
          Evidence distance from your atmosphere to every eligible test, graded per fuel class, and a bootstrapped droplet
          self-extinction model fitted to FLEX. See the <a href="/method#distance">method</a>.
        </>
      ),
    },
    {
      goal: "Inform next-generation fire-safety equipment",
      answer: (
        <>
          A smoke-detector blind-spot analysis from SAME flight runs, with a sensor what-if, and a computed next test to fly. See
          the <a href="/findings">findings</a>.
        </>
      ),
    },
  ];

  return (
    <main>
      <PageHero
        titleId="about-title"
        eyebrow="About · NASA Space Apps 2026"
        title="Built for Flame in Freefall"
        lede={TAGLINE}
        visual="orb"
      />
      <Article toc={TOC}>
        <h2 id="what">What HALO is</h2>
        <p>
          <strong>HALO</strong> ({SITE_EXPANSION}) takes one habitat, its oxygen, pressure, airflow, cabin materials and smoke
          detectors, and returns one cited <strong>Fire Brief</strong>: how close NASA has tested to that atmosphere, where the
          evidence stops, what a detector would likely miss, and which test should fly next.
        </p>
        <p>
          It reads the {investigations.length} combustion investigations in NASA’s Physical Sciences Informatics repository. Every
          number is computed by deterministic code and carries its provenance and source. Grades describe evidence coverage, not
          safety: HALO summarizes published NASA test evidence and is not a safety certification.
        </p>

        <h2 id="challenge">The challenge</h2>
        <p>
          HALO is an entry to the NASA Space Apps Challenge 2026,{" "}
          <ExtLink href={CHALLENGE_URL}>Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data</ExtLink>.
          In Space Apps, “SI” (Super Intelligence) is the challenge’s word for AI. The challenge asks for a tool that summarizes,
          ranks and interprets the PSI combustion investigations for habitat and equipment designers. HALO answers its three goals
          with one input and one answer:
        </p>
        <TableFrame caption="Challenge goals and how HALO answers them">
          <THead>
            <Tr>
              <Th>Goal</Th>
              <Th>How HALO answers it</Th>
            </Tr>
          </THead>
          <TBody>
            {goals.map((g) => (
              <Tr key={g.goal}>
                <Td className="min-w-[11rem] font-medium text-fg">{g.goal}</Td>
                <Td className="min-w-[16rem]">{g.answer}</Td>
              </Tr>
            ))}
          </TBody>
        </TableFrame>

        <h2 id="team">Team</h2>
        <p>
          <strong>Maanav Krishna</strong>: data pipeline, engine, models, interface and writing. Source on{" "}
          <ExtLink href={REPO_URL}>GitHub</ExtLink>.
        </p>

        <h2 id="si">Use of SI</h2>
        <p>
          Numbers come from code; SI only writes words over facts that code has already computed. Every SI-written sentence in
          HALO carries the <SiChip /> chip.
        </p>
        <h3>At build time</h3>
        <p>
          An LLM (<code>{buildModels.join(", ")}</code>) wrote a short summary and habitat note for each of the {nSummaries}{" "}
          investigations from its PSI record only. A validator checks every answer: hazard tags from a closed vocabulary, quotes
          that must appear word for word in the source, no number that the source does not contain, and no “safe” or “unsafe”.
          The author then read all {nSummaries} against PSI; {reviewed} are shown, and any entry flagged for review is never shown
          as SI.
        </p>
        <h3>At run time</h3>
        <p>
          The brief’s optional “Explain” panel asks <code>{SI_MODEL}</code> to restate the brief in plain words. The server
          rebuilds the brief itself, sends only its facts, and replaces the answer with a code-written fallback if it contains any
          number that is not a fact value, a verdict word, or a trace of its instructions. Live calls are rate-limited and can be
          switched off.
        </p>
        <StatGroup className="content-list">
          <Stat
            size="lg"
            label="Explain eval pass rate"
            value={evalPct}
            unit="%"
            detail={`${evalResult.passed} of ${evalResult.total} questions, ${evalDate}`}
          />
          <Stat label="Questions" value={evalResult.total} detail="Across the habitat presets" />
          <Stat label="Model" value={<span className="text-base tracking-normal">{evalResult.model}</span>} />
        </StatGroup>
        <p className="type-body-s text-fg-3">
          A question passes when the live answer survives every check and cites the facts a correct answer needs.
        </p>
        <h3>In development</h3>
        <p>
          An LLM coding assistant helped write code; all data processing, models and copy were reviewed by the author.
        </p>

        <h2 id="license">Licence</h2>
        <p>
          HALO’s code is released under the <ExtLink href={`${REPO_URL}/blob/main/LICENSE`}>Apache License 2.0</ExtLink>, with
          attribution in <ExtLink href={`${REPO_URL}/blob/main/NOTICE`}>NOTICE</ExtLink>. The NASA PSI data is CC0 1.0 and is
          cited by dataset DOI on the <a href="/data#sources">data page</a>. The Inter typeface is used under the SIL Open Font
          License 1.1.
        </p>

        <h2 id="acknowledgements">Acknowledgements</h2>
        <ul>
          <li>NASA Physical Sciences Informatics, for curating and openly releasing the combustion data.</li>
          <li>The NASA combustion researchers behind the investigations HALO draws on, and the Saffire team’s published reports.</li>
          <li>The authors of the NASA Space Apps Challenge “Flame in Freefall”.</li>
        </ul>
        <Callout title="Not endorsed">{DISCLAIMER}</Callout>
      </Article>
    </main>
  );
}
