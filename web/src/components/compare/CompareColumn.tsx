import Link from "next/link";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { briefHref } from "@/lib/compare";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief } from "@/lib/engine/types";

const SEVERITY = {
  critical: { label: "Critical", cls: "border-amber text-amber" },
  warning: { label: "Warning", cls: "border-amber text-amber" },
  info: { label: "Note", cls: "border-rule-strong text-muted" },
} as const;

/** A compact brief summary: header, flags, detection. The full brief lives at /brief. */
export function CompareColumn({ brief, heading }: { brief: Brief; heading: string }) {
  const h = brief.habitat;
  return (
    <article aria-labelledby={heading} className="flex flex-col rounded-md border border-rule bg-surface p-5">
      <header className="flex items-center gap-4">
        <GradeBadge grade={brief.grade.grade} size="lg" />
        <div className="min-w-0">
          <h2 id={heading} className="wide break-words text-xl font-bold leading-tight">{h.name}</h2>
          <p className="num mt-1 font-mono text-sm text-muted">
            {h.o2Pct}% O<sub>2</sub> · {h.pressurePsia} psia
          </p>
        </div>
      </header>
      <p className="mt-3 text-sm leading-snug text-muted">{brief.grade.reason}</p>

      <h3 className="mt-6 text-sm font-semibold">Flags ({brief.flags.length})</h3>
      <ul className="mt-2 space-y-2">
        {brief.flags.map((f) => {
          const s = SEVERITY[f.severity];
          return (
            <li key={f.id} className={`border-l-2 pl-3 ${s.cls}`}>
              <span className="text-xs font-semibold uppercase tracking-wide">{s.label}</span>
              <span className="block text-sm font-semibold text-ink">{f.title}</span>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-6 text-sm font-semibold">Smoke detection</h3>
      {brief.detection.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No materials selected.</p>
      ) : (
        <ul className="num mt-2 space-y-1 text-sm">
          {brief.detection.map((d) => {
            const label = MATERIALS[d.material].label;
            if (d.noSameAnalog) return <li key={d.material}><span className="font-semibold">{label}</span>: no SAME analog, untested</li>;
            if (d.caughtPct === null || d.caughtRuns === 0) return <li key={d.material}><span className="font-semibold">{label}</span>: no recorded runs</li>;
            const caught = Math.round((d.caughtPct / 100) * d.caughtRuns);
            return (
              <li key={d.material}>
                <span className="font-semibold">{label}</span>: alarm in {caught} of {d.caughtRuns} runs
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted">
        Detector: {h.detectors.join(" + ")}. SAME ran at ISS air (21% O2, 1 atm); smoke behavior at habitat atmosphere is untested.
      </p>

      <Link
        href={briefHref(h)}
        prefetch={false}
        className="mt-6 inline-flex items-center self-start rounded-md border border-flame px-4 py-2 text-sm font-semibold text-flame hover:bg-flame-soft"
      >
        Open the full brief<span className="sr-only"> for {h.name}</span>
      </Link>
    </article>
  );
}
