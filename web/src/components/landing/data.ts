import "server-only";
import { CLASS_LABEL, PRESET_ORDER, testSource } from "@/lib/brief/pageFacts";
import { HALO_DATA } from "@/lib/data/load";
import { buildBrief } from "@/lib/engine/brief";
import { sensorWhatIf } from "@/lib/engine/detection";
import { detectorSource } from "@/lib/engine/flags";
import { GRADE_RINGS } from "@/lib/engine/grade";
import { literatureInWindow, literatureWindowSentence } from "@/lib/engine/literatureWindow";
import { PRESETS } from "@/lib/engine/presets";
import type { FuelClass, Source } from "@/lib/engine/types";
import { habitatToQuery } from "@/lib/engine/url";

/**
 * Everything the landing page shows, computed once at build time from
 * HALO_DATA and the engine. No number on the page is typed by hand.
 */

const r1 = (x: number) => Number(x.toFixed(1));
const r2 = (x: number) => Number(x.toFixed(2));
const D = HALO_DATA;

export const briefHref = (k: keyof typeof PRESETS) => `/brief?${habitatToQuery(PRESETS[k])}`;
export const doiUrl = (doi: string) => `https://doi.org/${doi}`;
export const sourceUrl = (s: Source) => (s.doi ? doiUrl(s.doi) : s.url);

// ---- The problem: habitat air versus the real-solid record ----
const solids = D.tests.filter((t) => t.fuelClass === "solid");
const richest = solids.reduce((a, b) => (b.o2Pct > a.o2Pct ? b : a));
const moon = PRESETS.moon;
const inMoon = D.tests.filter((t) => t.o2Pct >= moon.o2Pct && t.pressurePsia <= moon.pressurePsia);
const litWindow = literatureInWindow(D, moon.o2Pct, moon.pressurePsia);
const solidPressures = [...new Set(solids.map((t) => r1(t.pressurePsia)))];

