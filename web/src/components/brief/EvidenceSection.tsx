import { Callout } from "@/components/ui/Callout";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { TBody, THead, TableFrame, Td, Th, Tr } from "@/components/ui/Table";
import { briefContext } from "@/lib/brief/context";
import { CLASS_LABEL, CLASS_ORDER, gradeOf, nearId } from "@/lib/brief/pageFacts";
import { flowId, nearFlowId } from "@/lib/engine/flow";
import { HALO_DATA } from "@/lib/data/load";
import type { Brief, FuelClass } from "@/lib/engine/types";
import { GRADE_RINGS } from "@/lib/engine/grade";
import { PRESETS } from "@/lib/engine/presets";
import { HaloChart, type ChartPoint, type HaloChartProps } from "./charts/HaloChart";
import { Y_MAX } from "./charts/haloAxes";
import { CiteMark, Eyebrow, Num, Section } from "./parts";

const CLASS_INDEX: Record<FuelClass, number> = { solid: 0, solid_surrogate: 1, droplet: 2, gas: 3 };

function chartProps(brief: Brief): HaloChartProps {
  const ctx = briefContext(brief);
  const val = (id: string) => ctx.fact(id)?.value;
  const plotted = HALO_DATA.tests.filter((t) => t.pressurePsia <= Y_MAX);
  const hiddenAbove = HALO_DATA.tests.length - plotted.length;

  // One mark per (condition, investigation, fuel), with its test count, so the tooltip can name it.
  const acronyms: string[] = [];
  const fuels: string[] = [];
  const index = (list: string[], s: string) => {
    const i = list.indexOf(s);
    return i >= 0 ? i : list.push(s) - 1;
  };
  const marks = new Map<string, ChartPoint>();
  for (const t of plotted) {
    const key = `${t.o2Pct}|${t.pressurePsia}|${t.fuelClass}|${t.acronym}|${t.fuel}`;
    const hit = marks.get(key);
    if (hit) hit[5] += 1;
    else marks.set(key, [t.o2Pct, t.pressurePsia, CLASS_INDEX[t.fuelClass], index(acronyms, t.acronym), index(fuels, t.fuel), 1]);
  }

  const classCounts = Object.fromEntries(
    CLASS_ORDER.map((c) => [c, plotted.filter((t) => t.fuelClass === c).length]),
  ) as Record<FuelClass, number>;

  const s = brief.byClass.solid;
  const gap = val(nearId("solid", "gap"));
  const dist = val(nearId("solid", "distance"));
  let label = "";
  if (s.test) {
    const dPart = dist === undefined ? "" : ` (d = ${dist})`;
    if (typeof gap === "number" && gap > 0) label = `${gap} O2-points away${dPart}`;
    else label = `at your O2${dPart}`;
  }
  const h = brief.habitat;
  const description =
    `${plotted.length} of ${HALO_DATA.tests.length} eligible NASA tests plotted by oxygen percent (x) and pressure in psia (y); ${hiddenAbove} tests above ${Y_MAX} psia are not shown. ` +
    `Your habitat is at ${val("habitat-oxygen")}% O2 and ${val("habitat-pressure")} psia, ringed by halo ellipses at evidence distance ${GRADE_RINGS.join(", ")}. ` +
    (s.test
      ? `The nearest real cabin solid test is ${s.test.acronym} at ${val(nearId("solid", "oxygen"))}% O2 and ${val(nearId("solid", "pressure"))} psia, evidence distance ${dist}. `
      : "No real cabin solid test is eligible. ") +
    `A dashed box marks the Moon envelope (O2 at least ${PRESETS.moon.o2Pct}%, pressure at most ${PRESETS.moon.pressurePsia} psia). The table below lists the nearest test per fuel class.`;

  return {
    points: [...marks.values()],
    acronyms,
    fuels,
    habitat: { name: h.name, o2: h.o2Pct, p: h.pressurePsia },
    nearestSolid: s.test ? { o2: s.test.o2Pct, p: s.test.pressurePsia, label, acronym: s.test.acronym } : null,
    classCounts,
    hiddenAbove,
    description,
  };
}

