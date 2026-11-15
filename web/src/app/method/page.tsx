import type { ReactNode } from "react";
import { DistanceFormula, Equation, EvidenceRings, Frac, WeightsBar } from "@/components/content/MethodFigures";
import { Article, Callout, GradeBadge, PageHero, ProvenanceBadge, TBody, THead, TableFrame, Td, Th, Tr } from "@/components/ui";
import { HALO_DATA } from "@/lib/data/load";
import { buildBrief } from "@/lib/engine/brief";
import { scaledDistance } from "@/lib/engine/distance";
import { GRADE_RINGS, classGrade } from "@/lib/engine/grade";
import { nextTests, PRESET_PRIORITY } from "@/lib/engine/nextTest";
import { PRESETS } from "@/lib/engine/presets";
import { DEFAULT_WEIGHTS } from "@/lib/engine/rank";
import type { FuelClass, Grade } from "@/lib/engine/types";
import { REFS } from "@/components/landing/references";
import { BASS_FACT } from "@/lib/engine/facts";
import { CHALLENGE_URL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Method",
  description:
    "How HALO measures evidence distance, grades coverage, ranks NASA investigations, calibrates the smoke-detector analysis, models droplet self-extinction and picks the next test to fly.",
  path: "/method",
});

const TOC = [
  { id: "distance", label: "Evidence distance" },
  { id: "eligibility", label: "Eligible tests" },
  { id: "grades", label: "Rings and grades" },
  { id: "overall", label: "Overall grade" },
  { id: "ranking", label: "Ranking" },
  { id: "detector", label: "Detector calibration" },
  { id: "extinction", label: "Extinction model" },
  { id: "next-test", label: "Next test to fly" },
  { id: "limits", label: "Limits" },
] as const;

// The distance scales, read back from the engine's own formula.
const O2_SCALE = Math.round(1 / scaledDistance(1, 0, 0, 0));
const P_SCALE = Math.round(1 / scaledDistance(0, 1, 0, 0));

const CLASS_LABEL: Record<FuelClass, string> = { solid: "Real solid", solid_surrogate: "Solid surrogate", droplet: "Droplet", gas: "Gas flame" };
const PRESET_KEYS = ["iss", "moon", "rover", "artemis", "suit"] as const;
const PSI_PER_ATM = 14.696;
const f2 = (x: number | null) => (x === null ? "none" : x.toFixed(2));

const [B_RING, C_RING, D_RING] = GRADE_RINGS;
const GRADE_ROWS: Array<{ grade: Grade; rule: string }> = [
  { grade: "A", rule: `d ≤ ${B_RING}, with O2 and pressure both measured` },
  { grade: "B", rule: `d ≤ ${B_RING}, any provenance` },
  { grade: "C", rule: `${B_RING} < d ≤ ${C_RING}` },
  { grade: "D", rule: `${C_RING} < d ≤ ${D_RING}` },
  { grade: "F", rule: `d > ${D_RING}, or no eligible test` },
];

