import type { ReactNode } from "react";
import { StatusLight, cx } from "@/components/ui";
import type { CompareDelta } from "@/lib/compare";
import { MATERIALS } from "@/lib/engine/materials";
import type { Habitat } from "@/lib/engine/types";
import { SEVERITY } from "./MissionCard";

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");
const pct = (n: number | null) => (n === null ? "n/a" : `${Math.round(n)}%`);

function Arrow() {
  return (
    <svg viewBox="0 0 16 10" width="16" height="10" aria-hidden="true" className="shrink-0 text-accent">
      <path d="M1 5h13M10 1.5L14 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line px-5 py-5 first:border-t-0">
      <h3 className="type-label text-fg-3">{title}</h3>
      {children}
    </div>
  );
}

function Change({ label, from, to, unit, deltaUnit = unit, delta }: { label: string; from: number; to: number; unit: string; deltaUnit?: string; delta: number }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
      <span className="text-sm text-fg-2">{label}</span>
      <span className={cx("font-mono text-xs", delta === 0 ? "text-fg-3" : "text-accent")}>
        {delta === 0 ? "same" : `${signed(delta)} ${deltaUnit}`}
      </span>
      <span className="col-span-2 mt-0.5 flex items-center gap-2 font-mono text-[0.9375rem] text-fg">
        {from}
        <Arrow />
        {to}
        <span className="text-xs text-fg-3">{unit}</span>
      </span>
    </li>
  );
}

/**
 * The centre rail: everything that changes from A to B, computed from the two
 * briefs (atmosphere, grade, flags gained or lost, detection share).
 */
export function DeltaRail({ a, b, delta }: { a: Habitat; b: Habitat; delta: CompareDelta }) {
  const g = delta.grade;
  const gradeText =
    g.direction === "same"
      ? "Unchanged: the nearest tests sit at a similar evidence distance."
      : g.direction === "thinner"
        ? `Evidence thins: the nearest NASA tests are further from ${b.name}.`
        : `Evidence firms: NASA tests sit closer to ${b.name}.`;
  const detChanged = delta.detection.filter((d) => d.diff !== null && d.diff !== 0);
  return (
    <section
      aria-labelledby="changes"
      className="relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-accent-line bg-surface-1 shadow-[var(--inner-highlight),var(--glow-1)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-accent-soft px-5 py-3">
        <h2 id="changes" className="type-label text-accent">
          Summary of the change
        </h2>
        <span aria-hidden="true" className="font-mono text-xs text-accent">Δ</span>
      </div>

      <Block title="Evidence grade">
        <p className="flex items-center gap-3 font-mono text-[2rem] leading-none tracking-[-0.04em] text-fg">
          <span aria-hidden="true" className="flex items-center gap-3">
            <span>{g.from}</span>
            <Arrow />
            <span className={cx(g.direction === "thinner" && (g.to === "D" || g.to === "F") && "text-warn")}>{g.to}</span>
          </span>
          <span className="sr-only">{`Evidence grade: ${g.from === g.to ? `unchanged at ${g.from}` : `${g.from} to ${g.to}`}.`}</span>
        </p>
        <p className="text-sm leading-snug text-fg-2">{gradeText}</p>
      </Block>

      <Block title="Atmosphere">
        <ul className="flex flex-col gap-3.5">
          <Change label="Oxygen" from={a.o2Pct} to={b.o2Pct} unit="%" deltaUnit="pts" delta={delta.o2} />
          <Change label="Pressure" from={a.pressurePsia} to={b.pressurePsia} unit="psia" delta={delta.pressure} />
          <Change label="Flow" from={a.flowCmS} to={b.flowCmS} unit="cm/s" delta={delta.flow} />
        </ul>
      </Block>

      <Block title="Flags">
        <ul className="flex flex-col gap-2.5 text-sm">
          {delta.added.map((f) => (
            <li key={`add-${f.id}`} className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-accent">+ new</span>
                <StatusLight status={SEVERITY[f.severity].status} label={SEVERITY[f.severity].label} />
              </span>
              <span className="leading-snug text-fg">
                <span className="sr-only">New in {b.name}: </span>
                {f.title}
              </span>
            </li>
          ))}
          {delta.removed.map((f) => (
            <li key={`rem-${f.id}`} className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-fg-3">− cleared</span>
                <StatusLight status={SEVERITY[f.severity].status} label={SEVERITY[f.severity].label} />
              </span>
              <span className="leading-snug text-fg-2 line-through decoration-line-strong">
                <span className="sr-only">No longer flagged in {b.name}: </span>
                {f.title}
              </span>
            </li>
          ))}
          <li className="text-fg-3">
            <span className="font-mono text-fg-2">{delta.kept.length}</span> {delta.kept.length === 1 ? "flag carries" : "flags carry"} over
            {delta.added.length + delta.removed.length === 0 && "; none gained or lost"}.
          </li>
        </ul>
      </Block>

      <Block title="Detection share">
        {delta.detection.length === 0 ? (
          <p className="text-sm text-fg-3">No materials selected.</p>
        ) : detChanged.length === 0 ? (
          <p className="text-sm leading-snug text-fg-2">
            Unchanged for {delta.detection.length === 1 ? "the material" : `all ${delta.detection.length} materials`}: the smoke
            evidence comes from runs at a single cabin atmosphere, so it does not move with O₂ or pressure.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {delta.detection.map((d) => (
              <li key={d.material} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
                <span className="text-fg-2">{MATERIALS[d.material].label}</span>
                <span className="flex items-center gap-1.5 font-mono text-xs text-fg">
                  {pct(d.from)} <Arrow /> {pct(d.to)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </section>
  );
}
