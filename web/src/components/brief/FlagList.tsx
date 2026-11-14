import { briefContext } from "@/lib/brief/context";
import type { Brief, Flag } from "@/lib/engine/types";
import { CiteMark, Section } from "./parts";

const SEV: Record<Flag["severity"], { label: string; mark: React.ReactNode; tone: string }> = {
  critical: {
    label: "Critical",
    tone: "border-amber bg-amber-soft",
    mark: (
      <svg viewBox="0 0 16 16" className="size-4 text-amber" aria-hidden="true">
        <path d="M8 1.5l7 12.5H1z" fill="currentColor" />
        <path d="M8 6v3.6M8 11.3v.1" stroke="var(--amber-soft)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  warning: {
    label: "Warning",
    tone: "border-amber/60 bg-surface",
    mark: (
      <svg viewBox="0 0 16 16" className="size-4 text-amber" aria-hidden="true">
        <path d="M8 2.2l6.2 11.2H1.8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 6.3v3.2M8 11.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    label: "Note",
    tone: "border-rule bg-surface",
    mark: (
      <svg viewBox="0 0 16 16" className="size-4 text-flame" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7.2v4M8 4.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
};

export function FlagList({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const counts = {
    critical: brief.flags.filter((f) => f.severity === "critical").length,
    warning: brief.flags.filter((f) => f.severity === "warning").length,
  };
  return (
    <Section
      id="flags"
      index={1}
      title="What to know first"
      kicker={`${counts.critical} critical, ${counts.warning} warning. Ordered by severity; every figure links to its source.`}
    >
      <ul className="flex flex-col gap-3" data-flags>
        {brief.flags.map((f) => {
          const s = SEV[f.severity];
          const cites = [...new Set(f.factIds.map((id) => ctx.cite(id)).filter((n): n is number => !!n))];
          return (
            <li key={f.id} className={`flag-card rounded-md border-l-[3px] border-y border-r px-4 py-3.5 sm:px-5 ${s.tone}`} data-severity={f.severity}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{s.mark}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${f.severity === "info" ? "text-flame" : "text-amber"}`}>
                      {s.label}
                    </span>
                    <span className="font-semibold leading-snug">{f.title}</span>
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">
                    {f.detail}
                    {cites.map((n) => (
                      <CiteMark key={n} n={n} />
                    ))}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
