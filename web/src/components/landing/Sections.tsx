import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ButtonLink,
  Card,
  GradeBadge,
  GridLines,
  Icon,
  ProvenanceBadge,
  Reveal,
  RingsGraphic,
  SiChip,
  Stat,
  StatGroup,
  cx,
} from "@/components/ui";
import { CHALLENGE_URL } from "@/components/ui/site";
import type { Provenance } from "@/lib/engine/types";
import { MiniBrief } from "./MiniBrief";
import { LANDING_HEADINGS } from "./headings";
import { dataset, doiUrl, pillars, presets, problem, sourceUrl } from "./data";
import { FIRE_HISTORY } from "./references";

const fmt = new Intl.NumberFormat("en-US");


function Section({
  id,
  children,
  className,
}: {
  id: keyof typeof LANDING_HEADINGS;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cx("section-y border-t border-line", className)}>
      <div className="container-wide">{children}</div>
    </section>
  );
}

function H2({ id, className }: { id: keyof typeof LANDING_HEADINGS; className?: string }) {
  return (
    <h2 id={`${id}-title`} className={cx("type-display-m max-w-[20ch] text-fg", className)}>
      {LANDING_HEADINGS[id]}
    </h2>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
      {children}
    </a>
  );
}

// ---------------------------------------------------------------- 1b. Why it matters

export const WHY_HEADING = "Why fire safety in space matters.";

