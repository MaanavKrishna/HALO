import { HALO_DATA } from "@/lib/data/load";
import { literatureRows, testRows, type Outcome, type TestRow } from "@/lib/data/schema";
import { CHALLENGE_URL } from "@/lib/site";
import { safeUrl } from "@/lib/brief/citations";
import { buildBrief } from "@/lib/engine/brief";
import { scaledDistance } from "@/lib/engine/distance";
import { extinctionAt } from "@/lib/engine/extinction";
import { detectorSource } from "@/lib/engine/flags";
import { GRADE_RINGS, classGrade } from "@/lib/engine/grade";
import { literatureInWindow, literatureWindowSentence, missionInPsi } from "@/lib/engine/literatureWindow";
import { MATERIALS } from "@/lib/engine/materials";
import { nearestLiterature, nextTests } from "@/lib/engine/nextTest";
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
  | {
      kind: "breakdown";
      total: number;
      parts: Array<{ label: string; count: number; provenance: Provenance }>;
      /** Recorded burn outcomes of the window rows that log one (CFI-G gas flames). */
      outcomes?: { label: string; total: number; parts: Array<{ outcome: Outcome; label: string; count: number }> };
    }
  | {
      kind: "diluent";
      rows: Array<{ label: string; matched: { ext: number; n: number }; all: { ext: number; n: number } }>;
      levels: string;
      /** The same shared-O2 comparison split by fuel (shown in the caption). */
      byFuel?: Array<{ fuel: string; cells: Array<{ label: string; ext: number; n: number }> }>;
    }
  | { kind: "runs"; rows: Array<{ label: string; low: number; runs: number }>; threshold: string }
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
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

/** NASA pages for the investigations PSI does not hold yet (checked 2026-11-15). */
const GLENN = "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science";
export const FUTURE_SOURCES = {
  fm2: { label: "NASA Glenn: Flammability of Materials on the Moon (FM2)", href: `${GLENN}/flammability-of-materials-on-the-moon-fm2/`, detail: "Planned; NASA calls it the first combustion experiment on another planetary body" },
  sofie: { label: "NASA Glenn: Solid Fuel Ignition and Extinction (SoFIE)", href: `${GLENN}/solid-fuel-ignition-and-extinction-sofie/`, detail: "Solid-fuel flammability series; no PSI combustion record yet" },
  flare: { label: "NASA Glenn: Flammability Limits at Reduced-g Experiment (FLARE)", href: `${GLENN}/flammability-limits-at-reduced-g-experiment-flare/`, detail: "JAXA-led with NASA and ESA; no PSI combustion record yet" },
} as const;
/** PSI-179 ASE is a Complex Fluids record (not combustion): cabin aerosol background for the detector story. */
export const ASE_SOURCE: FindingSource = {
  label: "ASE: Aerosol Sampling Experiment (ISS cabin particles)",
  href: "https://doi.org/10.60555/pdgr-c961",
  detail: "NASA PSI PSI-179 dataset, doi:10.60555/pdgr-c961 (Complex Fluids, no experiment table)",
};
/** FLEX papers in the PSI publication list that study CO2 and helium (diluent) atmospheres. */
const FLEX_DILUENT_DOIS = ["10.1155/2012/587987", "10.1016/j.icheatmasstransfer.2009.10.006"];

/** CFI-G test ends. "no-hot-ignition" also groups "cool-flame" rows: neither reached a hot flame. */
const CFIG_GROUPS: Array<{ key: Outcome; members: Outcome[]; label: string; short: string }> = [
  { key: "extinguished", members: ["extinguished"], label: "the hot flame went out on its own", short: "Hot flame went out" },
  { key: "flow-stopped", members: ["flow-stopped"], label: "burned until the fuel flow was stopped", short: "Flow stopped" },
  { key: "no-hot-ignition", members: ["no-hot-ignition", "cool-flame"], label: "did not reach a hot flame", short: "No hot flame" },
];
const DILUENT_LABEL: Record<string, string> = { N2: "Nitrogen (N₂)", CO2: "Carbon dioxide (CO₂)", He: "Helium (He)" };
const DILUENT_TEXT: Record<string, string> = { N2: "nitrogen", CO2: "CO2", He: "helium" };

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

