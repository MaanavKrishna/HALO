import { briefContext } from "@/lib/brief/context";
import { whatIfId } from "@/lib/brief/pageFacts";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief, DetectorId } from "@/lib/engine/types";
import { DetectorBars, type ComboKey, type DetectorRow } from "./charts/DetectorBars";
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
      index={4}
      title="Would your smoke detector notice?"
      kicker="From SAME, which burned real spacecraft materials on the ISS and read smoke detectors at each run."
    >
      <div className="rounded-lg border border-rule bg-surface p-4 sm:p-6">
        {rows.length > 0 ? (
          <DetectorBars rows={rows} initial={initial} />
        ) : (
          <p className="text-sm text-muted">No cabin materials are listed, so there is no smoke evidence to show.</p>
        )}

        <p className="mt-5 flex gap-2.5 rounded-md bg-amber-soft px-3.5 py-2.5 text-sm leading-relaxed" data-iss-air>
          <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true">
            <path d="M8 2.2l6.2 11.2H1.8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6.3v3.2M8 11.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>
            <span>
              SAME ran at ISS air (<Num brief={brief} id="det-ambient-oxygen" cite={false} /> O2, <Num brief={brief} id="det-ambient-pressure" cite={false} />); smoke
              behavior at habitat atmosphere is untested
            </span>
            .<CiteMark n={ctx.cite("det-ambient-oxygen")} />
          </span>
        </p>

        <dl className="mt-4 grid gap-x-8 gap-y-1 text-xs text-muted sm:grid-cols-2">
          <div className="flex gap-1.5">
            <dt>Scatter alarm level:</dt>
            <dd>
              <Num brief={brief} id="det-scatter-threshold" />
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Ionization alarm level (inferred):</dt>
            <dd>
              ΔV <Num brief={brief} id="det-ionization-threshold" />
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  );
}
