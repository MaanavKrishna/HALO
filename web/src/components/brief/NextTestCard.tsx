import { briefContext } from "@/lib/brief/context";
import { CLASS_LABEL, gainId, nextId, presetName } from "@/lib/brief/pageFacts";
import type { Brief } from "@/lib/engine/types";
import { Panel } from "@/components/ui/Panel";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { CiteMark, Num, Section } from "./parts";

/** The computed test that would close the evidence gap most across the reference habitats. */
export function NextTestCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const best = brief.nextTests[0];
  if (!best) {
    return (
      <Section id="next-test" title="The test that would help most">
        <p className="text-sm text-fg-2">No candidate test improves coverage for the reference habitats.</p>
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
      title="The test that would help most"
      kicker="Computed by searching candidate conditions for the single new test that shrinks the evidence distance most across the reference habitats."
    >
      <Panel label="Run next · computed" meta={<ProvenanceBadge provenance="model" />} data-next-test data-print-keep="" bodyClassName="p-5 sm:p-7">
        <p className="type-headline text-balance text-fg">
          {CLASS_LABEL[best.fuelClass]} at{" "}
          <span className="font-mono tracking-[-0.03em]">
            <Num brief={brief} id={nextId(0, "oxygen")} cite={false} />
          </span>{" "}
          O<sub>2</sub>,{" "}
          <span className="font-mono tracking-[-0.03em]">
            <Num brief={brief} id={nextId(0, "pressure")} />
          </span>
        </p>

        <h3 className="type-label mt-8 text-fg-3">Evidence distance for each reference habitat</h3>
        <ul className="mt-4 flex flex-col gap-4">
          {helped.map((r) => (
            <li key={r.preset} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_8.5rem]">
              <span className="font-medium text-fg">{presetName(r.preset)}</span>
              <span className="col-span-2 row-start-2 flex flex-col gap-1 sm:col-span-1 sm:row-start-auto" aria-hidden="true">
                <span className="relative block h-1.5 rounded-full bg-surface-2">
                  <span className="hatch-idle absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.before / scale) * 100}%` }} />
                </span>
                <span className="relative block h-1.5 rounded-full bg-surface-2">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-accent shadow-[inset_0_1px_0_var(--fill-highlight)]" style={{ width: `${(r.after / scale) * 100}%` }} />
                </span>
              </span>
              <span className="text-right font-mono text-[0.8125rem] text-fg-2">
                <span className="num">{r.before}</span>
                <span className="mx-1.5 text-fg-3">→</span>
                <span className="num font-semibold text-fg">{r.after}</span>
              </span>
            </li>
          ))}
        </ul>
        {notHelped.length > 0 && (
          <p className="mt-5 text-sm text-fg-2">
            <span className="font-medium text-fg">Not helped:</span> {notHelped.map((r) => presetName(r.preset)).join(", ")} (no change in evidence distance).
          </p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.8125rem] text-fg-2">
          <span>Lower is better.</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="hatch-idle inline-block h-1.5 w-4 rounded-full" />
            distance today
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-1.5 w-4 rounded-full bg-accent" />
            distance after this test
          </span>
          <CiteMark n={ctx.cite(gainId(0, best.gains[0].preset, "before"))} />
        </p>

        {brief.nextTests.length > 1 && (
          <div className="mt-7 border-t border-line pt-5">
            <h3 className="type-label text-fg-3">Also worth running</h3>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {brief.nextTests.slice(1).map((t, i) => (
                <li key={i} className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface-2 px-3 text-fg">
                  {CLASS_LABEL[t.fuelClass]}
                  <span className="text-fg-3">·</span>
                  <span className="font-mono text-[0.8125rem]">
                    <Num brief={brief} id={nextId(i + 1, "oxygen")} cite={false} /> · <Num brief={brief} id={nextId(i + 1, "pressure")} cite={false} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </Section>
  );
}
