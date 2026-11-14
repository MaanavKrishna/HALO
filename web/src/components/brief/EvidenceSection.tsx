import { GradeBadge } from "@/components/ui/GradeBadge";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { briefContext } from "@/lib/brief/context";
import { CLASS_LABEL, CLASS_ORDER, gradeOf, nearId } from "@/lib/brief/pageFacts";
import { HALO_DATA } from "@/lib/data/load";
import type { Brief, FuelClass } from "@/lib/engine/types";
import { GRADE_RINGS } from "@/lib/engine/grade";
import { PRESETS } from "@/lib/engine/presets";
import { HaloChart, type HaloChartProps } from "./charts/HaloChart";
import { Y_MAX } from "./charts/haloAxes";
import { CiteMark, Eyebrow, Num, Section } from "./parts";

const CLASS_INDEX: Record<FuelClass, number> = { solid: 0, solid_surrogate: 1, droplet: 2, gas: 3 };

function chartProps(brief: Brief): HaloChartProps {
  const ctx = briefContext(brief);
  const val = (id: string) => ctx.fact(id)?.value;
  const plotted = HALO_DATA.tests.filter((t) => t.pressurePsia <= Y_MAX);
  const hiddenAbove = HALO_DATA.tests.length - plotted.length;
  const points = plotted.map((t) => [t.o2Pct, t.pressurePsia, CLASS_INDEX[t.fuelClass]] as [number, number, number]);
  const classCounts = Object.fromEntries(
    CLASS_ORDER.map((c) => [c, HALO_DATA.tests.filter((t) => t.fuelClass === c).length]),
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
    `Your habitat is at ${val("hab-oxygen")}% O2 and ${val("hab-pressure")} psia, ringed by halo ellipses at evidence distance ${GRADE_RINGS.join(", ")}. ` +
    (s.test
      ? `The nearest real cabin solid test is ${s.test.acronym} at ${val(nearId("solid", "oxygen"))}% O2 and ${val(nearId("solid", "pressure"))} psia, evidence distance ${dist}. `
      : "No real cabin solid test is eligible. ") +
    `A dashed box marks the Moon envelope (O2 at least ${PRESETS.moon.o2Pct}%, pressure at most ${PRESETS.moon.pressurePsia} psia). The table below lists the nearest test per fuel class.`;

  return {
    points,
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
      index={2}
      title="Where the evidence sits"
      kicker="Each mark is one NASA microgravity test. The halo rings show how far your habitat is from tested conditions: inside the B-ring is close, beyond the D-ring is untested."
    >
      <div className="rounded-lg border border-rule bg-surface p-3 sm:p-5">
        <HaloChart {...chartProps(brief)} />
      </div>

      <div className="mt-6">
        <Eyebrow>Nearest test per fuel class</Eyebrow>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2" data-nearest>
          {CLASS_ORDER.map((c) => {
            const n = brief.byClass[c];
            return (
              <li key={c} className="flex gap-3.5 rounded-md border border-rule bg-surface p-3.5">
                <GradeBadge grade={gradeOf(brief, c)} size="sm" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">
                    {CLASS_LABEL[c]}
                    {c === "solid" && <span className="ml-1.5 font-normal text-muted">(sets the grade)</span>}
                  </p>
                  {n.test ? (
                    <>
                      <p className="mt-0.5 truncate text-muted" title={n.test.fuel}>
                        {n.test.acronym} · {n.test.fuel}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          d = <Num brief={brief} id={nearId(c, "distance")} className="font-semibold" />
                        </span>
                        <span className="text-muted">
                          <Num brief={brief} id={nearId(c, "oxygen")} cite={false} /> O<sub>2</sub> ·{" "}
                          <Num brief={brief} id={nearId(c, "pressure")} cite={false} />
                        </span>
                        {(() => {
                          const pf = ctx.fact(nearId(c, "pressure"));
                          return pf ? <ProvenanceBadge provenance={pf.provenance} /> : null;
                        })()}
                      </p>
                    </>
                  ) : (
                    <p className="mt-0.5 text-muted">No eligible test.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {bass && (
        <p className="mt-6 max-w-prose border-l-2 border-flame pl-4 text-[15px] leading-relaxed">
          <span className="font-semibold">Why ground tests are not enough.</span>{" "}
          <span className="text-muted">BASS found that {String(bass.value)}.</span>
          <CiteMark n={ctx.cite(bass.id)} />
        </p>
      )}

      <details className="chart-table mt-6 text-sm">
        <summary className="cursor-pointer text-flame">Chart data as a table</summary>
        <NearestTable brief={brief} />
      </details>
      <div className="print-only mt-4 hidden text-sm">
        <NearestTable brief={brief} />
      </div>
    </Section>
  );
}

/** Nearest test per fuel class: the chart's text alternative (screen disclosure and print). */
function NearestTable({ brief }: { brief: Brief }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left">
        <caption className="sr-only">Nearest eligible test per fuel class</caption>
        <thead className="text-xs text-muted">
          <tr className="border-b border-rule">
            <th scope="col" className="py-2 pr-3 font-medium">Fuel class</th>
            <th scope="col" className="py-2 pr-3 font-medium">Tests</th>
            <th scope="col" className="py-2 pr-3 font-medium">Nearest test</th>
            <th scope="col" className="py-2 pr-3 font-medium">O₂</th>
            <th scope="col" className="py-2 pr-3 font-medium">Pressure</th>
            <th scope="col" className="py-2 font-medium">Distance d</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-rule">
            <th scope="row" className="py-2 pr-3 font-semibold">Your habitat</th>
            <td className="py-2 pr-3">–</td>
            <td className="py-2 pr-3">{brief.habitat.name}</td>
            <td className="py-2 pr-3"><Num brief={brief} id="hab-oxygen" cite={false} /></td>
            <td className="py-2 pr-3"><Num brief={brief} id="hab-pressure" cite={false} /></td>
            <td className="py-2">–</td>
          </tr>
          {CLASS_ORDER.map((c) => {
            const n = brief.byClass[c];
            return (
              <tr key={c} className="border-b border-rule">
                <th scope="row" className="py-2 pr-3 font-normal">{CLASS_LABEL[c]}</th>
                <td className="num py-2 pr-3">{HALO_DATA.tests.filter((t) => t.fuelClass === c).length}</td>
                <td className="py-2 pr-3">{n.test ? `${n.test.acronym} (${n.test.psiId})` : "none"}</td>
                <td className="py-2 pr-3">{n.test ? <Num brief={brief} id={nearId(c, "oxygen")} cite={false} /> : "–"}</td>
                <td className="py-2 pr-3">{n.test ? <Num brief={brief} id={nearId(c, "pressure")} cite={false} /> : "–"}</td>
                <td className="py-2">{n.test ? <Num brief={brief} id={nearId(c, "distance")} /> : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
