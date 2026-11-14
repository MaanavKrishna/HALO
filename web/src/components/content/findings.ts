import { HALO_DATA } from "@/lib/data/load";
import { CHALLENGE_URL } from "@/lib/site";
import { safeUrl } from "@/lib/brief/citations";
import { buildBrief } from "@/lib/engine/brief";
import { scaledDistance } from "@/lib/engine/distance";
import { extinctionAt } from "@/lib/engine/extinction";
import { detectorSource } from "@/lib/engine/flags";
import { GRADE_RINGS } from "@/lib/engine/grade";
import { MATERIALS } from "@/lib/engine/materials";
import { nextTests } from "@/lib/engine/nextTest";
import { PRESETS } from "@/lib/engine/presets";
import { habitatToQuery } from "@/lib/engine/url";
import type { FuelClass, Grade, Habitat, HaloData, LiteratureRow, MaterialId, Provenance, TestPoint } from "@/lib/engine/types";

/**
 * The headline findings, every number computed from the bundled data and the
 * engine at build time. Copy is assembled from these values; nothing here is
 * a hand-typed result.
 */

export interface FindingSource {
  label: string;
  href: string | null;
  detail?: string;
}

export type FindingViz =
  | { kind: "o2-range"; tested: [number, number]; markers: Array<{ label: string; o2: number }>; domain: [number, number] }
  | { kind: "breakdown"; total: number; parts: Array<{ label: string; count: number; provenance: Provenance }> }
  | { kind: "runs"; rows: Array<{ label: string; low: number; runs: number }>; threshold: number }
  | { kind: "curve"; points: Array<{ o2: number; p50: number; lo: number; hi: number }>; at50: { median: number; lo: number; hi: number }; marker: { label: string; o2: number } }
  | { kind: "spread"; rows: Array<{ id: string; o2: number; rate: number; mission: string; elevated: boolean }> }
  | { kind: "gravity"; tested: number; total: number }
  | { kind: "distance"; rows: Array<{ label: string; d: number }>; rings: readonly number[] }
  | { kind: "next"; tests: Array<{ o2: number; p: number }>; pick: { o2: number; p: number }; presets: Array<{ label: string; o2: number; p: number }> };

export interface Finding {
  id: string;
  index: number;
  topic: string;
  title: string;
  stat: { value: string; unit?: string; label: string; detail?: string };
  second?: { value: string; unit?: string; label: string };
  provenance: Provenance[];
  body: string;
  viz: FindingViz;
  sources: FindingSource[];
  brief: { label: string; name: string; grade: Grade; href: string };
}

const PSI_PER_ATM = 14.696;
/** Above this a test counts as sea-level cabin pressure (classification only, never displayed). */
const SEA_LEVEL_MIN_PSIA = 14;
/** Saffire burns above this O2 count as "elevated oxygen" (classification only). */
const ELEVATED_O2 = 23;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const fmt1 = (x: number) => (Math.round(x * 10) / 10).toString();
const fmt2 = (x: number) => x.toFixed(2);
const doiHref = (doi: string) => `https://doi.org/${doi}`;
const briefHref = (h: Habitat) => `/brief?${habitatToQuery(h)}`;

function briefLink(h: Habitat, data: HaloData, extra?: string): Finding["brief"] {
  const name = extra ? `${h.name}, ${extra}` : h.name;
  return { label: `See it in the ${name} brief`, name, grade: buildBrief(h, data).grade.grade, href: briefHref(h) };
}

