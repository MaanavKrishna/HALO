import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { briefContext } from "@/lib/brief/context";
import type { Brief } from "@/lib/engine/types";
import { Section, unitText } from "./parts";

/** Numbered sources, in first-use order, plus every fact the brief can show. */
export function CitationList({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  return (
    <Section
      id="sources"
      index={10}
      title="Sources"
      kicker="Superscript numbers throughout the brief point here. PSI datasets are CC0 and cited by dataset DOI."
    >
      <ol className="citations flex flex-col gap-2.5 text-sm" data-citations>
        {ctx.citations.map((c) => (
          <li key={c.n} id={`cite-${c.n}`} className="grid scroll-mt-6 grid-cols-[2rem_minmax(0,1fr)] gap-2 target:bg-flame-soft">
            <span className="num pt-px font-mono text-xs text-muted">[{c.n}]</span>
            <span className="min-w-0 break-words">
              <span className="text-ink">{c.title}</span>
              {c.detail && <span className="text-muted">. {c.detail}</span>}
              {c.url && (
                <>
                  {" "}
                  <a href={c.url} rel="noreferrer" className="cite-link break-all text-flame underline-offset-2 hover:underline">
                    {c.doi ? `doi:${c.doi}` : c.url.replace(/^https:\/\//, "")}
                  </a>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>

      <details className="fact-table no-print mt-6 text-sm">
        <summary className="cursor-pointer text-flame">Every fact on this brief</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <caption className="sr-only">Facts with value, provenance and source number</caption>
            <thead className="text-xs text-muted">
              <tr className="border-b border-rule">
                <th scope="col" className="py-2 pr-3 font-medium">Fact</th>
                <th scope="col" className="py-2 pr-3 font-medium">Value</th>
                <th scope="col" className="py-2 pr-3 font-medium">Provenance</th>
                <th scope="col" className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {ctx.facts.map((f) => (
                <tr key={f.id} className="border-b border-rule align-top">
                  <th scope="row" className="py-1.5 pr-3 font-normal">{f.label}</th>
                  <td className="num max-w-[18rem] py-1.5 pr-3">
                    {String(f.value)}
                    {unitText(f)}
                  </td>
                  <td className="py-1.5 pr-3">
                    <ProvenanceBadge provenance={f.provenance} />
                  </td>
                  <td className="py-1.5">
                    <a href={`#cite-${ctx.cite(f.id)}`} className="num font-mono text-xs text-flame">
                      [{ctx.cite(f.id)}]
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Section>
  );
}