function H2({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id}>{children}</h2>;
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default function MethodPage() {
  const data = HALO_DATA;
  const briefs = PRESET_KEYS.map((k) => ({ k, h: PRESETS[k], b: buildBrief(PRESETS[k], data) }));
  const det = data.detector;
  const lamp = det.runs.filter((r) => r.material.toLowerCase() === "lampwick");
  const lampIon = lamp.filter((r) => r.ionizationDV !== null);
  const lampCaught = lampIon.filter((r) => (r.ionizationDV as number) >= det.thresholds.ionizationDV).length;
  const ext = data.extinction;
  const samePAtm = Number((det.ambient.pressurePsia / PSI_PER_ATM).toFixed(1));
  const picks = nextTests(data.tests);
  const pName = (k: string) => (PRESETS as Record<string, { name: string }>)[k]?.name ?? k;
  const extInv = data.investigations.find((i) => i.psiId === ext.source.psiId);

  return (
    <main>
      <PageHero
        titleId="method-title"
        eyebrow="Method · deterministic, open, cited"
        title="How HALO grades the evidence"
        lede="Every grade, ranking and model in a Fire Brief comes from a short, published formula run over NASA's test data. Nothing is hand-tuned per habitat, and every threshold is on this page."
        visual="rings"
      />
      <Article toc={TOC}>
        <p>
          HALO asks one question of the data: <strong>how close has NASA actually tested to this atmosphere?</strong> The answer
          is a distance, the distance becomes a grade, and the grades, rankings and models below all read from the same{" "}
          {data.manifest.eligibleRows.toLocaleString("en-US")} eligible test rows. Grades describe evidence coverage, never safety.
        </p>

        <H2 id="distance">Evidence distance</H2>
        <p>
          Each eligible test is a point in oxygen and pressure. The distance between a habitat <var>h</var> and a test{" "}
          <var>t</var> puts both axes on one footing:
        </p>
        <DistanceFormula o2Scale={O2_SCALE} pScale={P_SCALE} />
        <p>
          The scaling is a stated judgement, not a law of physics: it lets one number answer “how near was the nearest test”.
          Flow speed and material are not part of <var>d</var>; fuel kind is handled by grading each fuel class separately.
        </p>

        <H2 id="eligibility">Eligible tests</H2>
        <p>A test row counts toward coverage only if all of these hold:</p>
        <ul>
          <li>its ambient conditions are valid (inverse flames are excluded, because their O2 is issued by the burner, not the cabin);</li>
          <li>it is not ACME Flame Design, whose oxidizer is also burner-issued;</li>
          <li>it is not a SAME or SAME-R row (those are detection data, used separately below);</li>
          <li>O2 and pressure are both present, and O2 is at most 100%.</li>
        </ul>
        <p>
          That leaves {data.manifest.eligibleRows.toLocaleString("en-US")} of {data.manifest.totalRows.toLocaleString("en-US")} rows. The
          full rules and every data fix are on the <a href="/data#eligibility">data page</a>.
        </p>

        <H2 id="grades">Rings and grades</H2>
        <p>
          For each fuel class, the nearest eligible test sets the grade. In distance space the thresholds are concentric rings:
          the halo the brief draws around your habitat. Here is {PRESETS.artemis.name}, with every eligible test that falls near it.
        </p>
        <EvidenceRings habitat={PRESETS.artemis} tests={data.tests} o2Scale={O2_SCALE} pScale={P_SCALE} />
        <TableFrame caption="Grade rules">
          <THead>
            <Tr>
              <Th>Grade</Th>
              <Th>Nearest test in that fuel class</Th>
            </Tr>
          </THead>
          <TBody>
            {GRADE_ROWS.map((g) => (
              <Tr key={g.grade}>
                <Td>
                  <GradeBadge grade={g.grade} size="sm" />
                </Td>
                <Td className="font-mono text-[0.8125rem]">{g.rule}</Td>
              </Tr>
            ))}
          </TBody>
        </TableFrame>
        <p>
          <strong>Measured</strong> means the test logged that value in its data table. Values taken from a documented setup are{" "}
          <ProvenanceBadge provenance="assumed" />, values derived from text are <ProvenanceBadge provenance="inferred" />, and
          only a test with both values measured can earn an A.
        </p>

        <H2 id="overall">Overall grade</H2>
        <p>
          The overall grade is the grade of the <strong>real solid</strong> class, because cabin materials are what burn in a
          habitat. When a solid-surrogate test sits inside the B ring (d ≤ {B_RING}), the grade rises one step, but never above
          C: a surrogate burner can show a regime has been explored, not how a real material behaves there.
        </p>
        <TableFrame caption="Grades for the five habitat presets, computed from the data">
          <THead>
            <Tr>
              <Th>Preset</Th>
              <Th numeric>O2 %</Th>
              <Th numeric>psia</Th>
              <Th numeric>Solid d</Th>
              <Th numeric>Surrogate d</Th>
              <Th>Overall</Th>
            </Tr>
          </THead>
          <TBody>
            {briefs.map(({ k, h, b }) => (
              <Tr key={k}>
                <Td className="whitespace-nowrap font-medium text-fg">{h.name}</Td>
                <Td numeric>{h.o2Pct}</Td>
                <Td numeric>{h.pressurePsia}</Td>
                <Td numeric>
                  {f2(b.byClass.solid.d)} <span className="text-fg-3">({classGrade(b.byClass.solid)})</span>
                </Td>
                <Td numeric>{f2(b.byClass.solid_surrogate.d)}</Td>
                <Td>
                  <GradeBadge grade={b.grade.grade} size="sm" />
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableFrame>
        <p>
          Where the presets come from: {PRESETS.artemis.name} ({PRESETS.artemis.o2Pct}% O2, {PRESETS.artemis.pressurePsia} psia)
          is the exploration atmosphere NASA recommended for EVA-intensive missions after its 2012 re-evaluation (
          <ExtLink href={REFS.explorationAtmosphere.url}>NTRS 20150021491</ExtLink>). The {PRESETS.moon.name} ({PRESETS.moon.o2Pct}% O2,{" "}
          {PRESETS.moon.pressurePsia} psia) is the edge of the Moon-base range the{" "}
          <ExtLink href={CHALLENGE_URL}>challenge statement</ExtLink> gives: 30% O2 or more at 10.2 psi or less.
        </p>

        <H2 id="ranking">Ranking</H2>
        <p>
          The brief orders all {data.investigations.length} investigations by a transparent weighted sum of four parts, each
          between 0 and 1. The weights are defaults; the brief shows every part and lets you move them.
        </p>
        <WeightsBar weights={DEFAULT_WEIGHTS} />
        <TableFrame caption="Ranking parts">
          <THead>
            <Tr>
              <Th>Part</Th>
              <Th numeric>Weight</Th>
              <Th>Definition</Th>
            </Tr>
          </THead>
          <TBody>
            <Tr>
              <Td className="font-medium text-fg">Closeness</Td>
              <Td numeric>{DEFAULT_WEIGHTS.proximity}</Td>
              <Td>1 / (1 + d) to the investigation’s nearest eligible test. Detection studies use the air they ran in.</Td>
            </Tr>
            <Tr>
              <Td className="font-medium text-fg">Fuel match</Td>
              <Td numeric>{DEFAULT_WEIGHTS.fuel}</Td>
              <Td>1 when a fuel class matches the habitat (solids when materials are listed, droplets when liquids are on); gas counts half.</Td>
            </Tr>
            <Tr>
              <Td className="font-medium text-fg">Hazards</Td>
              <Td numeric>{DEFAULT_WEIGHTS.hazard}</Td>
              <Td>Share of spread, extinction, smoke detection and toxicity the investigation covers.</Td>
            </Tr>
            <Tr>
              <Td className="font-medium text-fg">Evidence size</Td>
              <Td numeric>{DEFAULT_WEIGHTS.richness}</Td>
              <Td>log(1 + rows + 5 × publications), scaled to the richest investigation.</Td>
            </Tr>
          </TBody>
        </TableFrame>
        <p>Equal scores break by PSI id, so the order is deterministic.</p>

        <H2 id="detector">Detector calibration</H2>
        <p>
          The smoke analysis uses the SAME and SAME-R flight runs ({det.runs.length} runs). Each run logs a forward-scatter
          voltage, an ionization voltage change and the smoke’s median particle size. Two channels are offered:
        </p>
        <ul>
          <li>
            <strong>Scatter</strong> (ISS-style photoelectric) alarms at {det.thresholds.scatterV.toFixed(1)} V or more{" "}
            <ProvenanceBadge provenance="assumed" />. The ISS detector is certified in obscuration, not volts, so this is a
            working proxy.
          </li>
          <li>
            <strong>Ionization</strong> alarms at {det.thresholds.ionizationDV.toFixed(3)} V, the 10th percentile of the Lampwick
            (cotton) runs <ProvenanceBadge provenance="inferred" />. It flags {lampCaught} of {lampIon.length} Lampwick runs, a
            smoke every detector should see.
          </li>
        </ul>
        <Callout title="Why the obscuration channel is omitted">{det.obscurationNote}</Callout>
        <p>
          Every count uses only runs where the channel was recorded, and the brief always prints “x of y runs”. A habitat’s
          detectors “would likely miss” a material when they catch fewer than half of its runs. SAME ran at ISS air (
          {det.ambient.o2Pct}% O2, {samePAtm} atm); smoke behavior at habitat atmosphere is untested.
        </p>

        <H2 id="extinction">Extinction model</H2>
        <p>
          “Will it go out on its own?” is answered for liquid droplet fuels only, by a logistic regression fitted to{" "}
          {extInv?.acronym ?? ext.source.psiId} droplet tests with {ext.diluent} as the only diluent:
        </p>
        <Equation
          label="P of extinguishing equals one over one plus e to the minus the sum of c0, c1 times O2, c2 times log d0 and c3 times log p"
          note={`Fitted on ${ext.n} tests (${ext.nExt} self-extinctions), O2 ${ext.o2RangePct[0]}–${ext.o2RangePct[1]}%, ${ext.pRangeAtm[0]}–${ext.pRangeAtm[1]} atm. Evaluated at d₀ = ${ext.d0Mm} mm.`}
        >
          <var>P</var>
          <span className="mx-1 text-fg-3">(</span>out<span className="text-fg-3">)</span>
          <span className="mx-2 text-fg-3">=</span>
          <Frac
            num="1"
            den={
              <>
                1 + <var>e</var>
                <sup>
                  −(<var>c</var>₀ + <var>c</var>₁·O₂ + <var>c</var>₂·ln <var>d</var>₀ + <var>c</var>₃·ln <var>p</var>)
                </sup>
              </>
            }
          />
        </Equation>
        <ul>
          <li>
            <strong>Uncertainty.</strong> {ext.coefs.length} bootstrap refits. The brief shows their median and the 2.5–97.5
            percentile band <ProvenanceBadge provenance="model" />.
          </li>
          <li>
            <strong>Skill.</strong> Five-fold cross-validated ROC AUC of {ext.cvAuc.toFixed(3)}.
          </li>
          <li>
            <strong>Even odds.</strong> For a {ext.d0Mm} mm droplet at 1 atm, the 50% point is {ext.o2At50.median}% O2 (interval{" "}
            {ext.o2At50.lo}–{ext.o2At50.hi}%).
          </li>
          <li>
            <strong>Pressure.</strong> Outside {ext.pRangeAtm[0]}–{ext.pRangeAtm[1]} atm the model is evaluated at the nearest
            tested pressure and the brief flags the result as an extrapolation.
          </li>
        </ul>
        <p>It describes small liquid droplets, not cloth, film or foam.</p>

        <H2 id="next-test">Next test to fly</H2>
        <p>
          HALO searches a grid of candidate tests (real solid, droplet and gas, across oxygen and pressure) and scores each by how
          much it would shrink the presets’ nearest-test distance, treating it as a new measured test of its class. Distances are
          capped before differencing so the far-off suit does not dominate, solids count double, and each preset carries a priority:
        </p>
        <TableFrame caption="Preset priorities in the next-test score">
          <THead>
            <Tr>
              {Object.keys(PRESET_PRIORITY).map((k) => (
                <Th key={k} numeric>
                  {pName(k)}
                </Th>
              ))}
            </Tr>
          </THead>
          <TBody>
            <Tr>
              {Object.entries(PRESET_PRIORITY).map(([k, v]) => (
                <Td key={k} numeric>
                  {v}
                </Td>
              ))}
            </Tr>
          </TBody>
        </TableFrame>
        <p>Runners-up must differ from every earlier pick, so the list is not four copies of one idea. Today the search returns:</p>
        <TableFrame caption="Suggested tests, computed from the data">
          <THead>
            <Tr>
              <Th numeric>#</Th>
              <Th>Fuel</Th>
              <Th numeric>O2 %</Th>
              <Th numeric>psia</Th>
              <Th>Biggest gain</Th>
            </Tr>
          </THead>
          <TBody>
            {picks.map((p, i) => {
              const g = [...p.gains].sort((a, b) => b.before - b.after - (a.before - a.after))[0];
              return (
                <Tr key={i}>
                  <Td numeric>{i + 1}</Td>
                  <Td>{CLASS_LABEL[p.fuelClass]}</Td>
                  <Td numeric>{p.o2Pct}</Td>
                  <Td numeric>{p.pressurePsia}</Td>
                  <Td className="whitespace-nowrap">
                    {pName(g.preset)} <span className="font-mono text-fg-3">{g.before.toFixed(2)} → {g.after.toFixed(2)}</span>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </TableFrame>

        <H2 id="limits">Limits</H2>
        <ul>
          <li>
            <strong>No partial gravity.</strong> None of the {data.investigations.length} investigations ran at lunar or Martian
            gravity.
          </li>
          <li>
            <strong>Data HALO cannot use yet.</strong> These investigations will fill the gaps above, but none has data in PSI, so
            HALO names them and grades on none of them:
            <ul>
              <li>
                <ExtLink href={REFS.luci.url}>LUCI</ExtLink>, the Lunar Combustion Investigation: cotton-fiberglass fabric and
                acrylic burned in simulated lunar gravity on a spinning sounding rocket.
              </li>
              <li>
                <ExtLink href={REFS.fm2.url}>FM2</ExtLink>, Flammability of Materials on the Moon: the first combustion experiment
                planned on another planetary body, at 1/6 g.
              </li>
              <li>
                <ExtLink href={REFS.sofie.url}>SoFIE</ExtLink>, Solid Fuel Ignition and Extinction: ISS studies of how solid
                materials ignite, spread and go out.
              </li>
              <li>
                <ExtLink href={REFS.flare.url}>FLARE</ExtLink>, Flammability Limits at Reduced-g, led with JAXA: a method to
                predict microgravity flammability limits from ground tests.
              </li>
            </ul>
          </li>
          <li>
            <strong>The standard screening test may not be conservative.</strong> Spacecraft materials are screened with{" "}
            <ExtLink href={REFS.std6001.url}>NASA-STD-6001B</ExtLink> Test 1, an upward flame-spread test run in normal gravity.
            The BASS experiments found that “{BASS_FACT.value}” (
            <ExtLink href={REFS.researchersGuide.url}>A Researcher’s Guide to Combustion Science, 2015</ExtLink>). HALO’s grades
            say where microgravity tests exist near a habitat; they do not replace Test 1 or settle that question.
          </li>
          <li>
            <strong>Crew exposure limits come from the report.</strong> The Saffire VI aftermath says CO and CO2 exceeded crew
            limits. Those limits are NASA’s{" "}
            <ExtLink href={REFS.smac.url}>Spacecraft Maximum Allowable Concentrations</ExtLink> for CO (100 ppm over 24 hours,
            425 ppm over 1 hour) and NASA-STD-3001 Volume 2 for CO2 (3 mmHg averaged over 1 hour), as stated in the{" "}
            <ExtLink href={REFS.saffireLimits.url}>Saffire VI heat and smoke report</ExtLink>. HALO quotes the comparison; it
            does not recompute it.
          </li>
          <li>
            <strong>Smoke data only at ISS air.</strong> SAME ran at {det.ambient.o2Pct}% O2 and {samePAtm} atm.
          </li>
          <li>
            <strong>FLEX droplets are not cabin solids.</strong> The extinction model covers small liquid droplets only.
          </li>
          <li>
            <strong>BRE is a surrogate.</strong> The ACME BRE burner emulates a burning solid with gas; its pressures are inferred
            from the test objective.
          </li>
          <li>
            <strong>Distance is a judgement.</strong> The {O2_SCALE}-points-to-{P_SCALE}-psia scaling and the grade rings are
            choices, stated here so they can be argued with.
          </li>
          <li>
            <strong>Not a safety certification.</strong> HALO summarizes published NASA test evidence. It does not say a habitat is
            or is not fit to fly.
          </li>
        </ul>
      </Article>
    </main>
  );
}
