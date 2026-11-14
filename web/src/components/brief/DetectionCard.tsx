import { briefContext } from "@/lib/brief/context";
import { whatIfId } from "@/lib/brief/pageFacts";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief, DetectorId } from "@/lib/engine/types";
import { DetectorBars, type ComboKey, type DetectorRow } from "./charts/DetectorBars";
import { Callout } from "@/components/ui/Callout";
import { Panel } from "@/components/ui/Panel";
import { CiteMark, Num, Section } from "./parts";

const COMBOS: Record<ComboKey, DetectorId[]> = { scatter: ["scatter"], "scatter-ionization": ["scatter", "ionization"] };

export function DetectionCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const num = (id: string) => {
    const v = ctx.fact(id)?.value;
    return typeof v === "number" ? v : null;
  };

  const rows: DetectorRow[] = brief.habitat.materials.map((m) => {
    const combos = {} as DetectorRow["combos"];
    for (const [key, combo] of Object.entries(COMBOS) as Array<[ComboKey, DetectorId[]]>) {
      const caught = num(whatIfId(m, combo, "caught"));
      const runs = num(whatIfId(m, combo, "runs"));
      combos[key] = caught !== null && runs ? { caught, runs, cite: ctx.cite(whatIfId(m, combo, "runs")) ?? null } : null;
    }
    return { material: MATERIALS[m].label, combos };
  });
  const initial: ComboKey = brief.habitat.detectors.includes("ionization") ? "scatter-ionization" : "scatter";

  return (
    <Section
      id="detection"
      title="Would your smoke detector notice?"
      kicker="From SAME, which burned real spacecraft materials on the ISS and read smoke detectors at each run."
    >
      <Panel label="Detector meters" meta={COMBOS_META} data-print-keep="">
        {rows.length > 0 ? (
          <DetectorBars rows={rows} initial={initial} />
        ) : (
          <p className="text-sm text-fg-2">No cabin materials are listed, so there is no smoke evidence to show.</p>
        )}
      </Panel>

      <div data-iss-air className="mt-4">
        <Callout tone="warn">
          <span className="text-fg">
            SAME ran at ISS air (<Num brief={brief} id="det-ambient-oxygen" cite={false} /> O2, <Num brief={brief} id="det-ambient-pressure" cite={false} />); smoke
            behavior at habitat atmosphere is untested
          </span>
          .<CiteMark n={ctx.cite("det-ambient-oxygen")} />
        </Callout>
      </div>

      <dl className="mt-4 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-3 bg-surface-1 px-4 py-3">
          <dt className="type-label text-fg-3">Scatter alarm level</dt>
          <dd className="font-mono text-sm text-fg">
            <Num brief={brief} id="det-scatter-threshold" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 bg-surface-1 px-4 py-3">
          <dt className="type-label text-fg-3">Ionization alarm (inferred)</dt>
          <dd className="font-mono text-sm text-fg">
            ΔV <Num brief={brief} id="det-ionization-threshold" />
          </dd>
        </div>
      </dl>
    </Section>
  );
}

const COMBOS_META = "SAME runs";