export function WhySection() {
  return (
    <section id="why" aria-labelledby="why-title" className="section-y border-t border-line">
      <div className="container-wide">
        <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
          <Reveal>
            <h2 id="why-title" className="type-display-m max-w-[20ch] text-fg">
              {WHY_HEADING}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="type-body-l max-w-[52ch] text-fg-2">
              NASA&apos;s fire-safety work focuses on prevention, detection and suppression; three spacecraft emergencies show
              why. Each left a lesson that HALO&apos;s questions start from.
            </p>
          </Reveal>
        </div>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {FIRE_HISTORY.map((f, i) => (
            <Reveal as="li" key={f.name} delay={i * 70} className="flex flex-col gap-3 border-t border-line-strong pt-6">
              <p className="font-mono text-[0.8125rem] text-fg-3 tabular-nums">{f.year}</p>
              <h3 className="type-title text-fg">{f.name}</h3>
              <p className="type-body-s text-fg-2">{f.what}</p>
              <p className="type-body-s border-l-2 border-accent-line pl-3 text-fg">{f.lesson}</p>
              <p className="type-caption mt-auto text-fg-3">
                Source: <ExtLink href={f.ref.url}>{f.ref.label}</ExtLink>
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 2. Problem

const LO = Math.floor(problem.minSolidO2 / 5) * 5;
const HI = Math.ceil(Math.max(...problem.habitats.map((h) => h.o2)) / 5) * 5 + 5;
const at = (o2: number) => `${((o2 - LO) / (HI - LO)) * 100}%`;
const TICKS = Array.from({ length: (HI - LO) / 5 + 1 }, (_, i) => LO + i * 5);
const SHORT: Record<string, string> = { iss: "ISS", moon: "Moon", artemis: "Artemis" };

function O2Strip() {
  const maxN = Math.max(...problem.strip.map((s) => s.n));
  const r = problem.richestSolid;
  const a = problem.artemis;
  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`Oxygen axis from ${LO} to ${HI}%. ${problem.solidCount} real cabin solid tests span ${problem.minSolidO2} to ${r.o2}% O2. ISS air sits at ${problem.habitats[0].o2}%, the Moon envelope at ${problem.moonWindow.o2}% and Artemis Base at ${a.o2Pct}%, ${problem.gap} O2-points beyond the richest real-solid test.`}
        className="relative pb-2"
      >
        {/* Row 1: real-solid tests as a density strip */}
        <div className="relative h-24 sm:h-28">
          <span className="type-label absolute left-0 top-0 text-fg-3">Real-solid tests</span>
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 sm:h-20">
            {/* Untested gap: from the richest real-solid test to Artemis */}
            <div
              className="landing-gap absolute inset-y-0 border-x border-[var(--crit-line)] bg-crit-soft"
              style={{ left: at(r.o2), width: `calc(${at(a.o2Pct)} - ${at(r.o2)})` }}
            >
              <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.75rem] text-crit tabular-nums">
                +{problem.gap} pts
              </span>
            </div>
            {problem.strip.map((s) => (
              <span
                key={s.o2}
                className="landing-bar absolute bottom-0 w-[2px] -translate-x-1/2 rounded-full bg-fg"
                style={{ left: at(s.o2), height: `${18 + 82 * Math.sqrt(s.n / maxN)}%`, opacity: 0.35 + 0.65 * Math.sqrt(s.n / maxN) } as CSSProperties}
              />
            ))}
          </div>
        </div>
        {/* Axis */}
        <div aria-hidden="true" className="relative mt-0 h-8 border-t border-line-strong">
          {TICKS.map((t) => (
            <span key={t} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: at(t) }}>
              <span className="h-1.5 w-px bg-line-strong" />
              <span className="mt-1 font-mono text-[0.6875rem] text-fg-3 tabular-nums">{t}%</span>
            </span>
          ))}
        </div>
        {/* Row 2: habitat atmospheres */}
        <div aria-hidden="true" className="relative mt-3 h-16">
          {problem.habitats.map((h, i) => (
            <span key={h.key} className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1" style={{ left: at(h.o2) }}>
              <span
                className={cx(
                  "size-2.5 rotate-45 rounded-[1px] border-[1.5px]",
                  h.key === "artemis" ? "border-accent bg-accent shadow-[0_0_10px_var(--accent-glow)]" : "border-fg-2",
                )}
              />
              <span
                className={cx(
                  "whitespace-nowrap font-mono text-[0.75rem] tabular-nums",
                  h.key === "artemis" ? "text-accent" : "text-fg-2",
                  i === 1 && "max-sm:mt-5",
                )}
              >
                <span className="sm:hidden">{SHORT[h.key]}</span>
                <span className="hidden sm:inline">{h.name}</span> {h.o2}%
              </span>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="type-caption mt-2 text-fg-3">
        O<sub>2</sub> of every eligible real-solid test in PSI{problem.solidPressure !== null && <> (all at {problem.solidPressure} psia)</>}, against three habitat atmospheres.
      </figcaption>
    </figure>
  );
}

export function ProblemSection() {
  const r = problem.richestSolid;
  const a = problem.artemis;
  const href = sourceUrl(r.source);
  return (
    <Section id="problem">
      <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <Reveal>
          <H2 id="problem" />
        </Reveal>
        <Reveal delay={80}>
          <p className="type-body-l max-w-[52ch] text-fg-2">
            Exploration habitats lower the pressure and raise the oxygen. In the PSI test data HALO grades on, every
            real cabin material was burned in air much closer to the ISS.
            {problem.literature && (
              <>
                {" "}
                {problem.literature.sentence} <ExtLink href={problem.literature.url}>Report</ExtLink>
              </>
            )}
          </p>
        </Reveal>
      </div>

      <Reveal className="mt-14 sm:mt-20">
        <O2Strip />
      </Reveal>

      <Reveal className="mt-12">
        <StatGroup className="sm:!grid-cols-3">
          <Stat
            size="lg"
            label="Most O₂ any real cabin material burned in"
            value={r.o2}
            unit="% O₂"
            provenance={<ProvenanceBadge provenance={r.o2Src} />}
            detail={
              <>
                {r.acronym}, {r.psiId}
                {href && (
                  <>
                    {" · "}
                    <ExtLink href={href}>dataset</ExtLink>
                  </>
                )}
              </>
            }
          />
          <Stat
            size="lg"
            label="Artemis Base cabin"
            value={a.o2Pct}
            unit="% O₂"
            provenance={<ProvenanceBadge provenance="assumed" />}
            detail={<>at {a.pressurePsia} psia, HALO preset</>}
          />
          <Stat
            size="lg"
            label="Real cabin materials tested in Moon-base air"
            value={problem.moonWindow.solids}
            unit={`of ${problem.moonWindow.tests} tests`}
            provenance={<ProvenanceBadge provenance="computed" />}
            detail={
              <>
                PSI real-solid tests at ≥{problem.moonWindow.o2}% O₂, ≤{problem.moonWindow.p} psia
                {problem.literature && (
                  <>
                    . {problem.literature.missions} burned {problem.literature.runs} real solids there, outside PSI (literature)
                  </>
                )}
              </>
            }
            className="col-span-2 sm:col-span-1"
          />
        </StatGroup>
      </Reveal>
    </Section>
  );
}

// ---------------------------------------------------------------- 3. One brief

export function BriefSection() {
  return (
    <Section id="brief" className="relative overflow-hidden">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--nav-h)+4rem)] lg:self-start">
          <Reveal>
            <H2 id="brief" />
          </Reveal>
          <Reveal delay={80} className="flex flex-col gap-6">
            <p className="type-body-l text-fg-2">
              Enter an atmosphere, its cabin materials and its smoke detectors. HALO measures how far the nearest NASA
              test sits, flags what was never tested, and cites the dataset behind every number.
            </p>
            <p className="type-body text-fg-2">
              This preview is the real engine output for the Artemis Base preset, computed when the site was built.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/build" iconEnd={<Icon name="arrowRight" size={18} />}>
                Build a brief
              </ButtonLink>
            </div>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <MiniBrief />
        </Reveal>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- 4. Pillars

export function PillarsSection() {
  const k = pillars.kapton;
  const n = pillars.nextTest;
  const items: { title: string; body: ReactNode; proof: ReactNode; href: string; cta: string }[] = [
    {
      title: "Find the investigations that matter",
      body: `Each brief ranks the ${dataset.investigations} PSI investigations by how close they ran to your atmosphere, your fuels and your hazards.`,
      proof: (
        <>
          Top match for Artemis Base: <span className="font-mono text-fg">{pillars.topInvestigation.acronym}</span>,{" "}
          {pillars.topInvestigation.title}.
        </>
      ),
      href: `/explore/${pillars.topInvestigation.psiId}`,
      cta: "Explore investigations",
    },
    {
      title: "Give modelers data they can cite",
      body: "Test conditions carry their provenance and dataset DOI, and HALO points to the test that would close the biggest gap.",
      proof: n ? (
        <>
          Suggested next test: a {n.fuel} at <span className="font-mono text-fg">{n.o2}% O₂, {n.p} psia</span>
          {n.before !== null && n.after !== null && (
            <>
              , bringing Artemis Base&apos;s nearest {n.fuel} test closer{" "}
              <span className="text-fg-3">
                (evidence distance <span className="font-mono">{n.before}</span> to <span className="font-mono">{n.after}</span>)
              </span>
            </>
          )}
          .
        </>
      ) : (
        "Every test row lists where its O₂ and pressure came from."
      ),
      href: "/method",
      cta: "Read the method",
    },
    {
      title: "Point next-generation equipment",
      body: "Smoke detector runs from SAME show which cabin materials an ISS-style smoke detector would likely miss, and what a second kind of detector adds.",
      proof: (
        <>
          Add an ionization detector and <span className="font-mono text-fg">{k.ionCaught} of {k.ionRuns}</span> Kapton runs
          would trip an alarm{" "}
          <span className="text-fg-3">
            (threshold set from cotton Lampwick smoke; SAME, ISS air: {k.ambientO2}% O₂, {k.ambientAtm} atm)
          </span>
          .
        </>
      ),
      href: "/findings",
      cta: "See the findings",
    },
  ];

  return (
    <Section id="pillars">
      <Reveal>
        <H2 id="pillars" />
      </Reveal>

      {/* Hero proof: the detector blind spot */}
      <Reveal className="mt-12 sm:mt-16">
        <div
          className="theater-well relative isolate overflow-hidden rounded-[var(--radius-xl)] border border-line p-6 text-fg [--well-x:80%] [--well-y:50%] sm:p-10 lg:p-12"
        >
          <GridLines corners />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
            <div className="flex flex-col gap-5">
              <p className="type-label text-fg-3">Detector blind spot · Kapton wire insulation</p>
              <p className="flex items-baseline gap-3 text-fg">
                <span className="type-data-l">{k.missed}</span>
                <span className="font-mono text-xl text-fg-2">of {k.runs}</span>
              </p>
              <p className="type-title max-w-[28ch] text-fg">
                Kapton smoke runs would likely be missed by an ISS-style smoke detector.
              </p>
              <p className="type-body-s max-w-[44ch] text-fg-2">
                Precisely: below HALO&apos;s {k.scatterV} V forward-scatter alarm proxy for a photoelectric detector.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-2">
                <ProvenanceBadge provenance="measured" />
                <span>
                  SAME
                  {k.source.doi && (
                    <>
                      {" · "}
                      <ExtLink href={doiUrl(k.source.doi)}>dataset</ExtLink>
                    </>
                  )}
                </span>
              </div>
              <p className="type-caption max-w-[48ch] text-fg-3">
                SAME ran at ISS air ({k.ambientO2}% O₂, {k.ambientAtm} atm); smoke behavior at habitat atmosphere is untested.
              </p>
            </div>
            <div className="w-full max-w-[26rem] lg:justify-self-end">
              <ol
                aria-label={`${k.runs} Kapton runs: ${k.missed} below the ${k.scatterV} V scatter proxy, ${k.runs - k.missed} at or above it`}
                className="landing-runs grid grid-cols-7 gap-1.5"
              >
                {Array.from({ length: k.runs }, (_, i) => {
                  const missed = i < k.missed;
                  return (
                    <li
                      key={i}
                      aria-hidden="true"
                      className={cx(
                        "aspect-square rounded-[var(--radius-xs)] border",
                        missed ? "border-[var(--crit-line)] bg-crit-soft" : "border-line-strong bg-surface-2",
                      )}
                      style={{ ["--i" as string]: i }}
                    >
                      {missed && <span className="block size-full scale-[0.3] rounded-[1px] bg-crit" />}
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[0.75rem] text-fg-2">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-crit" /> Below {k.scatterV} V proxy
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 rounded-[2px] border border-line-strong bg-surface-2" /> At or above proxy
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        {items.map((it, i) => (
          <Reveal as="li" key={it.title} delay={i * 70} className="flex flex-col gap-4 border-t border-line-strong pt-6">
            <h3 className="type-title text-fg">{it.title}</h3>
            <p className="type-body text-fg-2">{it.body}</p>
            <p className="type-body-s border-l-2 border-accent-line pl-3 text-fg-2">{it.proof}</p>
            <Link href={it.href} className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              {it.cta}
              <Icon name="arrowRight" size={16} />
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------- 5. Data

const PROVENANCE: { p: Provenance; text: string }[] = [
  { p: "measured", text: "Recorded by the experiment's own instruments." },
  { p: "inferred", text: "Derived from test documentation, not a logged channel." },
  { p: "assumed", text: "Not recorded; a stated assumption, such as cabin air." },
  { p: "literature", text: "Taken from a published paper." },
  { p: "computed", text: "Arithmetic on the data, such as counts and how far the nearest test sits." },
  { p: "model", text: "From a model fitted to the data: the FLEX droplet extinction model." },
];

export function DataSection() {
  return (
    <Section id="data">
      <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <Reveal>
          <H2 id="data" />
        </Reveal>
        <Reveal delay={80} className="flex flex-col gap-6">
          <p className="type-body-l max-w-[52ch] text-fg-2">
            HALO is built on NASA Physical Sciences Informatics: microgravity combustion investigations flown on the ISS,
            joined into one table of test conditions.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/data" variant="secondary">
              How the data was built
            </ButtonLink>
            <ButtonLink href="/explore" variant="ghost" iconEnd={<Icon name="arrowRight" size={16} />}>
              Explore investigations
            </ButtonLink>
          </div>
        </Reveal>
      </div>
      <Reveal className="mt-12 sm:mt-16">
        <StatGroup className="lg:!grid-cols-4">
          <Stat size="lg" label="PSI investigations" value={dataset.investigations} />
          <Stat size="lg" label="Test rows ingested" value={fmt.format(dataset.totalRows)} />
          <Stat size="lg" label="Rows eligible for coverage" value={fmt.format(dataset.eligibleRows)} />
          <Stat size="lg" label="Unique publication DOIs" value={fmt.format(dataset.publications)} />
        </StatGroup>
        <p className="type-caption mt-3 font-mono text-fg-3">Dataset build {dataset.builtAt}</p>
      </Reveal>

      <Reveal className="mt-14">
        <h3 className="type-title text-fg">Provenance, on every number</h3>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {PROVENANCE.map((x) => (
            <div key={x.p} className="flex flex-col gap-2 bg-surface-1 p-5">
              <dt>
                <ProvenanceBadge provenance={x.p} />
              </dt>
              <dd className="type-body-s text-fg-2">{x.text}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-2 bg-surface-1 p-5">
            <dt>
              <SiChip />
            </dt>
            <dd className="type-body-s text-fg-2">Written by Super Intelligence from the cited facts; it never adds a number of its own.</dd>
          </div>
        </dl>
      </Reveal>
    </Section>
  );
}

// ---------------------------------------------------------------- 6. Presets

export function PresetsSection() {
  return (
    <Section id="presets">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <H2 id="presets" />
        </Reveal>
        <Reveal delay={60}>
          <p className="type-body max-w-[40ch] text-fg-2">From ISS air to a pure-oxygen suit. Each opens its full brief.</p>
        </Reveal>
      </div>
      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {presets.map((p, i) => (
          <Reveal as="li" key={p.key} delay={i * 60} className="flex">
            <Card interactive padding="none" className="flex w-full flex-col">
              <div className="flex items-start justify-between gap-3 p-5 pb-4">
                <h3 className="type-title text-fg">
                  <Link href={p.href} className="focus-visible:outline-none">
                    {p.name}
                  </Link>
                </h3>
                <GradeBadge grade={p.grade} size="md" />
              </div>
              <dl className="mt-auto grid grid-cols-3 border-t border-line font-mono text-[0.75rem] tabular-nums">
                {[
                  ["O₂", `${p.o2}%`],
                  ["P", `${p.p}`],
                  ["Flow", `${p.flow}`],
                ].map(([l, v]) => (
                  <div key={l} className="flex flex-col gap-0.5 border-r border-line px-3 py-3 last:border-r-0 first:pl-5">
                    <dt className="text-fg-3">{l}</dt>
                    <dd className="text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Reveal>
        ))}
      </ul>
      <p className="type-caption mt-4 font-mono text-fg-3">Pressure in psia, flow in cm/s. Grade: how close the nearest NASA evidence sits.</p>
    </Section>
  );
}

// ---------------------------------------------------------------- 7. Close

export function CloseSection() {
  return (
    <section
      id="close"
      aria-labelledby="close-title"
      className="theater-well relative isolate overflow-hidden border-t border-line text-fg [--well-x:50%] [--well-y:50%]"
    >
      <GridLines />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -z-[1] w-[min(56rem,140vw)] -translate-x-1/2 -translate-y-1/2 opacity-50">
        <RingsGraphic rings={6} maskInner={0.5} spin={false} />
      </div>
      <div className="container-narrow flex flex-col items-center gap-7 py-[calc(var(--section-y)*1.2)] text-center">
        <Reveal>
          <h2 id="close-title" className="type-display-l text-fg">
            {LANDING_HEADINGS.close}
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="type-body-l mx-auto max-w-[44ch] text-fg-2">
            Set the oxygen, the pressure and what is on board. See where NASA&apos;s evidence ends for your habitat.
          </p>
        </Reveal>
        <Reveal delay={140} className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/build" size="lg">
            Build a brief
          </ButtonLink>
          <ButtonLink href="/method" size="lg" variant="secondary">
            How it works
          </ButtonLink>
        </Reveal>
        <p className="type-caption mt-6 text-fg-3">
          Built for{" "}
          <a href={CHALLENGE_URL} target="_blank" rel="noopener noreferrer" className="text-fg-2 underline underline-offset-4 hover:text-fg">
            NASA Space Apps 2026 — Flame in Freefall
          </a>
        </p>
      </div>
    </section>
  );
}
