import { Callout, type CalloutTone } from "@/components/ui/Callout";
import { StatusLight } from "@/components/ui/StatusLight";
import type { Brief, Flag } from "@/lib/engine/types";
import { FactChip, Section } from "./parts";

const TONE: Record<Flag["severity"], CalloutTone> = { critical: "crit", warning: "warn", info: "info" };

/** Flags in severity order, each a Callout (icon shape + screen-reader prefix) with its cited facts as chips. */
export function FlagList({ brief }: { brief: Brief }) {
  const crit = brief.flags.filter((f) => f.severity === "critical").length;
  const warn = brief.flags.filter((f) => f.severity === "warning").length;
  return (
    <Section
      id="flags"
      title="What to know first"
      kicker="Ordered by severity. Every figure is a cited fact; the chips link to its source."
      meta={
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <StatusLight status={crit ? "crit" : "idle"} label={`${crit} critical`} />
          <StatusLight status={warn ? "warn" : "idle"} label={`${warn} caution`} />
        </div>
      }
    >
      <ul className="flex flex-col gap-3" data-flags>
        {brief.flags.map((f) => (
          <li key={f.id} className="flag-card" data-severity={f.severity}>
            <Callout tone={TONE[f.severity]} title={f.title} className="sm:px-5 sm:py-4">
              <p className="text-pretty">{f.detail}</p>
              {f.factIds.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Cited facts">
                  {f.factIds.map((id) => (
                    <li key={id} className="max-w-full">
                      <FactChip brief={brief} id={id} />
                    </li>
                  ))}
                </ul>
              )}
            </Callout>
          </li>
        ))}
      </ul>
    </Section>
  );
}
