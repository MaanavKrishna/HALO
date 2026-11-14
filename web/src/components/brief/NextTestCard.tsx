import { briefContext } from "@/lib/brief/context";
import { CLASS_LABEL, gainId, nextId, presetName } from "@/lib/brief/pageFacts";
import type { Brief } from "@/lib/engine/types";
import { CiteMark, Num, Section } from "./parts";

/** The computed test that would close the evidence gap most across the reference habitats. */
export function NextTestCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const best = brief.nextTests[0];
  if (!best) {
    return (
      <Section id="next-test" index={7} title="The test that would help most">
        <p className="text-sm text-muted">No candidate test improves coverage for the reference habitats.</p>
      </Section>
    );
  }
  const num = (id: string) => Number(ctx.fact(id)?.value);
  const rows = best.gains
    .map((g) => ({
      preset: g.preset,
      before: num(gainId(0, g.preset, "before")),
      after: num(gainId(0, g.preset, "after")),
    }))
    .filter((r) => Number.isFinite(r.before) && Number.isFinite(r.after));
  const helped = rows.filter((r) => r.after < r.before);
  const notHelped = rows.filter((r) => !(r.after < r.before));
  const scale = Math.max(1e-9, ...rows.map((r) => r.before));

  return (
    <Section
      id="next-test"
      index={7}
      title="The test that would help most"
      kicker="Computed by searching candidate conditions for the single new test that shrinks the evidence distance most across the reference habitats."
    >
      <div className="rounded-lg border border-rule bg-surface p-5 sm:p-6" data-next-test>
        <p className="text-xs text-muted">Run next</p>
        <p className="wide mt-1 text-2xl font-bold leading-tight sm:text-3xl">
          {CLASS_LABEL[best.fuelClass]} at <Num brief={brief} id={nextId(0, "oxygen")} cite={false} /> O<sub>2</sub>,{" "}
          <Num brief={brief} id={nextId(0, "pressure")} />
        </p>

        <h3 className="mt-6 text-sm font-semibold">Evidence distance for each reference habitat</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {helped.map((r) => (
            <li key={r.preset} className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_9rem]">
              <span className="font-medium">{presetName(r.preset)}</span>
              <span className="relative h-2.5 rounded-full bg-rule" aria-hidden="true">
                <span className="absolute inset-y-0 left-0 rounded-full bg-[repeating-linear-gradient(135deg,var(--rule-strong)_0_1.5px,transparent_1.5px_4px)]" style={{ width: `${(r.before / scale) * 100}%` }} />
                <span className="absolute inset-y-0 left-0 rounded-full bg-flame" style={{ width: `${(r.after / scale) * 100}%` }} />
              </span>
              <span className="col-span-2 font-mono text-xs text-muted sm:col-span-1 sm:text-right">
                <span className="num">{r.before}</span> → <span className="num font-semibold text-ink">{r.after}</span>
              </span>
            </li>
          ))}
        </ul>
        {notHelped.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            <span className="font-medium text-ink">Not helped:</span>{" "}
            {notHelped.map((r) => presetName(r.preset)).join(", ")} (no change in evidence distance).
          </p>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>Lower is better.</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2 w-4 rounded-full bg-[repeating-linear-gradient(135deg,var(--rule-strong)_0_1.5px,transparent_1.5px_4px)]" />
            hatched: distance today
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2 w-4 rounded-full bg-flame" />
            solid: distance after this test
          </span>
          <CiteMark n={ctx.cite(gainId(0, best.gains[0].preset, "before"))} />
        </p>

        {brief.nextTests.length > 1 && (
          <div className="mt-6 border-t border-rule pt-4">
            <h3 className="text-sm font-semibold">Also worth running</h3>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {brief.nextTests.slice(1).map((t, i) => (
                <li key={i} className="rounded-full border border-rule px-3 py-1">
                  {CLASS_LABEL[t.fuelClass]} · <Num brief={brief} id={nextId(i + 1, "oxygen")} cite={false} /> ·{" "}
                  <Num brief={brief} id={nextId(i + 1, "pressure")} cite={false} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}
