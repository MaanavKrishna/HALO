import { ButtonLink, Card, GradeBadge, Icon, ProvenanceBadge, Stat, StatGroup } from "@/components/ui";
import type { Finding } from "./findings";
import { FindingViz } from "./FindingViz";
import "./content.css";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * One headline finding: the sentence, its instrument readout, a small figure,
 * the supporting line, every source, and a link to a prefilled brief that
 * shows the same evidence in context.
 */
export function FindingCard({ finding: f }: { finding: Finding }) {
  const titleId = `${f.id}-title`;
  return (
    <section id={f.id} aria-labelledby={titleId} className="content-block scroll-mt-[calc(var(--nav-h)+1.5rem)]">
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-7">
          <p className="type-label flex items-center gap-3 text-fg-3">
            <span className="font-mono text-accent">{pad(f.index)}</span>
            <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
            {f.topic}
          </p>
          <p className="flex flex-wrap items-center gap-3">
            {f.provenance.map((p) => (
              <ProvenanceBadge key={p} provenance={p} />
            ))}
          </p>
        </div>

        <div className="flex flex-col gap-7 px-5 py-6 sm:px-7 sm:py-8">
          <h2 id={titleId} className="type-headline max-w-[30ch] text-balance text-fg">
            {f.title}
          </h2>

          <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-8">
            <StatGroup className="content-list self-start max-[25rem]:grid-cols-1 sm:grid-cols-1 md:grid-cols-1">
              <Stat size="lg" value={f.stat.value} unit={f.stat.unit} label={f.stat.label} detail={f.stat.detail} />
              {f.second && <Stat value={f.second.value} unit={f.second.unit} label={f.second.label} />}
            </StatGroup>
            <div className="flex min-w-0 flex-col justify-center rounded-[var(--radius-md)] border border-line bg-canvas p-4 sm:p-5">
              <FindingViz viz={f.viz} />
            </div>
          </div>

          <p className="type-body max-w-[66ch] text-fg-2">{f.body}</p>

          <div className="flex flex-col gap-5 border-t border-line pt-5 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="type-label text-fg-3">{f.sources.length === 1 ? "Source" : "Sources"}</p>
              <ol className="content-list flex flex-col gap-1.5 text-sm">
                {f.sources.map((s) => (
                  <li key={s.label + (s.href ?? "")} className="min-w-0">
                    {s.href ? (
                      s.href.startsWith("/") ? (
                        <a href={s.href} className="content-quiet">
                          {s.label}
                        </a>
                      ) : (
                        <a href={s.href} target="_blank" rel="noopener noreferrer" className="content-quiet break-words">
                          {s.label}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )
                    ) : (
                      <span className="text-fg-2">{s.label}</span>
                    )}
                    {s.detail && <span className="block font-mono text-[0.75rem] text-fg-3 [overflow-wrap:anywhere]">{s.detail}</span>}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 self-start md:self-auto">
              <span className="flex items-center gap-2 text-sm text-fg-2">
                <GradeBadge grade={f.brief.grade} size="sm" />
                <span className="max-w-[12rem] leading-tight">{f.brief.name}</span>
              </span>
              <ButtonLink
                href={f.brief.href}
                aria-label={f.brief.label}
                variant="secondary"
                size="md"
                className="content-btn"
                iconEnd={<Icon name="arrowRight" size={16} />}
              >
                See it in a brief
              </ButtonLink>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
