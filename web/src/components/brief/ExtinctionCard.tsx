import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { briefContext } from "@/lib/brief/context";
import { HALO_DATA } from "@/lib/data/load";
import type { Brief } from "@/lib/engine/types";
import { Callout } from "@/components/ui/Callout";
import { Panel } from "@/components/ui/Panel";
import { Stat, StatGroup } from "@/components/ui/Stat";
import { TBody, THead, TableFrame, Td, Th, Tr } from "@/components/ui/Table";
import { ExtinctionCurve } from "./charts/ExtinctionCurve";
import { CiteMark, Num, Section } from "./parts";

export function ExtinctionCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const v = (id: string) => Number(ctx.fact(id)?.value);
  const ext = brief.extinction;
  const liquids = brief.habitat.liquids;
  const description =
    `Median chance that a ${v("ext-droplet-size")} mm droplet flame goes out on its own, from 0 to 100%, plotted against oxygen percent, ` +
    `with a shaded 95% band from bootstrap fits. At your ${v("hab-oxygen")}% O2 the median is ${v("ext-probability")}% ` +
    `(range ${v("ext-probability-lo")} to ${v("ext-probability-hi")}%).`;

  return (
    <Section
      id="extinction"
      title="Will it go out on its own? (liquid droplet fuels)"
      kicker={
        liquids
          ? "From FLEX droplet-combustion tests on the ISS, fitted with a logistic model."
          : "No liquid fuels are listed for this habitat; shown for reference. From FLEX droplet tests on the ISS."
      }
    >
      <Panel label="Droplet self-extinction · FLEX" meta={<ProvenanceBadge provenance="model" />} bodyClassName="p-0 sm:p-0" data-print-keep="">
        <StatGroup className="rounded-none border-0 border-b max-sm:grid-cols-1 sm:grid-cols-3 [&>div]:p-4 sm:[&>div]:p-5">
          <Stat
            label="Median chance it goes out"
            value={<Num brief={brief} id="ext-probability" unit={false} cite={false} />}
            unit="%"
            detail={
              <>
                at <Num brief={brief} id="hab-oxygen" cite={false} /> O<sub>2</sub>
              </>
            }
          />
          <Stat
            label="95% band"
            value={
              <>
                <Num brief={brief} id="ext-probability-lo" unit={false} cite={false} />–<Num brief={brief} id="ext-probability-hi" unit={false} cite={false} />
              </>
            }
            unit={
              <>
                %<CiteMark n={ctx.cite("ext-probability-hi")} />
              </>
            }
            detail={`${HALO_DATA.extinction.coefs.length} bootstrap fits`}
          />
          <Stat
            label="Evaluated at"
            value={<Num brief={brief} id="ext-pressure-used" unit={false} cite={false} />}
            unit={ctx.fact("ext-pressure-used")?.unit}
            detail={
              <>
                <Num brief={brief} id="ext-droplet-size" /> droplet
              </>
            }
          />
        </StatGroup>

        <div className="p-4 sm:p-6">
          <ExtinctionCurve
            curve={ext.curve}
            habitatO2={brief.habitat.o2Pct}
            here={{ p50: v("ext-probability"), lo: v("ext-probability-lo"), hi: v("ext-probability-hi") }}
            fitO2Range={HALO_DATA.extinction.o2RangePct}
            description={description}
          />
        </div>
      </Panel>

      {(ext.extrapolatedPressure || ext.extrapolatedO2) && (
        <Callout tone="warn" title="Extrapolation" className="mt-4">
          {ext.extrapolatedPressure && (
            <>
              FLEX tests span <Num brief={brief} id="ext-pressure-min" cite={false} /> to <Num brief={brief} id="ext-pressure-max" />; your
              pressure is outside that range, so the model is evaluated at <Num brief={brief} id="ext-pressure-used" />.{" "}
            </>
          )}
          {ext.extrapolatedO2 && <>Your O2 is outside the oxygen range FLEX tested.</>}
        </Callout>
      )}

      <details className="chart-table group mt-6">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium text-accent [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-[var(--dur-fast)] group-open:rotate-90" aria-hidden="true">
            <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Curve data as a table
        </summary>
        <CurveTable brief={brief} />
      </details>
      <div className="print-only hidden">
        <CurveTable brief={brief} compact />
      </div>
    </Section>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Text alternative to the curve: the model at every 5 O2-points, plus the habitat. */
function CurveTable({ brief, compact = false }: { brief: Brief; compact?: boolean }) {
  // Print keeps the habitat row and every 10 O2-points; the screen table every 5.
  const step = compact ? 10 : 5;
  const rows = brief.extinction.curve.filter((c) => Number.isInteger(c.o2) && c.o2 % step === 0);
  return (
    <TableFrame caption="Chance a droplet flame goes out on its own, by O2 (model)" className="mt-3">
      <THead>
        <tr>
          <Th>O₂</Th>
          <Th numeric>Median</Th>
          <Th numeric>95% low</Th>
          <Th numeric>95% high</Th>
        </tr>
      </THead>
      <TBody>
        <Tr className="bg-accent-soft">
          <Th scope="row" className="type-body-s normal-case tracking-normal text-fg shadow-none">
            Your habitat (<Num brief={brief} id="hab-oxygen" cite={false} />)
          </Th>
          <Td numeric><Num brief={brief} id="ext-probability" cite={false} /></Td>
          <Td numeric><Num brief={brief} id="ext-probability-lo" cite={false} /></Td>
          <Td numeric><Num brief={brief} id="ext-probability-hi" /></Td>
        </Tr>
        {rows.map((c) => (
          <Tr key={c.o2}>
            <Th scope="row" className="num font-mono text-sm normal-case tracking-normal text-fg-2 shadow-none">{c.o2}%</Th>
            <Td numeric>{pct(c.p50)}</Td>
            <Td numeric>{pct(c.lo)}</Td>
            <Td numeric>{pct(c.hi)}</Td>
          </Tr>
        ))}
      </TBody>
    </TableFrame>
  );
}
