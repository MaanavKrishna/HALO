import { GradeBadge } from "@/components/ui/GradeBadge";
import { archiveMissionLabel, gradeLadder, type LadderStep } from "@/lib/brief/pageFacts";
import { HALO_DATA } from "@/lib/data/load";
import type { Brief } from "@/lib/engine/types";
import { Num } from "./parts";

/**
 * "What would raise this grade": today's grade, then the overall grade (by the
 * engine's own rule) if the literature runs were archived in PSI and after the
 * top suggested test. Hidden when neither step changes the grade.
 */
export function GradeLadder({ brief }: { brief: Brief }) {
  const steps = gradeLadder(brief, HALO_DATA);
  const today = steps[0];
  if (steps.slice(1).every((s) => s.grade === today.grade)) return null;
  const missions = archiveMissionLabel(HALO_DATA);
  const best = brief.nextTests[0];
  const label: Record<LadderStep["kind"], React.ReactNode> = {
    today: "Today, from PSI test rows",
    archive: <>If NASA&rsquo;s {missions} reports were archived in PSI</>,
    next: best ? (
      <>
        After the suggested test (<Num brief={brief} id="next-first-oxygen" cite={false} /> O<sub>2</sub>,{" "}
        <Num brief={brief} id="next-first-pressure" cite={false} />)
      </>
    ) : (
      "After the suggested test"
    ),
  };

  return (
    <section aria-labelledby="grade-ladder-title" className="grade-ladder w-full text-left" data-grade-ladder>
      <h2 id="grade-ladder-title" className="type-label mb-2 text-center text-fg-3">
        What would raise this grade
      </h2>
      <ol className="grade-ladder-steps flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-1">
        {steps.map((s) => {
          const same = s.kind !== "today" && s.grade === today.grade;
          return (
            <li key={s.kind} className="border-t border-line first:border-t-0" data-ladder-step={s.kind} data-ladder-grade={s.grade}>
              <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 px-3 py-2.5 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2">
                <span aria-hidden="true" className="inline-grid">
                  <GradeBadge grade={s.grade} size="sm" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="sr-only">{s.kind === "today" ? "Grade today" : "Hypothetical grade"} {s.grade}: </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8125rem] leading-snug text-fg">
                    {s.kind !== "today" && (
                      <span className="grade-ladder-tag rounded-[var(--radius-pill)] border border-line px-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.04em] text-fg-3">
                        Hypothetical
                      </span>
                    )}
                    <a
                      href={s.href}
                      className="text-pretty text-fg no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                    >
                      {label[s.kind]}
                    </a>
                  </span>
                  <span className="relative z-[1] text-[0.75rem] text-fg-3">
                    Evidence distance <Num brief={brief} id={s.factId} unit={false} />
                    {same && <span className="text-fg-2"> &middot; no change in grade</span>}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