export function EvidenceSection({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const bass = ctx.fact("bass-test-one");
  return (
    <Section
      id="evidence"
      title="Where the evidence sits"
      kicker="Each mark is one NASA microgravity test condition. The halo rings show how far your habitat sits from tested conditions: inside the B-ring is close, beyond the D-ring is untested."
    >
      <figure className="relative m-0 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]" data-print-keep>
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 sm:px-5">
          <span className="type-label text-fg-3">Evidence halo · O₂ × pressure</span>
          <span className="type-label hidden text-fg-3 sm:inline">NASA PSI · eligible tests</span>
        </div>
        <div className="p-3 pt-4 sm:p-6">
          <HaloChart {...chartProps(brief)} />
        </div>
      </figure>

      <div className="mt-10" data-print-keep>
        <Eyebrow>Nearest test per fuel class</Eyebrow>
        <ul className="mt-3 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line grid-cols-1 sm:grid-cols-2" data-nearest>
          {CLASS_ORDER.map((c) => {
            const n = brief.byClass[c];
            const pf = ctx.fact(nearId(c, "pressure"));
            return (
              <li key={c} className="flex gap-4 bg-surface-1 p-4 sm:p-5">
                <GradeBadge grade={gradeOf(brief, c)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-fg">
                    {CLASS_LABEL[c]}
                    {c === "solid" && <span className="text-sm font-normal text-fg-3">sets the grade</span>}
                  </p>
                  {n.test ? (
                    <>
                      <p className="mt-0.5 truncate text-sm text-fg-2" title={n.test.fuel}>
                        {n.test.acronym} · {n.test.fuel}
                      </p>
                      <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                        <span className="font-mono text-[1.375rem] leading-none tracking-[-0.03em] text-fg">
                          <span className="mr-1 text-sm text-fg-3">d</span>
                          <Num brief={brief} id={nearId(c, "distance")} />
                        </span>
                        <span className="font-mono text-[0.8125rem] text-fg-2">
                          <Num brief={brief} id={nearId(c, "oxygen")} cite={false} /> O<sub>2</sub> · <Num brief={brief} id={nearId(c, "pressure")} cite={false} />
                        </span>
                        {pf && <ProvenanceBadge provenance={pf.provenance} />}
                      </p>
                      <FlowLine brief={brief} c={c} />
                    </>
                  ) : (
                    <p className="mt-0.5 text-sm text-fg-2">No eligible test.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <FlowCallout brief={brief} />

      {bass && (
        <Callout tone="info" title="Why ground tests are not enough" className="mt-6">
          BASS found that {String(bass.value)}.
          <CiteMark n={ctx.cite(bass.id)} />
        </Callout>
      )}

      <details className="chart-table group mt-6">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium text-accent [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-[var(--dur-fast)] group-open:rotate-90" aria-hidden="true">
            <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Chart data as a table
        </summary>
        <NearestTable brief={brief} />
      </details>
      <div className="print-only mt-4 hidden">
        <NearestTable brief={brief} />
      </div>
    </Section>
  );
}

/** Air flow for one fuel class: the tested range, the nearest test's flow and where the habitat's flow falls. */
function FlowLine({ brief, c }: { brief: Brief; c: FuelClass }) {
  const ctx = briefContext(brief);
  const f = brief.flow[c];
  if (!f.range || !ctx.fact(flowId(c, "min"))) return null;
  const still = f.range[0] === 0 && f.range[1] === 0;
  return (
    <p className="mt-2.5 text-[0.8125rem] leading-snug text-fg-2" data-flow={c} data-flow-inside={String(f.inside)}>
      <span className="text-fg-3">Air flow </span>
      {still ? (
        <>
          tested in still air (<Num brief={brief} id={flowId(c, "max")} cite={false} />)
        </>
      ) : (
        <>
          tested <Num brief={brief} id={flowId(c, "min")} unit={false} cite={false} />–<Num brief={brief} id={flowId(c, "max")} />
        </>
      )}
      {ctx.fact(nearFlowId(c, "flow")) && (
        <>
          {"; nearest test "}
          <Num brief={brief} id={nearFlowId(c, "flow")} />
        </>
      )}
      {"; yours "}
      <Num brief={brief} id="habitat-flow" cite={false} />
      {f.inside === false ? (
        <span className="font-medium text-fg">, outside the tested range</span>
      ) : (
        <>, inside the tested range</>
      )}
      .
    </p>
  );
}

/** What the data and the literature say about air flow, against this cabin's flow. */
function FlowCallout({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const min = ctx.fact("flow-guide-minimum");
  const up = ctx.fact("flow-guide-upstream");
  const pair = ctx.fact("lit-flow-low") && ctx.fact("lit-flow-high-spread");
  const nearPoint = ctx.fact(nearFlowId("solid", "flow-count"));
  if (!min) return null;
  const pairLabel = ctx.fact("lit-flow-low")?.label.split(":")[0].replace(/ sample .*/, "");
  return (
    <div className="mt-6" data-flow-callout="">
    <Callout tone="info" title="Air flow changes how a fire behaves in microgravity">
      <span className="block">
        With no buoyant plume, the cabin&rsquo;s forced air flow feeds the flame. NASA&rsquo;s Researcher&rsquo;s Guide puts the flow at which solids burn at the
        lowest oxygen, and spread fastest, on the order of <Num brief={brief} id="flow-guide-minimum" />, typical of spacecraft ventilation. Your cabin
        runs at <Num brief={brief} id="habitat-flow" />. <ProvenanceBadge provenance="literature" className="ml-1 align-middle" />
      </span>
      {up && (
        <span className="mt-2 block">
          At low flow a flame on a thin fuel can spread upstream, into the oncoming air, the opposite of what happens on Earth.
          <CiteMark n={ctx.cite(up.id)} />
        </span>
      )}
      {pair && (
        <span className="mt-2 block">
          In {pairLabel}, the same material spread at <Num brief={brief} id="lit-flow-low-spread" /> in <Num brief={brief} id="lit-flow-low" /> of
          flow and <Num brief={brief} id="lit-flow-high-spread" /> in <Num brief={brief} id="lit-flow-high" /> (NASA report, not PSI).
        </span>
      )}
      {nearPoint && (
        <span className="mt-2 block">
          At the nearest tested real-solid condition, <Num brief={brief} id={nearFlowId("solid", "flow-count")} cite={false} /> PSI tests ran between{" "}
          <Num brief={brief} id={nearFlowId("solid", "flow-low")} unit={false} cite={false} /> and <Num brief={brief} id={nearFlowId("solid", "flow-high")} />; the one named above is the closest to your flow.
        </span>
      )}
      <span className="mt-2 block text-fg-3">HALO grades on oxygen and pressure; air flow is reported beside the grade, not folded into it.</span>
    </Callout>
    </div>
  );
}

/** Nearest test per fuel class: the chart's text alternative (screen disclosure and print). */
function NearestTable({ brief }: { brief: Brief }) {
  return (
    <TableFrame caption="Nearest eligible test per fuel class" className="mt-3">
      <THead>
        <tr>
          <Th>Fuel class</Th>
          <Th numeric>Tests</Th>
          <Th>Nearest test</Th>
          <Th numeric>O₂</Th>
          <Th numeric>Pressure</Th>
          <Th numeric>Distance d</Th>
        </tr>
      </THead>
      <TBody>
        <Tr>
          <Th scope="row" className="type-body-s normal-case tracking-normal text-fg shadow-none">Your habitat</Th>
          <Td numeric>–</Td>
          <Td>{brief.habitat.name}</Td>
          <Td numeric><Num brief={brief} id="habitat-oxygen" cite={false} /></Td>
          <Td numeric><Num brief={brief} id="habitat-pressure" cite={false} /></Td>
          <Td numeric>–</Td>
        </Tr>
        {CLASS_ORDER.map((c) => {
          const n = brief.byClass[c];
          return (
            <Tr key={c}>
              <Th scope="row" className="type-body-s normal-case tracking-normal text-fg-2 shadow-none">{CLASS_LABEL[c]}</Th>
              <Td numeric><span className="num">{HALO_DATA.tests.filter((t) => t.fuelClass === c).length}</span></Td>
              <Td>{n.test ? `${n.test.acronym} (${n.test.psiId})` : "none"}</Td>
              <Td numeric>{n.test ? <Num brief={brief} id={nearId(c, "oxygen")} cite={false} /> : "–"}</Td>
              <Td numeric>{n.test ? <Num brief={brief} id={nearId(c, "pressure")} cite={false} /> : "–"}</Td>
              <Td numeric>{n.test ? <Num brief={brief} id={nearId(c, "distance")} /> : "–"}</Td>
            </Tr>
          );
        })}
      </TBody>
    </TableFrame>
  );
}