const shortMaterial = (m: string) => m.replace(/\s+\d+(\.\d+)?x\d+(\.\d+)?\s*cm.*$/, "").trim();
function pressureSpan(rows: Array<{ p: number | null }>) {
  const ps = rows.map((r) => r.p).filter((x): x is number => x !== null);
  return ps.length ? `${Math.min(...ps)}–${Math.max(...ps)} psia where reported` : "pressure not always reported";
}

/** SIBAL (cotton/fiberglass) fabric is the one material Saffire burned on several missions. */
function saffireSpread(lit: LiteratureRow[]) {
  return literatureRows({ literature: lit })
    .filter((r) => r.spreadRateMmS !== null && r.o2Pct !== null)
    .map((r) => ({
      id: r.sampleId, o2: r.o2Pct as number, p: r.pressurePsia, rate: r.spreadRateMmS as number, mission: r.mission, material: r.material,
      opposed: /opposed/i.test(r.outcome ?? ""),
      sources: r.sources ?? [{ url: r.sourceUrl, label: `NASA Technical Reports Server ${r.sourceUrl.split("/").pop()}` }],
    }));
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
  const litTop = data.literature.filter((r) => r.o2Pct !== null).reduce<LiteratureRow | null>((a, b) => (a === null || (b.o2Pct as number) > (a.o2Pct as number) ? b : a), null);
  const artemisBrief = buildBrief(artemis, data);
  const solidNear = artemisBrief.byClass.solid;
  if (top) {
    out.push({
      id: "solid-ceiling",
      topic: "Cabin materials",
      title: `No real cabin solid in the PSI test rows was burned above ${fmt1(top.o2Pct)}% oxygen.`,
      stat: { value: fmt1(top.o2Pct), unit: "%", label: "Highest O2 any real solid burned at", detail: `${top.acronym}, ${top.fuel}` },
      second: { value: fmt1(artemis.o2Pct), unit: "%", label: `${artemis.name} atmosphere` },
      provenance: uniq<Provenance>([top.o2Src, ...solids.map((t) => t.pSrc), "computed", ...(litTop ? (["literature"] as const) : [])]),
      body: `Across ${solids.length} eligible solid-fuel test rows, oxygen spans ${fmt1(minSolid)} to ${fmt1(top.o2Pct)}%, ${seaLevel ? `all at ${solids.every((t) => t.pSrc === "assumed") ? "an assumed " : ""}sea-level cabin pressure` : `at ${fmt1(minSolidP)} psia and up`}. ${artemis.name} (${artemis.o2Pct}% O2, ${artemis.pressurePsia} psia) sits at evidence distance ${solidNear.d === null ? "n/a" : fmt2(solidNear.d)} from the nearest one${solidNear.d !== null && solidNear.d > GRADE_RINGS[GRADE_RINGS.length - 1] ? ", past the outermost grade ring" : ""}.${litTop ? ` Outside PSI, NASA reports describe Saffire burns up to ${fmt1(litTop.o2Pct as number)}% O2 (literature).` : ""} NASA's SoFIE solid-fuel series and the JAXA-led FLARE project study solid flammability limits in microgravity; neither has a PSI combustion record yet.`,
      viz: {
        kind: "o2-range",
        tested: [minSolid, top.o2Pct],
        markers: [iss, moon, artemis].map((h) => ({ label: h.name, o2: h.o2Pct })),
        domain: [Math.min(15, Math.floor(minSolid / 5) * 5), 40],
      },
      sources: [
        ...uniq(solids.map((t) => t.psiId)).map((id) => datasetSource(data, id)),
        ...(litTop ? [{ label: `${litTop.mission} ${litTop.sampleId} (NASA report, literature)`, href: litTop.sourceUrl, detail: "Not a PSI test row; HALO does not grade on it" }] : []),
        FUTURE_SOURCES.sofie,
        FUTURE_SOURCES.flare,
      ],
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
  const winRows = testRows({ tests: win });
  const burned = winRows.filter((t) => t.outcome && t.outcome !== "unknown");
  const burnAcr = uniq(burned.map((t) => t.acronym));
  const coolOnly = burned.filter((t) => t.outcome === "cool-flame").length;
  const outcomeGroups = CFIG_GROUPS.map((g) => ({ ...g, count: burned.filter((t) => g.members.includes(t.outcome as Outcome)).length })).filter(
    (g) => g.count > 0,
  );
  const outcomeParts = outcomeGroups.map((g) => ({ outcome: g.key, label: g.short, count: g.count }));
  const burnedO2 = burned.map((t) => t.o2Pct);
  const burnedP = uniq(burned.map((t) => fmt2(t.pressurePsia)));
  const allMeasured = burned.every((t) => t.o2Src === "measured" && t.pSrc === "measured");
  const outcomeSentence = burned.length
    ? ` The ${burned.length} ${burnAcr.join(", ")} gas flames are the only measured burn outcomes in the window (${fmt1(Math.min(...burnedO2))}–${fmt1(Math.max(...burnedO2))}% O2 at ${burnedP.join(", ")} psia${allMeasured ? ", both measured" : ""}): ${outcomeGroups
        .map((g) => `${g.key === "extinguished" ? `in ${g.count}` : g.count} ${g.label}${g.key === "no-hot-ignition" && coolOnly ? ` (${coolOnly === g.count ? (coolOnly === 2 ? "both" : "all") : coolOnly} logged as direct cool flames)` : ""}`)
        .join(", ")
        .replace(/, ([^,]*)$/, " and $1")}.`
    : "";
  const lit = literatureInWindow(data, moon.o2Pct, moon.pressurePsia);
  const shown = parts.filter((p) => p.count > 0 || p.c === "solid");
  out.push({
    id: "moon-window",
    topic: "The Moon window",
    title: `Inside the Moon window, ${realSolids === 0 ? "not one" : realSolids} of the ${win.length} eligible PSI test rows ${realSolids === 0 || realSolids === 1 ? "is" : "are"} a real cabin solid.`,
    stat: { value: String(realSolids), label: "PSI real-solid tests in the window" },
    second: { value: String(win.length), unit: "rows", label: `O2 ≥ ${moon.o2Pct}%, ≤ ${moon.pressurePsia} psia` },
    provenance: uniq<Provenance>([...shown.filter((p) => p.count > 0).map((p) => p.provenance), "computed", ...(lit ? (["literature"] as const) : [])]),
    body: `In the PSI test rows, the challenge's Moon envelope (at least ${moon.o2Pct}% O2 at no more than ${moon.pressurePsia} psia) holds ${shown
      .filter((p) => p.count > 0)
      .map((p) => `${p.count} ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}`)
      .join(" and ")}. Surrogate pressures are inferred from the test objective, not logged.${outcomeSentence}${lit ? ` ${literatureWindowSentence(lit)}` : ""}`,
    viz: {
      kind: "breakdown",
      total: win.length,
      parts: shown.map(({ label, count, provenance }) => ({ label, count, provenance })),
      outcomes: burned.length ? { label: `${burnAcr.join(", ")} burn outcomes`, total: burned.length, parts: outcomeParts } : undefined,
    },
    sources: [
      ...uniq(win.map((t) => t.psiId)).map((id) => datasetSource(data, id)),
      ...(lit ? lit.sourceUrls.map((url) => ({ label: `${lit.missions.join(", ")} (NASA report, literature)`, href: url, detail: `Samples ${lit.rows.map((r) => r.sampleId).join(", ")}; not PSI test rows` })) : []),
    ],
    brief: briefLink(moon, data),
  });

  // 3. Detector blind spot.
  const issBrief = buildBrief(iss, data);
  const blind = issBrief.detection.filter((d) => d.scatterRuns > 0 && d.scatterLow / d.scatterRuns >= 0.5);
  const det = detectorSource(data);
  if (blind.length) {
    const [first] = blind;
    const volts = data.detector.thresholds.scatterV.toFixed(1);
    const um = (x: number | null) => (x === null ? null : x.toFixed(3));
    const kapton = issBrief.detection.find((d) => d.material === "kapton");
    const lamp = issBrief.detection.find((d) => d.material === "cotton");
    const finest =
      kapton?.cmdUm != null && lamp?.cmdUm != null && kapton.cmdUm < lamp.cmdUm
        ? `Kapton smoke was the finest, a median particle size of ${um(kapton.cmdUm)} µm against ${um(lamp.cmdUm)} µm for Lampwick${lamp.scatterLow === 0 ? `, which reached the proxy in all ${lamp.scatterRuns} runs` : ""}.`
        : "";
    const teflon = issBrief.detection.find((d) => d.material === "teflon");
    const sizeNote =
      finest && teflon?.cmdUm != null && kapton?.cmdUm != null && teflon.cmdUm > kapton.cmdUm && teflon.scatterLow > 0
        ? ` Teflon smoke, at a median of ${um(teflon.cmdUm)} µm, is close to Lampwick's size yet also read low (${teflon.scatterLow} of ${teflon.scatterRuns} runs), so particle size alone does not explain the low readings.`
        : "";
    const phr = blind.map((d) => `${d.scatterLow} of ${d.scatterRuns} ${MATERIALS[d.material as MaterialId].label}`).join(" and ");
    out.push({
      id: "detector-blind-spot",
      topic: "Smoke detection",
      title: `An ISS-style scatter detector read below HALO's ${volts} V scatter alarm proxy in ${phr} smoke runs.`,
      stat: { value: `${first.scatterLow}/${first.scatterRuns}`, label: `${MATERIALS[first.material as MaterialId].label} runs below the ${volts} V proxy` },
      second: blind[1] ? { value: `${blind[1].scatterLow}/${blind[1].scatterRuns}`, label: `${MATERIALS[blind[1].material as MaterialId].label} runs below the ${volts} V proxy` } : undefined,
      provenance: ["measured", "computed"],
      body: `The ISS detector is certified in obscuration, not volts, so HALO treats a ${volts} V forward-scatter reading as the alarm point. ${finest}${sizeNote} Counts use only runs with a scatter reading. SAME ran at ISS air (${data.detector.ambient.o2Pct}% O2, ${Number((data.detector.ambient.pressurePsia / PSI_PER_ATM).toFixed(1))} atm); smoke behavior at habitat atmosphere is untested. Cabin air also carries dust a detector must not mistake for smoke: PSI's Aerosol Sampling Experiment (ASE) collected ISS cabin particles, but it has no experiment table to test a detector against.`,
      viz: { kind: "runs", rows: blind.map((d) => ({ label: MATERIALS[d.material as MaterialId].label, low: d.scatterLow, runs: d.scatterRuns })), threshold: data.detector.thresholds.scatterV.toFixed(1) },
      sources: [
        det.doi ? { label: `${det.note ?? "SAME"}: smoke aerosol measurement experiment`, href: doiHref(det.doi), detail: `NASA PSI ${det.psiId} dataset, doi:${det.doi}` } : { label: "SAME smoke detector runs", href: null },
        ASE_SOURCE,
      ],
      brief: briefLink(iss, data),
    });
  }

  // 4. Droplet self-extinction 50% point.
  const ext = data.extinction;
  const sea: Habitat = { ...iss, liquids: true };
  const curve = extinctionAt(sea, ext).curve.filter((p) => p.o2 >= 12 && p.o2 <= 40);
  const extInv = data.investigations.find((i) => i.psiId === ext.source.psiId);
  // Fuels in the fitted runs (the model's features carry no fuel term).
  const extFuels = ext.features.some((f) => /fuel/i.test(f))
    ? []
    : uniq(testRows(data).filter((t) => t.psiId === ext.source.psiId && t.diluent === ext.diluent && !!t.outcome).map((t) => t.fuel.toLowerCase())).sort();
  out.push({
    id: "droplet-extinction",
    topic: "Liquid droplet fuels",
    title: `Above about ${fmt1(ext.o2At50.median)}% oxygen, a ${ext.d0Mm} mm fuel droplet flame is more likely to keep burning than to go out on its own.`,
    stat: { value: fmt1(ext.o2At50.median), unit: "%", label: "50% self-extinction point", detail: `95% interval ${fmt1(ext.o2At50.lo)}–${fmt1(ext.o2At50.hi)}%` },
    second: { value: ext.cvAuc.toFixed(2), label: "Cross-validated AUC" },
    provenance: ["model"],
    body: `A logistic model fitted to ${ext.n} ${extInv?.acronym ?? "FLEX"} droplet tests (${ext.nExt} self-extinctions, ${ext.diluent} diluent, ${ext.coefs.length} bootstrap refits)${extFuels.length > 1 ? `, ${extFuels.join(" and ")} pooled with no fuel term,` : ""} puts the even-odds point near sea-level pressure. ${artemis.name} at ${artemis.o2Pct}% O2 is ${artemis.o2Pct > ext.o2At50.hi ? "above the whole interval" : "inside the interval"}, and its pressure is outside the fitted ${ext.pRangeAtm[0]}–${ext.pRangeAtm[1]} atm range. 'Went out' means the visible hot flame; FLEX heptane droplets went on burning as cool flames after it.`,
    viz: { kind: "curve", points: curve, at50: ext.o2At50, marker: { label: artemis.name, o2: artemis.o2Pct } },
    sources: [datasetSource(data, ext.source.psiId)],
    brief: briefLink({ ...artemis, liquids: true }, data, "with liquid fuels"),
  });

  // 5. Diluent and droplet self-extinction (FLEX CO2 / He runs): the challenge's suppression pillar.
  const flex = testRows(data).filter((t): t is TestRow & { diluent: "N2" | "CO2" | "He" } => t.psiId === ext.source.psiId && !!t.diluent && !!t.outcome);
  const dils = (["CO2", "He", "N2"] as const).filter((d) => flex.some((t) => t.diluent === d));
  if (dils.includes("N2") && dils.length > 1) {
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const levelsOf = (d: string) => new Set(flex.filter((t) => t.diluent === d).map((t) => r1(t.o2Pct)));
    const shared = [...levelsOf(dils[0])].filter((l) => dils.every((d) => levelsOf(d).has(l))).sort((a, b) => a - b);
    const count = (rows: TestRow[]) => ({ ext: rows.filter((t) => t.outcome === "extinguished").length, n: rows.length });
    const rows = dils.map((d) => {
      const all = flex.filter((t) => t.diluent === d);
      return { d, label: DILUENT_LABEL[d], all: count(all), matched: count(all.filter((t) => shared.includes(r1(t.o2Pct)))) };
    });
    const n2 = rows.find((r) => r.d === "N2")!;
    const others = rows.filter((r) => r.d !== "N2");
    const share = (x: { ext: number; n: number }) => pct(x.ext, x.n);
    const higher = others.filter((r) => share(r.matched) > share(n2.matched));
    const n2Max = Math.max(...flex.filter((t) => t.diluent === "N2").map((t) => t.o2Pct));
    const otherMax = Math.max(...flex.filter((t) => t.diluent !== "N2").map((t) => t.o2Pct));
    const ps = flex.map((t) => t.pressurePsia / PSI_PER_ATM);
    const levels = shared.length ? `${fmt1(shared[0])}–${fmt1(shared[shared.length - 1])}%` : "";
    const fuels = uniq(flex.map((t) => t.fuel));
    const top = [...others].sort((a, b) => share(b.matched) - share(a.matched))[0];
    const flexInv = data.investigations.find((i) => i.psiId === ext.source.psiId);
    // Per fuel, at the same shared O2 levels: does the order (each other gas above N2) hold, and where is the gap?
    const byFuel = fuels.map((fuel) => {
      const cells = dils.map((d) => ({ d, ...count(flex.filter((t) => t.fuel === fuel && t.diluent === d && shared.includes(r1(t.o2Pct)))) }));
      const nN2 = cells.find((c) => c.d === "N2")!;
      const rest = cells.filter((c) => c.d !== "N2" && c.n > 0);
      const holds = nN2.n > 0 && rest.length > 0 && rest.every((c) => share(c) > share(nN2));
      const gap = rest.length && nN2.n ? rest.reduce((a, c) => a + share(c), 0) / rest.length - share(nN2) : 0;
      return { fuel, cells, holds, gap };
    });
    const allHold = byFuel.length > 1 && byFuel.every((f) => f.holds);
    const widest = [...byFuel].sort((a, b) => b.gap - a.gap)[0];
    const fuelText = byFuel
      .map((f) => `${f.fuel.toLowerCase()}: ${f.cells.map((c) => `${DILUENT_TEXT[c.d]} ${share(c)}% of ${c.n}`).join(", ")}`)
      .join("; ");
    const fuelSentence = allHold
      ? ` The same direction shows for each fuel, on small counts (${fuelText}); most of the nitrogen gap comes from the ${widest.fuel.toLowerCase()} runs.`
      : ` By fuel: ${fuelText}.`;
    out.push({
      id: "diluent-suppression",
      topic: "Suppression",
      title:
        higher.length === others.length
          ? `In FLEX droplet burns, flames went out on their own more often when the inert gas was ${others.map((r) => DILUENT_TEXT[r.d]).join(" or ")} instead of nitrogen.`
          : `In FLEX droplet burns, the inert gas changed how often a flame went out on its own.`,
      stat: { value: String(share(top.matched)), unit: "%", label: `${DILUENT_TEXT[top.d] === "CO2" ? "CO2" : cap(DILUENT_TEXT[top.d])} runs that self-extinguished`, detail: `${top.matched.ext} of ${top.matched.n} at ${levels} O2` },
      second: { value: String(share(n2.matched)), unit: "%", label: `Nitrogen runs at the same O2 levels (${n2.matched.ext} of ${n2.matched.n})` },
      provenance: ["measured", "computed"],
      body: `FLEX burned ${fuels.join(" and ").toLowerCase()} droplets in microgravity with nitrogen, carbon dioxide or helium as the inert gas. A run counts here when the flame went out before the droplet burned away or broke up. Over all ${flex.length} eligible runs that is ${rows
        .map((r) => `${share(r.all)}% for ${DILUENT_TEXT[r.d]} (${r.all.ext} of ${r.all.n})`)
        .join(", ")}, but the nitrogen runs go up to ${fmt1(n2Max)}% O2 and the others stop at ${fmt1(otherMax)}%, so a closer comparison keeps only the ${shared.length} O2 levels all ${dils.length} gases were run at (${levels}).${fuelSentence} Pressure (${fmt1(Math.min(...ps))}–${fmt1(Math.max(...ps))} atm), droplet size and the fuel mix still differ between the groups, and within a single fuel the gaps are within run-to-run chance, so read this as an association, not a controlled effect. These are flames going out on their own in a diluted atmosphere, not tests of an extinguisher or a suppression system, and HALO's extinction model uses the nitrogen runs only.`,
      viz: {
        kind: "diluent",
        rows: rows.map(({ label, matched, all }) => ({ label, matched, all })),
        levels,
        byFuel: byFuel.map((f) => ({ fuel: f.fuel, cells: f.cells.map((c) => ({ label: DILUENT_TEXT[c.d], ext: c.ext, n: c.n })) })),
      },
      sources: [
        datasetSource(data, ext.source.psiId),
        ...FLEX_DILUENT_DOIS.map((doi) => {
          const pub = flexInv?.publications.find((p) => p.doi === doi);
          return { label: pub?.title ?? `doi:${doi}`, href: doiHref(doi), detail: `Listed in PSI's ${flexInv?.acronym ?? "FLEX"} publications, doi:${doi}` };
        }),
      ],
      brief: briefLink({ ...iss, liquids: true }, data, "with liquid fuels"),
    });
  }

  // 6. Saffire spread trend (literature).
  const spread = saffireSpread(data.literature);
  const baseRows = spread.filter((r) => r.o2 <= ELEVATED_O2);
  const elevated = spread.filter((r) => r.o2 > ELEVATED_O2);
  const fastest = elevated.reduce<(typeof spread)[number] | null>((a, b) => (a === null || b.rate > a.rate ? b : a), null);
  if (fastest && baseRows.length) {
    const lo = Math.min(...baseRows.map((r) => r.rate));
    const hi = Math.max(...baseRows.map((r) => r.rate));
    // Hedges: how many points are opposed-flow, and whether the burns between the fastest near-air burn and the top one were any faster.
    const opposed = spread.filter((r) => r.opposed).length;
    const baseTop = baseRows.reduce((a, b) => (b.rate > a.rate ? b : a));
    const between = spread.filter((r) => r.o2 > ELEVATED_O2 && r.o2 < fastest.o2);
    const betweenO2 = between.map((r) => r.o2);
    const notFaster =
      between.length > 1 && between.every((r) => r.rate <= baseTop.rate)
        ? `, and the ${fmt1(Math.min(...betweenO2))}–${fmt1(Math.max(...betweenO2))}% O2 burns were not faster than the ${fmt1(baseTop.o2)}% one`
        : "";
    out.push({
      id: "saffire-spread",
      topic: "Large-scale fires",
      title:
        fastest.o2 === Math.max(...spread.map((r) => r.o2))
          ? `The fastest Saffire flame spread, ${fastest.rate} mm/s, came from the highest-oxygen burn with a reported spread rate: ${fmt1(fastest.o2)}% O2.`
          : `Saffire's fastest flame spread, ${fastest.rate} mm/s, came from a burn at elevated oxygen (${fmt1(fastest.o2)}% O2).`,
      stat: { value: String(fastest.rate), unit: "mm/s", label: `${fastest.mission} ${fastest.id} at ${fmt1(fastest.o2)}% O2` },
      second: { value: `${lo}–${hi}`, unit: "mm/s", label: `${baseRows.length} burns at ${fmt1(Math.min(...baseRows.map((r) => r.o2)))}–${fmt1(Math.max(...baseRows.map((r) => r.o2)))}% O2` },
      provenance: ["literature"],
      body: `Saffire burned large samples inside uncrewed cargo vehicles after they left the station. Of the ${spread.length} spread rates in NASA technical reports, the fastest came at the highest oxygen: ${fastest.mission} ${fastest.id}, ${shortMaterial(fastest.material)}${fastest.p !== null ? ` at ${fastest.p} psia` : ""}. Material, sample size, flow, pressure and spread direction${opposed ? ` (${opposed} of the points ${opposed === 1 ? "is" : "are"} opposed-flow)` : ""} changed between missions too${notFaster} (${pressureSpan(spread)}), so this is a few points, not a fit.`,
      viz: { kind: "spread", rows: spread.map((r) => ({ id: r.id, o2: r.o2, rate: r.rate, mission: r.mission, elevated: r.o2 > ELEVATED_O2 })) },
      sources: [...new Map(spread.flatMap((r) => r.sources).map((s) => [s.url, s.label])).entries()].map(([u, label]) => ({
        label,
        href: safeUrl(u),
        detail: `Saffire report; samples ${spread.filter((r) => r.sources.some((x) => x.url === u)).map((r) => r.id).join(", ")}`,
      })),
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
    second: { value: String(invs), label: "Microgravity or ground investigations" },
    provenance: ["computed", "literature"],
    body: "Every test HALO uses ran in microgravity (or on the ground). A Moon or Mars habitat has some buoyancy, so flames there will behave between the two; that regime is untested here, and the challenge statement says the same. The statement names two experiments that begin to fill it: LUCI, which burned samples in simulated lunar gravity on a 2025 suborbital flight (results outside PSI), and the planned FM2 (Flammability of Materials on the Moon), which NASA describes as the first combustion experiment on another planetary body.",
    viz: { kind: "gravity", tested: 0, total: invs },
    sources: [
      { label: "NASA Space Apps 2026: Flame in Freefall challenge", href: CHALLENGE_URL, detail: "States that PSI holds no partial-gravity combustion data; names LUCI and FM2" },
      FUTURE_SOURCES.fm2,
    ],
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
    provenance: ["computed", "measured"],
    body: `The ${suit.name} preset (${suit.o2Pct}% O2, ${suit.pressurePsia} psia) is the farthest point HALO grades. Its nearest test of any kind, ${nearestAll.n.test?.acronym ?? "n/a"}, is ${fmt2(nearestAll.n.d as number)} away${classRows.every((x) => classGrade(x.n) === "F") ? "; every fuel class grades F" : ""}.`,
    viz: { kind: "distance", rows: classRows.map((x) => ({ label: x.n.test ? `${x.n.test.acronym}` : x.c, d: x.n.d as number })), rings: GRADE_RINGS },
    sources: uniq(classRows.map((x) => x.n.test?.psiId).filter((x): x is string => !!x)).map((id) => datasetSource(data, id)),
    brief: briefLink(suit, data),
  });

  // 8. Next test to fly.
  const [pick] = nextTests(data.tests);
  if (pick) {
    const helped = pick.gains.filter((g) => g.after < g.before).sort((a, b) => b.before - b.after - (a.before - a.after));
    // The literature run nearest the pick, the same one the brief's next-test card names.
    const near = nearestLiterature(pick, data.literature);
    const litNear = near
      ? {
          missions: [near.row.mission],
          run: near.row.sampleId,
          materials: [shortMaterial(near.row.material)],
          d: near.d,
          inPsi: missionInPsi(near.row.mission, data.tests),
          sourceUrls: [near.row.sourceUrl],
        }
      : null;
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
      title: `The single test that would close the most evidence gap: a new real-solid test at ${pick.o2Pct}% oxygen and ${pick.pressurePsia} psia, archived in PSI${litNear ? `, near conditions ${litNear.missions[0]} already flew` : ""}.`,
      stat: { value: `${pick.o2Pct}`, unit: `% · ${pick.pressurePsia} psia`, label: "Suggested solid-fuel test" },
      second: helped[0] ? { value: fmt2(helped[0].after), unit: `from ${fmt2(helped[0].before)}`, label: `${pname(helped[0].preset)} evidence distance after` } : undefined,
      provenance: litNear ? ["computed", "literature"] : ["computed"],
      body: `HALO scores every solid, droplet and gas test on a grid of atmospheres by how far it would pull the presets' nearest evidence in, weighted toward the lunar habitats and toward real solids. ${helped
        .map((g) => `${pname(g.preset)} ${fmt2(g.before)} → ${fmt2(g.after)}`)
        .join("; ")}.${litNear ? ` ${litNear.missions[0]} run ${litNear.run} burned ${litNear.materials.join(" and ")} at evidence distance ${fmt2(litNear.d)} from this point (NASA report, literature${litNear.inPsi ? "" : "; mission not in PSI"}). HALO grades only on PSI rows, so a new test with its data archived in PSI would close that gap.` : ""}`,
      viz: { kind: "next", tests: pts, pick: { o2: pick.o2Pct, p: pick.pressurePsia }, presets: [iss, moon, artemis].map((h) => ({ label: h.name, o2: h.o2Pct, p: h.pressurePsia })) },
      sources: [
        { label: "HALO next-test search (method)", href: "/method#next-test", detail: "Scores candidates over the eligible PSI test rows" },
        ...(litNear ? litNear.sourceUrls.map((url) => ({ label: `${litNear.missions.join(", ")} (NASA report, literature)`, href: url, detail: litNear.inPsi ? "Literature run; distance only, never graded" : "Not PSI test rows; distance only, never graded" })) : []),
      ],
      brief: briefLink(moon, data),
    });
  }

  return out.map((f, i) => ({ ...f, index: i + 1 }));
}
