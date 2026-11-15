import Link from "next/link";
import { ButtonLink, Callout, Icon, PageHero, ProvenanceBadge } from "@/components/ui";
import { ExternalLink, SectionHead } from "@/components/materials/parts";
import { GravityAxis, GravityStrip, StripMarker } from "@/components/gravity/GravityStrip";
import {
  BURN_LABEL, CHALLENGE_URL, FACT_SHEET_URL, FM2_URL, LEVELS, LUCI_URL, SURFACE_GRAVITY, materialBounds, pairTally, parseSaffireII,
} from "@/components/gravity/gravity";
import { PSI99_SOURCE_FILE } from "@/components/gravity/psi99Table";
import { HALO_DATA } from "@/lib/data/load";
import { BASS_FACT } from "@/lib/engine/facts";
import { doiUrl } from "@/lib/explore";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Partial-gravity bounds",
  description:
    "PSI holds no Moon or Mars gravity combustion data. What exists at microgravity and at 1 g for each cabin material, the untested band between, and the missions that will fill it.",
  path: "/gravity",
});

const r1 = (x: number) => Number(x.toFixed(1));
const g2 = (x: number) => x.toFixed(2);
const rangeText = (r: [number, number] | null, unit: string) => (r ? (r[0] === r[1] ? `${r1(r[0])}${unit}` : `${r1(r[0])}–${r1(r[1])}${unit}`) : null);