export const problem = {
  richestSolid: {
    o2: richest.o2Pct,
    o2Src: richest.o2Src,
    pressure: r1(richest.pressurePsia),
    acronym: richest.acronym,
    psiId: richest.psiId,
    source: testSource(D, richest),
  },
  artemis: PRESETS.artemis,
  gap: r1(PRESETS.artemis.o2Pct - richest.o2Pct),
  solidCount: solids.length,
  /** Every real-solid test ran at this single pressure, when there is only one. */
  solidPressure: solidPressures.length === 1 ? solidPressures[0] : null,
  moonWindow: { o2: moon.o2Pct, p: moon.pressurePsia, tests: inMoon.length, solids: inMoon.filter((t) => t.fuelClass === "solid").length },
  /** Real solids burned in the Moon envelope outside PSI (NASA reports); stated, never graded on. */
  literature: litWindow ? { sentence: literatureWindowSentence(litWindow), url: litWindow.sourceUrls[0], runs: litWindow.rows.length, missions: litWindow.missions.join(", ") } : null,
  /** O2 of every real-solid test (rounded to 0.5 points), with counts, for the strip plot. */
  strip: Object.entries(
    solids.reduce<Record<string, number>>((acc, t) => {
      const k = String(Math.round(t.o2Pct * 2) / 2);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([o2, n]) => ({ o2: Number(o2), n })),
  minSolidO2: Math.min(...solids.map((t) => t.o2Pct)),
  habitats: (["iss", "moon", "artemis"] as const).map((k) => ({ key: k, name: PRESETS[k].name, o2: PRESETS[k].o2Pct })),
};

// ---- The Artemis brief, computed by the engine ----
const artemisBrief = buildBrief(PRESETS.artemis, D);
const solidNear = artemisBrief.byClass.solid;
const ARTEMIS_PP = r2((PRESETS.artemis.o2Pct / 100) * PRESETS.artemis.pressurePsia);

/** Mini halo chart geometry: O2 on x (10-55%, wide enough that the D ring fits whole), pressure on y (0-20 psia). */
const X0 = 10;
const X1 = 55;
const Y1 = 20;
const W = 320;
const H = 345;
const sx = (o2: number) => ((o2 - X0) / (X1 - X0)) * W;
const sy = (p: number) => H - (p / Y1) * H;
const CLASS_IDX: Record<FuelClass, number> = { solid: 0, solid_surrogate: 1, droplet: 2, gas: 3 };
const seen = new Set<string>();
const points: Array<[number, number, number]> = [];
for (const t of D.tests) {
  if (t.o2Pct < X0 || t.o2Pct > X1 || t.pressurePsia > Y1) continue;
  const x = Math.round(sx(t.o2Pct) * 2) / 2;
  const y = Math.round(sy(t.pressurePsia) * 2) / 2;
  const key = `${x}:${y}:${t.fuelClass}`;
  if (seen.has(key)) continue;
  seen.add(key);
  points.push([x, y, CLASS_IDX[t.fuelClass]]);
}
// Solids last so they draw on top.
points.sort((a, b) => b[2] - a[2]);

export const mini = {
  name: PRESETS.artemis.name,
  href: briefHref("artemis"),
  o2: PRESETS.artemis.o2Pct,
  p: PRESETS.artemis.pressurePsia,
  pp: ARTEMIS_PP,
  materials: PRESETS.artemis.materials.length,
  grade: artemisBrief.grade.grade,
  reason: artemisBrief.grade.reason,
  flags: artemisBrief.flags.map((f) => ({ id: f.id, severity: f.severity, title: f.title })),
  chart: {
    w: W,
    h: H,
    points,
    habitat: { x: sx(PRESETS.artemis.o2Pct), y: sy(PRESETS.artemis.pressurePsia) },
    // Evidence-distance rings: d units = 10 O2-points horizontally, 3 psia vertically.
    rings: GRADE_RINGS.map((d) => ({ d, rx: (d * 10 * W) / (X1 - X0), ry: (d * 3 * H) / Y1 })),
    nearestSolid:
      solidNear.test && solidNear.d !== null
        ? { x: sx(solidNear.test.o2Pct), y: sy(solidNear.test.pressurePsia), acronym: solidNear.test.acronym, d: r2(solidNear.d) }
        : null,
    xTicks: [10, 20, 30, 40, 50].map((v) => ({ v, x: sx(v) })),
    yTicks: [0, 10, 20].map((v) => ({ v, y: sy(v) })),
  },
};

// ---- Pillars ----
const kapton = sensorWhatIf("kapton", D.detector);
const scatterOnly = kapton.find((w) => w.combo.length === 1)!;
const withIon = kapton.find((w) => w.combo.length === 2)!;
const top = artemisBrief.ranked[0];
const next = artemisBrief.nextTests[0];
const nextGain = next?.gains.find((g) => g.preset === "artemis");

export const pillars = {
  kapton: {
    runs: scatterOnly.runs,
    missed: scatterOnly.runs - scatterOnly.caught,
    ionCaught: withIon.caught,
    ionRuns: withIon.runs,
    scatterV: D.detector.thresholds.scatterV.toFixed(1),
    ambientO2: D.detector.ambient.o2Pct,
    ambientAtm: r1(D.detector.ambient.pressurePsia / 14.696),
    source: detectorSource(D),
  },
  topInvestigation: { acronym: top.inv.acronym, title: top.inv.title, psiId: top.inv.psiId },
  nextTest: next
    ? {
        fuel: CLASS_LABEL[next.fuelClass].toLowerCase(),
        o2: next.o2Pct,
        p: next.pressurePsia,
        before: nextGain ? r2(nextGain.before) : null,
        after: nextGain ? r2(nextGain.after) : null,
      }
    : null,
};

// ---- The data ----
const dois = new Set(D.investigations.flatMap((i) => i.publications.map((p) => p.doi)).filter(Boolean));
export const dataset = {
  investigations: D.investigations.length,
  totalRows: D.manifest.totalRows,
  eligibleRows: D.manifest.eligibleRows,
  publications: dois.size,
  builtAt: D.manifest.builtAt.slice(0, 10),
};

// ---- Presets ----
export const presets = PRESET_ORDER.map((k) => {
  const h = PRESETS[k];
  const b = buildBrief(h, D);
  return {
    key: k,
    name: h.name,
    o2: h.o2Pct,
    p: h.pressurePsia,
    flow: h.flowCmS,
    grade: b.grade.grade,
    critical: b.flags.filter((f) => f.severity === "critical").length,
    href: briefHref(k),
  };
});

// ---- "HALO in 60 seconds" band: every figure reuses the sections' own computations ----
const artemisBriefHref = briefHref("artemis");
export const band = {
  moon: { solids: problem.moonWindow.solids, tests: problem.moonWindow.tests, href: "/findings" },
  kapton: { missed: pillars.kapton.missed, runs: pillars.kapton.runs, href: `${artemisBriefHref}#detection` },
  nextTest: pillars.nextTest && pillars.nextTest.before !== null && pillars.nextTest.after !== null
    ? { before: pillars.nextTest.before, after: pillars.nextTest.after, o2: pillars.nextTest.o2, p: pillars.nextTest.p, href: `${artemisBriefHref}#next-test` }
    : null,
  data: { investigations: dataset.investigations, eligibleRows: dataset.eligibleRows, href: "/data" },
};
