import { briefContext } from "@/lib/brief/context";
import { safeUrl } from "@/lib/brief/citations";
import { CLASS_LABEL, NEXT_LITERATURE_DISTANCE, archiveId, archiveMissionLabel, gainId, nextId, presetName } from "@/lib/brief/pageFacts";
import { HALO_DATA } from "@/lib/data/load";
import { GRADE_RINGS } from "@/lib/engine/grade";
import { scaledDistance } from "@/lib/engine/distance";
import { missionInPsi, shortMaterial } from "@/lib/engine/literatureWindow";
import type { Brief } from "@/lib/engine/types";
import { Panel } from "@/components/ui/Panel";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { BriefIcon } from "./icons";
import { CiteMark, Num, Section } from "./parts";

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

interface GainRow {
  preset: string;
  before: number;
  after: number;
}

/** Before/after evidence-distance bars per reference habitat. */
function GainBars({ rows, label }: { rows: GainRow[]; label: string }) {
  const scale = Math.max(1e-9, ...rows.map((r) => r.before));
  return (
    <ul className="mt-4 flex flex-col gap-4" aria-label={label}>
      {rows.map((r) => (
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
  );
}

/**
 * The computed test that would close the evidence gap most across the
 * reference habitats, read against the Saffire flights that already burned
 * real solids nearby (NASA reports), and the partial-gravity
 * investigations (LUCI, FM2) that are the vehicles for what PSI lacks.
 */
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
    .map((g) => ({ preset: g.preset, before: num(gainId(0, g.preset, "before")), after: num(gainId(0, g.preset, "after")) }))
    .filter((r) => Number.isFinite(r.before) && Number.isFinite(r.after));
  const helped = rows.filter((r) => r.after < r.before);
  const notHelped = rows.filter((r) => !(r.after < r.before));
  const archive = brief.archiveGains
    .map((g) => ({ preset: g.preset, before: num(archiveId(g.preset, "before")), after: num(archiveId(g.preset, "after")) }))
    .filter((r) => Number.isFinite(r.before) && Number.isFinite(r.after) && r.after < r.before);

  // Saffire runs within the C-ring of the pick: the flights that already burned real solids near here.
  const nearLit =
    best.fuelClass === "solid"
      ? HALO_DATA.literature.filter(
          (r) => r.o2Pct !== null && r.pressurePsia !== null && scaledDistance(best.o2Pct, best.pressurePsia, r.o2Pct, r.pressurePsia) <= GRADE_RINGS[1],
        )
      : [];
  const missions = uniq(nearLit.map((r) => r.mission.replace(/-/g, " ")));
  const nearLitOutsidePsi = nearLit.every((r) => !missionInPsi(r.mission, HALO_DATA.tests));
  const archMissions = archiveMissionLabel(HALO_DATA);
  const materials = uniq(nearLit.map((r) => (/pmma/i.test(r.material) ? "PMMA" : /cotton/i.test(r.material) && !/sibal/i.test(r.material) ? "cotton" : shortMaterial(r.material))));
  const archivedSame =
    ctx.fact("next-archived-oxygen")?.value === best.o2Pct && ctx.fact("next-archived-pressure")?.value === best.pressurePsia;
  const vehicles = ["vehicle-luci", "vehicle-fm"].map((id) => ctx.fact(id)).filter((f) => f !== undefined);

  return (
    <Section
      id="next-test"
      title="The test that would help most"
      kicker="Computed by searching candidate conditions for the single new test that shrinks the evidence distance most across the reference habitats, then read against flights that already burned real materials nearby."
    >
      <Panel label="Run next" meta={<ProvenanceBadge provenance="computed" />} data-next-test data-print-keep="" bodyClassName="p-5 sm:p-7">
        <p className="type-headline text-balance tabular-nums text-fg">
          {CLASS_LABEL[best.fuelClass]} at <Num brief={brief} id={nextId(0, "oxygen")} cite={false} /> O<sub>2</sub>,{" "}
          <Num brief={brief} id={nextId(0, "pressure")} />
        </p>

        {missions.length > 0 && ctx.fact(NEXT_LITERATURE_DISTANCE) ? (
          <div className="mt-3 flex max-w-[64ch] flex-col gap-2.5 text-sm text-pretty text-fg-2" data-next-literature>
            <p>
              <span className="font-medium text-fg">This is not a first burn.</span> {list(missions)} already burned {list(materials)} near here (the
              nearest run sits at evidence distance <Num brief={brief} id={NEXT_LITERATURE_DISTANCE} />) <ProvenanceBadge provenance="literature" className="align-middle" />.{" "}
              {nearLitOutsidePsi ? "Those flights are NASA reports, not PSI test rows." : "Their spread data come from NASA reports."}
            </p>
            <p>
              <span className="font-medium text-fg">The gap is the archive:</span> no PSI dataset holds measured flame spread and extinction for real
              cabin materials at these conditions. HALO keeps this pick rather than skipping it, because a few large-sample burns reported in papers
              cannot be graded, compared or modelled the way archived test rows can.
            </p>
          </div>
        ) : (
          <p className="mt-3 max-w-[60ch] text-sm text-pretty text-fg-2">A new real-solid test at this point, with its data archived in PSI.</p>
        )}

        <h3 className="type-label mt-8 text-fg-3">Evidence distance for each reference habitat, after this test</h3>
        <GainBars rows={helped} label="Evidence distance today and after this test" />
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
            distance after
          </span>
          <CiteMark n={ctx.cite(gainId(0, best.gains[0].preset, "before"))} />
        </p>

        {archive.length > 0 && (
          <div className="mt-8 border-t border-line pt-6" data-next-archive>
            <h3 className="type-label text-fg-3">If the {archMissions} runs were archived in PSI</h3>
            <p className="mt-2 max-w-[64ch] text-sm text-pretty text-fg-2">
              Counting the {archMissions} runs not yet in PSI as real-solid coverage shows what archiving them would already buy, before any new flight:
            </p>
            <GainBars rows={archive} label={`Real-solid evidence distance today and with the ${archMissions} runs archived`} />
            {ctx.fact("next-archived-oxygen") && (
              <p className="mt-4 max-w-[64ch] text-sm text-pretty text-fg-2">
                The best new real-solid test would then {archivedSame ? "still be" : "move to"}{" "}
                <span className="font-medium text-fg">
                  <Num brief={brief} id="next-archived-oxygen" cite={false} /> O<sub>2</sub>, <Num brief={brief} id="next-archived-pressure" cite={false} />
                </span>
                .<CiteMark n={ctx.cite("next-archived-oxygen")} />
              </p>
            )}
          </div>
        )}

        {vehicles.length > 0 && (
          <div className="mt-8 border-t border-line pt-6" data-next-vehicles>
            <h3 className="type-label text-fg-3">Vehicles for the partial-gravity gap</h3>
            <p className="mt-2 max-w-[64ch] text-sm text-pretty text-fg-2">
              No PSI investigation ran at Moon or Mars gravity. That is the next gap, and NASA&rsquo;s own investigations are the way to fill it:
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {vehicles.map((f) => {
                const url = safeUrl(f.source.url);
                return (
                  <li key={f.id} className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 text-sm">
                    <p className="font-semibold text-fg">{f.label}</p>
                    <p className="mt-1 text-pretty text-fg-2">
                      {String(f.value)}.<CiteMark n={ctx.cite(f.id)} />
                    </p>
                    {url && (
                      <a href={url} rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-accent underline-offset-4 hover:underline">
                        NASA page
                        <BriefIcon name="external" size={13} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

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