export default function GravityPage() {
  const pairs = parseSaffireII();
  const tally = pairTally(pairs);
  const bounds = materialBounds(HALO_DATA);
  const invCount = HALO_DATA.investigations.length;
  const efield = HALO_DATA.investigations.find((i) => i.psiId === "PSI-22");
  const efieldRows = HALO_DATA.tests.filter((t) => t.psiId === "PSI-22").length;
  const saffire2 = HALO_DATA.investigations.find((i) => i.psiId === "PSI-99");
  const moon = LEVELS[1];
  const mars = LEVELS[2];

  return (
    <main>
      <PageHero
        titleId="gravity-title"
        visual="orb"
        eyebrow="Partial gravity"
        title="Bounds, not predictions"
        lede={`None of the ${invCount} PSI combustion investigations ran at Moon or Mars gravity. What exists sits at the two ends: microgravity in orbit and 1 g on the ground. HALO shows both ends per material and leaves the middle honestly blank.`}
        actions={
          <>
            <ButtonLink href="#bounds" iconEnd={<Icon name="arrowRight" size={16} className="rotate-90" />}>
              See the bounds
            </ButtonLink>
            <ButtonLink href="/materials" variant="secondary" prefetch={false}>
              Look up a material
            </ButtonLink>
          </>
        }
        meta={
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              ["Moon", `${g2(moon.g)} g`],
              ["Mars", `${g2(mars.g)} g`],
              ["PSI tests at either", "None"],
              ["Saffire-II 1 g pairs", String(tally.total)],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <dt className="type-label text-fg-3">{k}</dt>
                <dd className="font-mono text-xl tracking-[-0.02em] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        }
      />

      <div className="container-wide flex flex-col gap-16 pb-24 pt-12 sm:pt-16">
        <section aria-labelledby="bounds" className="flex scroll-mt-[calc(var(--nav-h)+1rem)] flex-col gap-6">
          <SectionHead
            id="bounds"
            title="Each material, from orbit to the ground"
            lede="A filled end means NASA has tested the material at that gravity. The hatched span between has no PSI data; the tinted part is the Moon-to-Mars range habitats will live in."
          />
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]">
            <div className="hidden grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,13rem)] gap-6 border-b border-line px-5 py-3 md:grid">
              <span className="type-label text-fg-3">Microgravity evidence</span>
              <GravityAxis />
              <span className="type-label text-right text-fg-3">1 g evidence</span>
            </div>
            <ul>
              {bounds.map((b) => {
                const micro = b.psiRows > 0 ? "psi" : b.litPoints > 0 ? "lit" : "none";
                const oneGText = b.oneG.length
                  ? b.oneG.map((p) => `${p.sample}: ${BURN_LABEL[p.oneG].toLowerCase()}`).join("; ")
                  : null;
                const label = `${b.label}: microgravity ${micro === "none" ? "no evidence" : `${b.psiRows} PSI rows and ${b.litPoints} Saffire points`}; Moon and Mars untested in PSI${b.luci ? "; LUCI burned it in simulated lunar gravity, results outside PSI" : ""}; 1 g ${b.oneG.length ? `${b.oneG.length} Saffire-II pairs` : "no paired test in PSI"}.`;
                return (
                  <li key={b.id} className="grid gap-4 border-b border-line px-5 py-5 last:border-b-0 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,13rem)] md:items-center md:gap-6">
                    <div className="flex flex-col gap-1">
                      <p className="type-title text-fg">{b.label}</p>
                      <p className="text-sm text-fg-2">
                        {b.psiRows > 0 ? (
                          <>
                            <span className="font-mono text-fg">{b.psiRows}</span> PSI rows
                            {rangeText(b.psiO2, "%") && <> at <span className="font-mono">{rangeText(b.psiO2, "%")}</span> O₂</>}
                          </>
                        ) : (
                          "No PSI rows"
                        )}
                      </p>
                      {b.litPoints > 0 && (
                        <p className="text-sm text-fg-2">
                          <span className="font-mono text-fg">{b.litPoints}</span> Saffire flight {b.litPoints === 1 ? "point" : "points"}
                          {rangeText(b.litO2, "%") && <> at <span className="font-mono">{rangeText(b.litO2, "%")}</span> O₂</>}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="md:hidden">
                        <GravityAxis />
                      </div>
                      <GravityStrip micro={micro} oneG={b.oneG.length > 0} luci={b.luci} label={label} />
                    </div>
                    <div className="flex flex-col gap-1 md:text-right">
                      {oneGText ? (
                        <>
                          <p className="text-sm text-fg">
                            <span className="font-mono">{b.oneG.length}</span> Saffire-II 1 g {b.oneG.length === 1 ? "burn" : "burns"}
                          </p>
                          <p className="text-xs leading-relaxed text-fg-3">{oneGText}</p>
                        </>
                      ) : (
                        <p className="text-sm text-fg-3">No paired 1 g burn in PSI</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line bg-surface-2/40 px-5 py-3 text-xs text-fg-3">
              <span className="inline-flex items-center gap-1.5"><StripMarker kind="psi" /> PSI rows tested in microgravity</span>
              <span className="inline-flex items-center gap-1.5"><StripMarker kind="lit" /> Saffire literature only</span>
              <span className="inline-flex items-center gap-1.5"><StripMarker kind="oneg" /> Paired 1 g test (PSI-99)</span>
              <span className="inline-flex items-center gap-1.5"><StripMarker kind="none" /> Nothing at this end</span>
              <span className="inline-flex items-center gap-1.5"><StripMarker kind="luci" /> LUCI, simulated lunar gravity (outside PSI)</span>
            </div>
          </div>
          <p className="max-w-[72ch] text-xs text-fg-3">
            Moon {g2(moon.g)} g and Mars {g2(mars.g)} g are surface gravity ({SURFACE_GRAVITY.moon} and {SURFACE_GRAVITY.mars} m/s²) over Earth&apos;s{" "}
            {SURFACE_GRAVITY.earth} m/s², from <ExternalLink href={FACT_SHEET_URL}>NASA&apos;s Planetary Fact Sheet</ExternalLink>. Kapton, Teflon and Pyrell
            appear only in the smoke-detector runs, which measured smoke rather than burning, so they have no row here.
          </p>
        </section>

        <section aria-labelledby="pairs" className="flex flex-col gap-5">
          <SectionHead
            id="pairs"
            title="The one table with both ends"
            aside={<span className="inline-flex items-center gap-2">PSI-99 <ProvenanceBadge provenance="measured" /></span>}
            lede={`Saffire-II's PSI table lists, for each sample burned in microgravity, how far the same material burned at 1 g. In ${tally.oneGFurther} of ${tally.comparable} comparable samples the 1 g burn went further, in ${tally.same} the two matched, and in ${tally.microFurther} microgravity went further.`}
          />
          <div className="relative overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]" tabIndex={0} role="region" aria-label="Saffire-II microgravity and 1 g burns">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <caption className="sr-only">Saffire-II samples: microgravity burn and spread next to the 1 g burn and spread, verbatim from the PSI-99 table</caption>
              <thead>
                <tr className="border-b border-line">
                  {["Sample", "Material", "Thickness", "Flow", "O₂ (%)", "Microgravity burn", "Microgravity spread", "1 g burn", "1 g spread", "Further at"].map((h) => (
                    <th key={h} scope="col" className="type-label whitespace-nowrap px-4 py-3 text-left font-medium text-fg-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pairs.map((p) => (
                  <tr key={p.sample} className="border-b border-line align-top last:border-b-0">
                    <td className="px-4 py-2.5 font-mono text-fg">{p.sample}</td>
                    <td className="px-4 py-2.5 text-fg">{p.material}</td>
                    <td className="px-4 py-2.5 font-mono text-fg-2">{p.thickness}</td>
                    <td className="px-4 py-2.5 text-fg-2">
                      <span className="font-mono">{p.flow}</span> <span className="text-fg-3">{p.flowDirection.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-fg-2">{p.o2}</td>
                    <td className="px-4 py-2.5 text-fg">
                      <span className="font-mono">{p.microBurn}</span>
                      <span className="block text-xs text-fg-3">{BURN_LABEL[p.micro]}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-fg-2">{p.microSpread}</td>
                    <td className="px-4 py-2.5 text-fg">
                      <span className="font-mono">{p.oneGBurn}</span>
                      <span className="block text-xs text-fg-3">{BURN_LABEL[p.oneG]}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-fg-2">{p.oneGSpread}</td>
                    <td className="px-4 py-2.5 text-fg-2">
                      {p.further === "oneG" ? "1 g" : p.further === "micro" ? "Microgravity" : p.further === "same" ? "Same" : "Not comparable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-[72ch] text-xs text-fg-3">
            Values are PSI&apos;s text, verbatim ({PSI99_SOURCE_FILE}). The table does not state the 1 g test atmosphere or flow. A burn length equal to
            the sample length counts as a full burn; &ldquo;~ 0&rdquo; as no sustained burn.{" "}
            {saffire2 && doiUrl(saffire2.datasetDoi) && <ExternalLink href={doiUrl(saffire2.datasetDoi)!}>Saffire-II dataset (DOI {saffire2.datasetDoi})</ExternalLink>}
          </p>
          <Callout tone="info" title="Gravity does not push flammability one way">
            <p>
              In these Saffire-II burns, Earth gravity usually burned further. Near the oxygen limit the BASS finding points the other way:
              &ldquo;{BASS_FACT.value}.&rdquo; Because the direction flips with flow and oxygen, a Moon or Mars value cannot be read off a straight
              line between the ends. The ends bound what has been seen; they do not predict the middle.
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ProvenanceBadge provenance="literature" />
              {BASS_FACT.source.url && <ExternalLink href={BASS_FACT.source.url}>{BASS_FACT.source.note}</ExternalLink>}
            </p>
          </Callout>
        </section>

        {efield && (
          <section aria-labelledby="efield" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <SectionHead id="efield" title="E-FIELD: the closest PSI gets to dialling gravity" aside={efield.psiId} />
              <p className="max-w-[62ch] text-fg-2">
                Without gravity a flame has no buoyant plume. E-FIELD put an electric field across small gas flames, and the field drags the
                flame&apos;s charged molecules along with it, creating a flow that does some of the work buoyancy does on Earth. The challenge
                names it as the PSI investigation that mimicked partial gravity.
              </p>
              <p className="max-w-[62ch] text-fg-2">
                It is an analogue, not a gravity test: the fuels were gas jets, not cabin solids, and the field is not a calibrated stand-in for
                a Moon or Mars g level. HALO counts its <span className="font-mono text-fg">{efieldRows}</span> eligible rows as gas-flame
                evidence only.
              </p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <Link href={`/explore/${efield.psiId}`} prefetch={false} className="text-accent underline decoration-accent-line underline-offset-4 hover:decoration-current">
                  {efield.acronym} dossier
                </Link>
                {doiUrl(efield.datasetDoi) && <ExternalLink href={doiUrl(efield.datasetDoi)!}>Dataset DOI {efield.datasetDoi}</ExternalLink>}
                <ExternalLink href={CHALLENGE_URL}>Challenge statement</ExternalLink>
              </p>
            </div>
            <blockquote className="self-start rounded-[var(--radius-lg)] border border-line bg-surface-1 p-6 shadow-[var(--inner-highlight),var(--elev-1)]">
              <p className="type-label text-fg-3">PSI objective, {efield.psiId}</p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg">{efield.objective}</p>
            </blockquote>
          </section>
        )}

        <section aria-labelledby="vehicles" className="flex flex-col gap-5">
          <SectionHead
            id="vehicles"
            title="What will fill the middle"
            lede="Two NASA efforts aim at lunar gravity. Neither has data in PSI yet."
          />
          <ol className="grid gap-5 md:grid-cols-2">
            <li className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-1 p-6 shadow-[var(--inner-highlight),var(--elev-1)]">
              <p className="flex items-center gap-2">
                <StripMarker kind="luci" />
                <span className="type-title text-fg">LUCI</span>
                <span className="type-label text-fg-3">Flown · simulated lunar g</span>
              </p>
              <p className="text-fg-2">
                The Lunar Combustion Investigation spun a suborbital rocket so its burn chamber felt lunar gravity, and burned a cotton-fiberglass
                fabric and an acrylic rod in air. Its results are in a NASA technical report, not in PSI, so HALO does not grade on them.
              </p>
              <ExternalLink href={LUCI_URL} className="self-start text-sm">
                NTRS: Lunar Combustion Investigation flammability results
              </ExternalLink>
            </li>
            <li className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-1 p-6 shadow-[var(--inner-highlight),var(--elev-1)]">
              <p className="flex items-center gap-2">
                <StripMarker kind="fm2" />
                <span className="type-title text-fg">FM2</span>
                <span className="type-label text-fg-3">Planned · on the Moon</span>
              </p>
              <p className="text-fg-2">
                Flammability of Materials on the Moon is a sealed, self-operating burn chamber: NASA calls it the first combustion experiment
                on another planetary body. It burns its fuel samples one at a time in atmospheres planned for future lunar habitats or
                vehicles. NASA&apos;s page does not list which materials, so HALO does not attach it to any material above.
              </p>
              <ExternalLink href={FM2_URL} className="self-start text-sm">
                NASA Glenn: FM2
              </ExternalLink>
            </li>
          </ol>
          <p className="max-w-[70ch] text-fg-2">
            When their data reaches PSI, HALO&apos;s pipeline can take it in and every brief re-grades. Until then, every Fire Brief carries the flag
            &ldquo;No partial-gravity data in PSI&rdquo;.
          </p>
        </section>

        <nav aria-label="Related tools" className="flex flex-wrap gap-3 border-t border-line pt-8">
          <ButtonLink href="/materials" prefetch={false} iconEnd={<Icon name="arrowRight" size={16} />}>
            Look up a material
          </ButtonLink>
          <ButtonLink href="/investigations/compare?ids=PSI-25,PSI-99,PSI-22" variant="secondary" prefetch={false}>
            Compare with E-FIELD
          </ButtonLink>
          <ButtonLink href="/findings" variant="ghost" prefetch={false}>
            All findings
          </ButtonLink>
        </nav>
      </div>
    </main>
  );
}
