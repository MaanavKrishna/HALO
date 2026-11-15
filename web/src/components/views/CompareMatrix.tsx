import Link from "next/link";
import { SiChip, cx } from "@/components/ui";
import type { Investigation } from "@/lib/engine/types";
import { doiUrl } from "@/lib/explore";
import { SeriesSwatch, SERIES_STYLES } from "./EvidencePlot";
import type { Cell, MatrixRow } from "./compareInvestigations";

function CellBody({ cell, row }: { cell: Cell; row: MatrixRow }) {
  if (cell.kind === "set") {
    if (cell.items.length === 0) return <span className="text-fg-3">{cell.missing}</span>;
    return (
      <ul className="flex flex-wrap gap-1.5">
        {cell.items.map((item) => {
          const shared = row.shared.includes(item);
          return (
            <li
              key={item}
              className={cx(
                "inline-flex min-h-6 items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[0.75rem] font-medium leading-tight",
                shared ? "border-line bg-surface-2 text-fg-2" : "border-accent-line bg-accent-soft text-accent",
              )}
            >
              {!shared && (
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="shrink-0">
                  <path d="M4 0.5L7.5 4L4 7.5L0.5 4Z" fill="currentColor" />
                </svg>
              )}
              {item}
              {!shared && <span className="sr-only"> (differs)</span>}
            </li>
          );
        })}
      </ul>
    );
  }
  if (row.key === "doi") {
    const url = doiUrl(cell.text);
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[0.8125rem] text-accent underline decoration-accent-line underline-offset-4 hover:decoration-current">
        {cell.text}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <span className="break-all font-mono text-[0.8125rem]">{cell.text}</span>
    );
  }
  const mono = ["o2", "p", "flow", "rows", "pubs"].includes(row.key);
  return <span className={cx(cell.missing ? "text-fg-3" : "text-fg", mono && !cell.missing && "font-mono text-[0.8125rem]")}>{cell.text}</span>;
}

/**
 * Attributes down, investigations across. A row whose values differ gets a
 * diamond marker and the word "Differs"; inside set rows, items only some
 * columns share are accent chips with a diamond, shared items stay neutral.
 */
export function CompareMatrix({ invs, rows }: { invs: Investigation[]; rows: MatrixRow[] }) {
  return (
    <div className="relative overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]" tabIndex={0} role="region" aria-label="Comparison matrix (scrolls sideways on small screens)">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="sr-only">
          Attributes of {invs.map((i) => i.acronym).join(", ")} side by side. Rows marked Differs have different values.
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="type-label w-[11rem] px-4 py-4 text-left align-bottom font-medium text-fg-3">
              Attribute
            </th>
            {invs.map((inv, i) => {
              const s = SERIES_STYLES[i];
              return (
                <th key={inv.psiId} scope="col" className="px-4 py-4 text-left align-bottom">
                  <span className="flex items-center gap-2">
                    <SeriesSwatch shape={s.shape} tone={s.tone} hollow={s.hollow} />
                    <Link href={`/explore/${inv.psiId}`} prefetch={false} className="type-title text-fg underline decoration-line underline-offset-4 hover:text-accent hover:decoration-current">
                      {inv.acronym}
                    </Link>
                  </span>
                  <span className="mt-1 block font-mono text-xs font-normal text-fg-3">{inv.psiId}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={cx("border-b border-line last:border-b-0", !row.same && "bg-[color-mix(in_oklab,var(--accent-soft)_35%,transparent)]")}>
              <th scope="row" className="px-4 py-3.5 text-left align-top font-normal">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-fg">{row.label}</span>
                  {row.si && <SiChip />}
                </span>
                <span className={cx("mt-1 inline-flex items-center gap-1.5 text-xs", row.same ? "text-fg-3" : "text-accent")}>
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                    {row.same ? <rect x="0.75" y="3.25" width="6.5" height="1.5" fill="currentColor" /> : <path d="M4 0.5L7.5 4L4 7.5L0.5 4Z" fill="currentColor" />}
                  </svg>
                  {row.same ? "Same" : "Differs"}
                </span>
              </th>
              {row.cells.map((cell, i) => (
                <td key={invs[i].psiId} className="px-4 py-3.5 align-top text-fg-2">
                  <CellBody cell={cell} row={row} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
