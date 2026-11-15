import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { TBody, THead, TableFrame, Td, Th, Tr } from "@/components/ui/Table";
import { briefContext } from "@/lib/brief/context";
import { factText, type Brief, type Provenance } from "@/lib/engine/types";
import { Section, unitText } from "./parts";

const PROVENANCE_ORDER: Provenance[] = ["measured", "inferred", "assumed", "literature", "computed", "model", "si"];

/** Numbered sources, in first-use order, plus every fact the brief can show. */
export function CitationList({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  // Which kinds of provenance each source backs on this brief.
  const kinds = new Map<number, Set<Provenance>>();
  for (const f of ctx.facts) {
    const n = ctx.cite(f.id);
    if (!n) continue;
    if (!kinds.has(n)) kinds.set(n, new Set());
    kinds.get(n)!.add(f.provenance);
  }
  return (
    <Section
      id="sources"
      title="Sources"
      kicker="Superscript numbers throughout the brief point here. PSI datasets are CC0 and cited by dataset DOI."
    >
      <ol className="citations flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1" data-citations>
        {ctx.citations.map((c) => {
          const prov = PROVENANCE_ORDER.filter((p) => kinds.get(c.n)?.has(p));
          return (
            <li
              key={c.n}
              id={`cite-${c.n}`}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 border-t border-line px-4 py-3.5 transition-colors duration-[var(--dur-slow)] first:border-t-0 target:bg-accent-soft sm:px-5"
            >
              <span className="num pt-0.5 font-mono text-[0.8125rem] text-fg-3">[{c.n}]</span>
              <span className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="break-words leading-snug">
                  <span className="text-fg">{c.title}</span>
                  {c.detail && <span className="text-fg-2">. {c.detail}</span>}
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {c.url && (
                    <a
                      href={c.url}
                      rel="noopener noreferrer"
                      className="cite-link break-all font-mono text-[0.8125rem] text-accent underline-offset-4 hover:underline"
                    >
                      {c.doi ? `doi:${c.doi}` : c.url.replace(/^https:\/\//, "")}
                    </a>
                  )}
                  {prov.length > 0 && (
                    <span className="no-print flex flex-wrap gap-x-3 gap-y-1">
                      {prov.map((p) => (
                        <ProvenanceBadge key={p} provenance={p} />
                      ))}
                    </span>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <details className="fact-table no-print group mt-6">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium text-accent [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-[var(--dur-fast)] group-open:rotate-90" aria-hidden="true">
            <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Every fact on this brief
        </summary>
        <TableFrame caption="Facts with value, provenance and source number" className="mt-3" maxHeight="32rem">
          <THead>
            <tr>
              <Th>Fact</Th>
              <Th>Value</Th>
              <Th>Provenance</Th>
              <Th numeric>Source</Th>
            </tr>
          </THead>
          <TBody>
            {ctx.facts.map((f) => (
              <Tr key={f.id}>
                <Th scope="row" className="type-body-s min-w-[14rem] whitespace-normal normal-case tracking-normal text-fg shadow-none">
                  {f.label}
                </Th>
                <Td className="num max-w-[18rem] text-fg">
                  {factText(f)}
                  {unitText(f)}
                </Td>
                <Td>
                  <ProvenanceBadge provenance={f.provenance} />
                </Td>
                <Td numeric>
                  <a href={`#cite-${ctx.cite(f.id)}`} className="num text-xs text-accent hover:underline">
                    [{ctx.cite(f.id)}]
                  </a>
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableFrame>
      </details>
    </Section>
  );
}
