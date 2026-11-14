import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { briefContext } from "@/lib/brief/context";
import type { Brief } from "@/lib/engine/types";
import { CiteMark, Section } from "./parts";

/** Saffire VI: how big a large spacecraft fire got, and what it left in the air. */
export function AftermathCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const f = (id: string) => brief.aftermath.find((x) => x.id === id);
  const lo = f("aftermath-pmma-power-low");
  const hi = f("aftermath-pmma-power-high");
  const tox = f("aftermath-toxic-oxygen");

  return (
    <Section
      id="aftermath"
      index={6}
      title="If a fire grows: the aftermath"
      kicker="Saffire VI burned large samples inside an uncrewed Cygnus cargo vehicle after it left the ISS."
    >
      {brief.aftermath.length === 0 ? (
        <p className="text-sm text-muted">No Saffire VI results are available in this dataset.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lo && hi && (
            <div className="rounded-lg border border-rule bg-surface p-5">
              <p className="text-xs text-muted">PMMA fire power</p>
              <p className="mt-1 font-mono text-3xl font-medium tracking-tight">
                <span className="num" data-fact={lo.id}>{String(lo.value)}</span>–<span className="num" data-fact={hi.id}>{String(hi.value)}</span>
                <span className="ml-1.5 text-lg text-muted">{hi.unit}</span>
                <CiteMark n={ctx.cite(hi.id)} />
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Range of peak heat release reported for the large PMMA samples.
              </p>
              <ProvenanceBadge provenance={hi.provenance} className="mt-3" />
            </div>
          )}
          {tox && (
            <div className="rounded-lg border border-rule bg-surface p-5">
              <p className="text-xs text-muted">Toxic gases over crew limits</p>
              <p className="mt-1 font-mono text-3xl font-medium tracking-tight">
                ~<span className="num" data-fact={tox.id}>{String(tox.value)}</span>%
                <span className="ml-1.5 text-lg text-muted">
                  O<sub>2</sub>
                </span>
                <CiteMark n={ctx.cite(tox.id)} />
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                In the Saffire VI burn at this oxygen level, CO and CO<sub>2</sub> rose past crew exposure limits.
              </p>
              <ProvenanceBadge provenance={tox.provenance} className="mt-3" />
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
