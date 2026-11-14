import { Panel } from "@/components/ui/Panel";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { Stat, StatGroup } from "@/components/ui/Stat";
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
      title="If a fire grows: the aftermath"
      kicker="Saffire VI burned large samples inside an uncrewed Cygnus cargo vehicle after it left the ISS."
    >
      {brief.aftermath.length === 0 ? (
        <p className="text-sm text-fg-2">No Saffire VI results are available in this dataset.</p>
      ) : (
        <Panel label="Saffire VI · large-scale burn" bodyClassName="p-0 sm:p-0" data-print-keep="">
          <StatGroup className="rounded-none border-0 max-sm:grid-cols-1 sm:grid-cols-2 [&>div]:p-5 sm:[&>div]:p-6">
            {lo && hi && (
              <Stat
                size="lg"
                label="PMMA fire power"
                value={
                  <>
                    <span className="num" data-fact={lo.id}>{String(lo.value)}</span>–<span className="num" data-fact={hi.id}>{String(hi.value)}</span>
                  </>
                }
                unit={
                  <>
                    {hi.unit}
                    <CiteMark n={ctx.cite(hi.id)} />
                  </>
                }
                provenance={<ProvenanceBadge provenance={hi.provenance} />}
                detail="Range of peak heat release reported for the large PMMA samples."
              />
            )}
            {tox && (
              <Stat
                size="lg"
                label="Toxic gases over crew limits"
                value={<span className="num" data-fact={tox.id}>~{String(tox.value)}</span>}
                unit={
                  <>
                    {tox.unit}
                    <CiteMark n={ctx.cite(tox.id)} />
                  </>
                }
                provenance={<ProvenanceBadge provenance={tox.provenance} />}
                detail={
                  <>
                    In the Saffire VI burn at this oxygen level, CO and CO<sub>2</sub> rose past crew exposure limits.
                  </>
                }
              />
            )}
          </StatGroup>
        </Panel>
      )}
    </Section>
  );
}