function datasetSource(data: HaloData, psiId: string): FindingSource {
  const inv = data.investigations.find((i) => i.psiId === psiId);
  const doi = data.manifest.psiDatasetDois[psiId] ?? inv?.datasetDoi;
  return {
    label: inv ? `${inv.acronym}: ${inv.title}` : psiId,
    href: doi ? doiHref(doi) : null,
    detail: `NASA PSI ${psiId} dataset${doi ? `, doi:${doi}` : ""}`,
  };
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

function windowRows(data: HaloData, moon: Habitat) {
  return data.tests.filter((t) => t.o2Pct >= moon.o2Pct && t.pressurePsia <= moon.pressurePsia);
}

const CLASS_PLURAL: Record<FuelClass, string> = {
  solid: "real cabin solids",
  solid_surrogate: "surrogate-fuel rows",
  droplet: "droplet rows",
  gas: "gas-flame rows",
};

/** SIBAL (cotton/fiberglass) fabric is the one material Saffire burned on several missions. */
function saffireSpread(lit: LiteratureRow[]) {
  return lit
    .filter((r) => r.spreadRateMmS !== null && r.o2Pct !== null)
    .map((r) => ({ id: r.sampleId, o2: r.o2Pct as number, rate: r.spreadRateMmS as number, mission: r.mission, material: r.material, url: r.sourceUrl }));
}

export function computeFindings(data: HaloData = HALO_DATA): Finding[] {
  const artemis = PRESETS.artemis;
  const moon = PRESETS.moon;
  const iss = PRESETS.iss;
  const suit = PRESETS.suit;
  const out: Omit<Finding, "index">[] = [];

  // 1. Cabin-solid ceiling.
  const solids = data.tests.filter((t) => t.fuelClass === "solid");
  const top = solids.reduce<TestPoint | null>((a, b) => (a === null || b.o2Pct > a.o2Pct ? b : a), null);
  const minSolid = Math.min(...solids.map((t) => t.o2Pct));
  const minSolidP = Math.min(...solids.map((t) => t.pressurePsia));
  const seaLevel = minSolidP >= SEA_LEVEL_MIN_PSIA;
  const artemisBrief = buildBrief(artemis, data);
  const solidNear = artemisBrief.byClass.solid;
  if (top) {
    out.push({
      id: "solid-ceiling",
      topic: "Cabin materials",
      title: `No real cabin solid in the PSI data was tested above ${fmt1(top.o2Pct)}% oxygen.`,
      stat: { value: fmt1(top.o2Pct), unit: "%", label: "Highest O2 any real solid burned at", detail: `${top.acronym}, ${top.fuel}` },
      second: { value: fmt1(artemis.o2Pct), unit: "%", label: `${artemis.name} atmosphere` },
      provenance: uniq([top.o2Src]),
      body: `Across ${solids.length} eligible solid-fuel test rows, oxygen spans ${fmt1(minSolid)} to ${fmt1(top.o2Pct)}%, ${seaLevel ? "all at sea-level cabin pressure" : `at ${fmt1(minSolidP)} psia and up`}. ${artemis.name} (${artemis.o2Pct}% O2, ${artemis.pressurePsia} psia) sits at evidence distance ${solidNear.d === null ? "n/a" : fmt2(solidNear.d)} from the nearest one${solidNear.d !== null && solidNear.d > GRADE_RINGS[GRADE_RINGS.length - 1] ? ", past the outermost grade ring" : ""}.`,
      viz: {
        kind: "o2-range",
        tested: [minSolid, top.o2Pct],
        markers: [iss, moon, artemis].map((h) => ({ label: h.name, o2: h.o2Pct })),
        domain: [15, 40],
      },
      sources: uniq(solids.map((t) => t.psiId)).map((id) => datasetSource(data, id)),
      brief: briefLink(artemis, data),
    });
  }

  // 2. The Moon window.
  const win = windowRows(data, moon);
  const byClass = (c: FuelClass) => win.filter((t) => t.fuelClass === c);
  const parts = (["gas", "solid_surrogate", "droplet", "solid"] as FuelClass[]).map((c) => {
    const rows = byClass(c);
    const acr = uniq(rows.map((t) => t.acronym));
    const inferred = rows.some((t) => t.pSrc === "inferred" || t.o2Src === "inferred");
    return { c, label: cap(rows.length ? `${CLASS_PLURAL[c]} (${acr.join(", ")})` : CLASS_PLURAL[c]), count: rows.length, provenance: (inferred ? "inferred" : "measured") as Provenance };
  });
  const realSolids = byClass("solid").length;
  const shown = parts.filter((p) => p.count > 0 || p.c === "solid");
  out.push({
    id: "moon-window",
    topic: "The Moon window",
    title: `Inside the Moon window, ${realSolids === 0 ? "not one" : realSolids} of the ${win.length} eligible test rows ${realSolids === 0 || realSolids === 1 ? "is" : "are"} a real cabin solid.`,
    stat: { value: String(realSolids), label: "Real cabin solids in the window" },
    second: { value: String(win.length), unit: "rows", label: `O2 ≥ ${moon.o2Pct}%, ≤ ${moon.pressurePsia} psia` },
    provenance: uniq(shown.filter((p) => p.count > 0).map((p) => p.provenance)),
    body: `The challenge's Moon envelope (at least ${moon.o2Pct}% O2 at no more than ${moon.pressurePsia} psia) holds ${shown
      .filter((p) => p.count > 0)
      .map((p) => `${p.count} ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}`)
      .join(" and ")}. Surrogate pressures are inferred from the test objective, not logged.`,
    viz: { kind: "breakdown", total: win.length, parts: shown.map(({ label, count, provenance }) => ({ label, count, provenance })) },
    sources: uniq(win.map((t) => t.psiId)).map((id) => datasetSource(data, id)),
    brief: briefLink(moon, data),
  });

  // 3. Detector blind spot.
  const issBrief = buildBrief(iss, data);
  const blind = issBrief.detection.filter((d) => d.scatterRuns > 0 && d.scatterLow / d.scatterRuns >= 0.5);
  const det = detectorSource(data);
  if (blind.length) {
    const [first] = blind;
    const phr = blind.map((d) => `${d.scatterLow} of ${d.scatterRuns} ${MATERIALS[d.material as MaterialId].label}`).join(" and ");
    out.push({
      id: "detector-blind-spot",
      topic: "Smoke detection",
      title: `An ISS-style scatter detector stayed below its alarm level in ${phr} smoke runs.`,
      stat: { value: `${first.scatterLow}/${first.scatterRuns}`, label: `${MATERIALS[first.material as MaterialId].label} runs below the scatter alarm` },
      second: blind[1] ? { value: `${blind[1].scatterLow}/${blind[1].scatterRuns}`, label: `${MATERIALS[blind[1].material as MaterialId].label} runs below the alarm` } : undefined,
      provenance: ["measured"],
      body: `In SAME, smoke from spacecraft wire insulation was mostly too fine for the photoelectric channel to reach ${data.detector.thresholds.scatterV} V. Counts use only runs with a scatter reading. SAME ran at ISS air (${data.detector.ambient.o2Pct}% O2, ${(data.detector.ambient.pressurePsia / PSI_PER_ATM).toFixed(1)} atm); smoke behavior at habitat atmosphere is untested.`,
      viz: { kind: "runs", rows: blind.map((d) => ({ label: MATERIALS[d.material as MaterialId].label, low: d.scatterLow, runs: d.scatterRuns })), threshold: data.detector.thresholds.scatterV },
      sources: [det.doi ? { label: `${det.note ?? "SAME"}: smoke aerosol measurement experiment`, href: doiHref(det.doi), detail: `NASA PSI ${det.psiId} dataset, doi:${det.doi}` } : { label: "SAME smoke detector runs", href: null }],
      brief: briefLink(iss, data),
    });
  }

  // 4. Droplet self-extinction 50% point.
  const ext = data.extinction;
  const sea: Habitat = { ...iss, liquids: true };
  const curve = extinctionAt(sea, ext).curve.filter((p) => p.o2 >= 12 && p.o2 <= 40);
  const extInv = data.investigations.find((i) => i.psiId === ext.source.psiId);
  out.push({
    id: "droplet-extinction",
    topic: "Liquid droplet fuels",
    title: `Above about ${fmt1(ext.o2At50.median)}% oxygen, a ${ext.d0Mm} mm fuel droplet flame is more likely to keep burning than to go out on its own.`,
    stat: { value: fmt1(ext.o2At50.median), unit: "%", label: "50% self-extinction point", detail: `95% interval ${fmt1(ext.o2At50.lo)}–${fmt1(ext.o2At50.hi)}%` },
    second: { value: ext.cvAuc.toFixed(2), label: "Cross-validated AUC" },
    provenance: ["model"],
    body: `A logistic model fitted to ${ext.n} ${extInv?.acronym ?? "FLEX"} droplet tests (${ext.nExt} self-extinctions, ${ext.diluent} diluent, ${ext.coefs.length} bootstrap refits) puts the even-odds point near sea-level pressure. ${artemis.name} at ${artemis.o2Pct}% O2 is ${artemis.o2Pct > ext.o2At50.hi ? "above the whole interval" : "inside the interval"}, and its pressure is outside the fitted ${ext.pRangeAtm[0]}–${ext.pRangeAtm[1]} atm range.`,
    viz: { kind: "curve", points: curve, at50: ext.o2At50, marker: { label: artemis.name, o2: artemis.o2Pct } },
    sources: [datasetSource(data, ext.source.psiId)],
    brief: briefLink({ ...artemis, liquids: true }, data, "with liquid fuels"),
  });

  // 5. Saffire spread trend (literature).
  const spread = saffireSpread(data.literature);
  const baseRows = spread.filter((r) => r.o2 <= ELEVATED_O2);
  const elevated = spread.filter((r) => r.o2 > ELEVATED_O2);
  const fastest = elevated.reduce<(typeof spread)[number] | null>((a, b) => (a === null || b.rate > a.rate ? b : a), null);
  if (fastest && baseRows.length) {
    const lo = Math.min(...baseRows.map((r) => r.rate));
    const hi = Math.max(...baseRows.map((r) => r.rate));
    out.push({
      id: "saffire-spread",
      topic: "Large-scale fires",
      title:
        fastest.o2 === Math.max(...spread.map((r) => r.o2))
          ? `The fastest Saffire flame spread, ${fastest.rate} mm/s, came from the highest-oxygen burn reported: ${fmt1(fastest.o2)}% O2.`
          : `Saffire's fastest flame spread, ${fastest.rate} mm/s, came from a burn at elevated oxygen (${fmt1(fastest.o2)}% O2).`,
      stat: { value: String(fastest.rate), unit: "mm/s", label: `${fastest.mission} ${fastest.id} at ${fmt1(fastest.o2)}% O2` },
      second: { value: `${lo}–${hi}`, unit: "mm/s", label: `${baseRows.length} burns at ${fmt1(Math.min(...baseRows.map((r) => r.o2)))}–${fmt1(Math.max(...baseRows.map((r) => r.o2)))}% O2` },
      provenance: ["literature"],
      body: `Saffire burned large samples inside uncrewed cargo vehicles after they left the station. The handful of spread rates reported in NASA technical reports rise with oxygen, but sample size and flow also changed between missions, so this is a trend from few points, not a fit.`,
      viz: { kind: "spread", rows: spread.map((r) => ({ id: r.id, o2: r.o2, rate: r.rate, mission: r.mission, elevated: r.o2 > ELEVATED_O2 })) },
      sources: uniq(spread.map((r) => r.url)).map((u) => ({ label: `NASA Technical Reports Server ${u.split("/").pop()}`, href: safeUrl(u), detail: "Saffire mission report" })),
      brief: briefLink(artemis, data),
    });
  }

  // 6. No partial-gravity data.
  const invs = data.investigations.length;
  out.push({
    id: "partial-gravity",
    topic: "Gravity",
    title: `None of the ${invs} PSI combustion investigations ran at lunar or Martian gravity.`,
    stat: { value: "0", unit: `of ${invs}`, label: "Investigations at partial gravity" },
    provenance: ["measured"],
    body: "Every test HALO uses ran in microgravity (or on the ground). A Moon or Mars habitat has some buoyancy, so flames there will behave between the two; that regime is untested here, and the challenge statement says the same.",
    viz: { kind: "gravity", tested: 0, total: invs },
    sources: [{ label: "NASA Space Apps 2026: Flame in Freefall challenge", href: CHALLENGE_URL, detail: "States that PSI holds no partial-gravity combustion data" }],
    brief: briefLink(moon, data),
  });

  // 7. Suit: zero tests anywhere near.
  const dRing = GRADE_RINGS[GRADE_RINGS.length - 1];
  const near = data.tests.filter((t) => scaledDistance(suit.o2Pct, suit.pressurePsia, t.o2Pct, t.pressurePsia) <= dRing).length;
  const suitBrief = buildBrief(suit, data);
  const maxO2 = Math.max(...data.tests.map((t) => t.o2Pct));
  const classRows = (["solid", "solid_surrogate", "droplet", "gas"] as FuelClass[])
    .map((c) => ({ c, n: suitBrief.byClass[c] }))
    .filter((x) => x.n.d !== null);
  const nearestAll = classRows.reduce((a, b) => ((b.n.d as number) < (a.n.d as number) ? b : a));
  out.push({
    id: "suit",
    topic: "EVA suit",
    title: `No eligible test of any fuel kind sits within evidence distance ${dRing} of a ${suit.o2Pct}% oxygen suit.`,
    stat: { value: String(near), label: `Tests within distance ${dRing}` },
    second: { value: fmt2(maxO2), unit: "%", label: "Highest O2 in any eligible test" },
    provenance: ["model", "measured"],
    body: `The ${suit.name} preset (${suit.o2Pct}% O2, ${suit.pressurePsia} psia) is the farthest point HALO grades. Its nearest test of any kind, ${nearestAll.n.test?.acronym ?? "n/a"}, is ${fmt2(nearestAll.n.d as number)} away; every fuel class grades F.`,
    viz: { kind: "distance", rows: classRows.map((x) => ({ label: x.n.test ? `${x.n.test.acronym}` : x.c, d: x.n.d as number })), rings: GRADE_RINGS },
    sources: uniq(classRows.map((x) => x.n.test?.psiId).filter((x): x is string => !!x)).map((id) => datasetSource(data, id)),
    brief: briefLink(suit, data),
  });

  // 8. Next test to fly.
  const [pick] = nextTests(data.tests);
  if (pick) {
    const helped = pick.gains.filter((g) => g.after < g.before).sort((a, b) => b.before - b.after - (a.before - a.after));
    const pname = (k: string) => (PRESETS as Record<string, Habitat>)[k]?.name ?? k;
    const seen = new Set<string>();
    const pts = data.tests
      .map((t) => ({ o2: Math.round(t.o2Pct * 2) / 2, p: Math.round(t.pressurePsia * 4) / 4 }))
      .filter((t) => {
        const k = `${t.o2}|${t.p}`;
        return seen.has(k) ? false : (seen.add(k), true);
      })
      .filter((t) => t.o2 <= 42 && t.p <= 16);
    out.push({
      id: "next-test",
      topic: "Next test to fly",
      title: `The single test that would close the most evidence gap: a real solid at ${pick.o2Pct}% oxygen and ${pick.pressurePsia} psia.`,
      stat: { value: `${pick.o2Pct}`, unit: `% · ${pick.pressurePsia} psia`, label: "Suggested solid-fuel test" },
      second: helped[0] ? { value: fmt2(helped[0].after), unit: `from ${fmt2(helped[0].before)}`, label: `${pname(helped[0].preset)} evidence distance after` } : undefined,
      provenance: ["model"],
      body: `HALO scores every solid, droplet and gas test on a grid of atmospheres by how far it would pull the presets' nearest evidence in, weighted toward the lunar habitats and toward real solids. ${helped
        .map((g) => `${pname(g.preset)} ${fmt2(g.before)} → ${fmt2(g.after)}`)
        .join("; ")}.`,
      viz: { kind: "next", tests: pts, pick: { o2: pick.o2Pct, p: pick.pressurePsia }, presets: [iss, moon, artemis].map((h) => ({ label: h.name, o2: h.o2Pct, p: h.pressurePsia })) },
      sources: [{ label: "HALO next-test search (method)", href: "/method#next-test", detail: "Scores candidates over the eligible PSI test rows" }],
      brief: briefLink(moon, data),
    });
  }

  return out.map((f, i) => ({ ...f, index: i + 1 }));
}
