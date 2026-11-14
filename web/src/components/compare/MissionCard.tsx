import { ButtonLink, Chip, GradeBadge, Icon, Stat, StatGroup, StatusLight, cx, type Status } from "@/components/ui";
import { briefHref } from "@/lib/compare";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief, DetectionResult, Flag } from "@/lib/engine/types";

export const SEVERITY: Record<Flag["severity"], { status: Status; label: string }> = {
  critical: { status: "crit", label: "Critical" },
  warning: { status: "warn", label: "Caution" },
  info: { status: "idle", label: "Note" },
};

/** Share of SAME runs where the habitat's detectors alarmed, as a meter with the counts in text. */
export function DetectionMeter({ d }: { d: DetectionResult }) {
  const label = MATERIALS[d.material].label;
  const measured = !d.noSameAnalog && d.caughtPct !== null && d.caughtRuns > 0;
  const caught = measured ? Math.round(((d.caughtPct as number) / 100) * d.caughtRuns) : 0;
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-fg">{label}</span>
        <span className={cx("font-mono text-xs", measured ? "text-fg-2" : "text-fg-3")}>
          {d.noSameAnalog ? "no SAME analog, untested" : measured ? `alarm in ${caught} of ${d.caughtRuns} runs` : "no recorded runs"}
        </span>
      </div>
      <span aria-hidden="true" className={cx("relative block h-1.5 overflow-hidden rounded-full bg-surface-2", !measured && "border border-dashed border-line-strong bg-transparent")}>
        {measured && (
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]"
            style={{ width: `${Math.max(2, d.caughtPct as number)}%` }}
          />
        )}
      </span>
    </li>
  );
}

/**
 * One habitat's brief as a mission card: grade, atmosphere readouts, flags
 * (with the ones only this side has marked) and smoke-detection meters.
 */
export function MissionCard({
  brief,
  side,
  headingId,
  uniqueFlagIds,
  detectorNote,
}: {
  brief: Brief;
  side: "From" | "To";
  headingId: string;
  uniqueFlagIds: Set<string>;
  detectorNote: string;
}) {
  const h = brief.habitat;
  return (
    <article
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-2)]"
    >
      <header className="relative flex items-center gap-5 border-b border-line px-5 py-5 sm:px-6">
        <GradeBadge grade={brief.grade.grade} size="lg" />
        <div className="min-w-0">
          <p className="type-label text-fg-3">{side}</p>
          <h2 id={headingId} className="type-headline mt-1 break-words text-fg">
            {h.name}
          </h2>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-7 px-5 py-6 sm:px-6">
        <p className="text-sm leading-relaxed text-fg-2">{brief.grade.reason}</p>

        <StatGroup className="grid-cols-2! [&>div]:p-4! [&>div:last-child:nth-child(odd)]:col-span-2">
          <Stat label="Oxygen" value={h.o2Pct} unit="%" />
          <Stat label="Pressure" value={h.pressurePsia} unit="psia" />
          <Stat label="Flow" value={h.flowCmS} unit="cm/s" />
        </StatGroup>

        <section aria-labelledby={`${headingId}-flags`} className="flex flex-col gap-3">
          <h3 id={`${headingId}-flags`} className="type-label text-fg-3">
            Flags · {brief.flags.length}
          </h3>
          {brief.flags.length === 0 ? (
            <p className="text-sm text-fg-3">No flags.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-md)] border border-line">
              {brief.flags.map((f) => {
                const s = SEVERITY[f.severity];
                return (
                  <li key={f.id} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusLight status={s.status} label={s.label} />
                      {uniqueFlagIds.has(f.id) && <Chip tone="accent">Only here</Chip>}
                    </div>
                    <p className="text-sm font-medium leading-snug text-fg">{f.title}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby={`${headingId}-det`} className="flex flex-col gap-3">
          <h3 id={`${headingId}-det`} className="type-label text-fg-3">
            Smoke detection · {h.detectors.join(" + ")}
          </h3>
          {brief.detection.length === 0 ? (
            <p className="text-sm text-fg-3">No materials selected.</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {brief.detection.map((d) => (
                <DetectionMeter key={d.material} d={d} />
              ))}
            </ul>
          )}
          <p className="text-xs leading-relaxed text-fg-3">{detectorNote}</p>
        </section>

        <div className="mt-auto pt-1">
          <ButtonLink href={briefHref(h)} prefetch={false} variant="secondary" iconEnd={<Icon name="arrowRight" size={16} />}>
            Open the full brief<span className="sr-only"> for {h.name}</span>
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
