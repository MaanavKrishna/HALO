import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { briefContext } from "@/lib/brief/context";
import { HALO_DATA } from "@/lib/data/load";
import type { Brief } from "@/lib/engine/types";
import { ExtinctionCurve } from "./charts/ExtinctionCurve";
import { Num, Section } from "./parts";

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
      index={5}
      title="Will it go out on its own? (liquid droplet fuels)"
      kicker={
        liquids
          ? "From FLEX droplet-combustion tests on the ISS, fitted with a logistic model."
          : "No liquid fuels are listed for this habitat; shown for reference. From FLEX droplet tests on the ISS."
      }
    >
      <div className={`rounded-lg border border-rule bg-surface p-4 sm:p-6 ${liquids ? "" : "opacity-95"}`}>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-muted">Median chance a flame goes out on its own</p>
            <p className="mt-1 font-mono text-4xl font-medium tracking-tight">
              <Num brief={brief} id="ext-probability" cite={false} />
            </p>
          </div>
          <div className="pb-1 text-sm">
            <p className="text-muted">
              95% range <Num brief={brief} id="ext-probability-lo" unit={false} cite={false} />–
              <Num brief={brief} id="ext-probability-hi" />
            </p>
            <p className="text-muted">
              at <Num brief={brief} id="hab-oxygen" cite={false} /> O<sub>2</sub>, <Num brief={brief} id="ext-droplet-size" /> droplet,
              evaluated at <Num brief={brief} id="ext-pressure-used" />
            </p>
          </div>
          <ProvenanceBadge provenance="model" className="pb-1.5" />
        </div>

        <div className="mt-5">
          <ExtinctionCurve
            curve={ext.curve}
            habitatO2={brief.habitat.o2Pct}
            here={{ p50: v("ext-probability"), lo: v("ext-probability-lo"), hi: v("ext-probability-hi") }}
            fitO2Range={HALO_DATA.extinction.o2RangePct}
            description={description}
          />
        </div>

        {(ext.extrapolatedPressure || ext.extrapolatedO2) && (
          <p className="mt-4 rounded-md bg-amber-soft px-3.5 py-2.5 text-sm leading-relaxed">
            <span className="font-semibold text-amber">Extrapolation. </span>
            {ext.extrapolatedPressure && (
              <>
                FLEX tests span <Num brief={brief} id="ext-pressure-min" cite={false} /> to <Num brief={brief} id="ext-pressure-max" />; your
                pressure is outside that range, so the model is evaluated at <Num brief={brief} id="ext-pressure-used" />.{" "}
              </>
            )}
            {ext.extrapolatedO2 && <>Your O2 is outside the oxygen range FLEX tested.</>}
          </p>
        )}
      </div>
    </Section>
  );
}
