import { MATERIALS } from './materials';
import type { DetectionResult, ExtinctionResult, Fact, Flag, FuelClass, Habitat, HaloData, Nearest, Source } from './types';

/**
 * Flag rules. Every number a flag renders is read from a Fact it lists in
 * factIds, rendered with String(fact.value), so a validator can match them.
 */

const PSI_PER_ATM = 14.696;
const ISS_AIR_MAX_O2 = 23;
const ISS_AIR_MIN_P = 13;
const SOLID_C_LIMIT = 1.0;
const MISS_PCT = 50;
const SELF_EXTINGUISH_P = 0.1;
const PARTIAL_GRAVITY_URL = 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/';

const r2 = (x: number) => Number(x.toFixed(2));
const pct = (x: number) => Math.round(x * 100);

export interface FlagResult { flags: Flag[]; facts: Fact[] }

function testSource(data: HaloData, psiId: string): Source {
  const doi = data.manifest.psiDatasetDois[psiId] ?? data.investigations.find((i) => i.psiId === psiId)?.datasetDoi;
  return doi ? { psiId, doi } : { psiId };
}

/** SAME (smoke detection) investigation source, if the data has one. */
export function detectorSource(data: HaloData): Source {
  // The detector runs are SAME; prefer it over other smoke-detection investigations (DAFT, SAME-R).
  const inv =
    data.investigations.find((i) => i.acronym.trim().toUpperCase() === 'SAME') ??
    data.investigations.find((i) => i.hazards.includes('smoke_detection'));
  return inv ? { psiId: inv.psiId, doi: inv.datasetDoi, note: inv.acronym } : { note: 'SAME smoke detector runs' };
}

const comboKey = (detectors: string[]) => [...detectors].sort().join('-');
const comboLabel = (detectors: string[]) => [...detectors].sort().join(' + ');

/** Detection facts per material: scatter low/runs, plus missed/runs for the selected detector combo. */
export function detectionFacts(det: DetectionResult[], detectors: string[], data: HaloData): Fact[] {
  const src = detectorSource(data);
  const out: Fact[] = [];
  const key = comboKey(detectors);
  for (const d of det) {
    const label = MATERIALS[d.material].label;
    if (d.scatterRuns > 0) {
      out.push(
        { id: `det-${d.material}-scatter-low`, label: `${label} runs below the scatter alarm level`, value: d.scatterLow, provenance: 'measured', source: src },
        { id: `det-${d.material}-scatter-runs`, label: `${label} runs with a scatter reading`, value: d.scatterRuns, provenance: 'measured', source: src },
      );
    }
    if (key !== 'scatter' && d.caughtPct !== null && d.caughtRuns > 0) {
      const caught = Math.round((d.caughtPct / 100) * d.caughtRuns);
      out.push(
        { id: `det-${d.material}-${key}-low`, label: `${label} runs missed by ${comboLabel(detectors)}`, value: d.caughtRuns - caught, provenance: 'inferred', source: src },
        { id: `det-${d.material}-${key}-runs`, label: `${label} runs with every selected channel recorded`, value: d.caughtRuns, provenance: 'measured', source: src },
      );
    }
  }
  return out;
}

export function buildFlags(
  h: Habitat,
  data: HaloData,
  byClass: Record<FuelClass, Nearest>,
  detection: DetectionResult[],
  extinction: ExtinctionResult,
  detFacts: Fact[],
): FlagResult {
  const flags: Flag[] = [];
  const facts: Fact[] = [];

  // critical: no real cabin material tested at this atmosphere
  const solid = byClass.solid;
  if (solid.d === null || solid.d > SOLID_C_LIMIT) {
    const count: Fact = {
      id: 'cov-solid-count', label: 'Eligible solid-fuel tests', provenance: 'measured',
      value: data.tests.filter((t) => t.fuelClass === 'solid').length,
      source: { note: `Eligible PSI test rows searched: ${[...new Set(data.tests.map((t) => t.psiId))].sort().join(', ')}` },
    };
    if (solid.test && solid.d !== null) {
      const t = solid.test;
      const src = testSource(data, t.psiId);
      const near: Fact[] = [
        { id: 'cov-solid-distance', label: 'Evidence distance to the nearest solid-fuel test', value: r2(solid.d), provenance: 'model', source: src },
        { id: 'cov-solid-oxygen', label: 'O2 of the nearest solid-fuel test', value: t.o2Pct, unit: '%', provenance: t.o2Src, source: src },
        { id: 'cov-solid-pressure', label: 'Pressure of the nearest solid-fuel test', value: t.pressurePsia, unit: 'psia', provenance: t.pSrc, source: src },
      ];
      facts.push(...near);
      flags.push({
        id: 'no-solid-evidence', severity: 'critical',
        title: 'No real cabin material tested at this atmosphere',
        detail: `The nearest real-material test (${t.acronym}) ran at ${near[1].value}% O2 and ${near[2].value} psia, an evidence distance of ${near[0].value} from your habitat. Material behavior at your atmosphere is untested, so any estimate here is an extrapolation.`,
        factIds: near.map((f) => f.id),
      });
    } else {
      facts.push(count);
      flags.push({
        id: 'no-solid-evidence', severity: 'critical',
        title: 'No real cabin material tested at this atmosphere',
        detail: 'No eligible solid-fuel test exists in the PSI data, so solid-material behavior here is untested.',
        factIds: [count.id],
      });
    }
  }

  // critical: selected detectors would likely miss a material's smoke
  const key = comboKey(h.detectors);
  for (const d of detection) {
    // caughtPct null means no runs with data: that is "no data", never 0%.
    if (d.caughtPct === null || d.caughtRuns === 0 || d.caughtPct >= MISS_PCT) continue;
    const label = MATERIALS[d.material].label;
    const low = detFacts.find((f) => f.id === `det-${d.material}-${key}-low`);
    const runs = detFacts.find((f) => f.id === `det-${d.material}-${key}-runs`);
    if (!low || !runs) continue;
    flags.push({
      id: `detector-miss-${d.material}`, severity: 'critical',
      title: `Your detector would likely miss ${label} smoke`,
      detail: `In SAME, ${h.detectors.length > 1 ? `both channels (${comboLabel(h.detectors)}) stayed below their alarm levels` : `the ${comboLabel(h.detectors)} channel stayed below its alarm level`} in ${low.value} of ${runs.value} ${label} runs.`,
      factIds: [low.id, runs.id],
    });
  }

  // warning: smoke data exists only at ISS air
  if (h.o2Pct > ISS_AIR_MAX_O2 || h.pressurePsia < ISS_AIR_MIN_P) {
    const src = detectorSource(data);
    const amb: Fact[] = [
      { id: 'det-ambient-oxygen', label: 'O2 of the SAME detector runs', value: data.detector.ambient.o2Pct, unit: '%', provenance: 'assumed', source: src },
      { id: 'det-ambient-pressure', label: 'Pressure of the SAME detector runs', value: Number((data.detector.ambient.pressurePsia / PSI_PER_ATM).toFixed(1)), unit: 'atm', provenance: 'assumed', source: src },
    ];
    facts.push(...amb);
    flags.push({
      id: 'smoke-iss-air', severity: 'warning',
      title: 'Smoke data only exists at ISS air',
      detail: `SAME ran at ISS air (${amb[0].value}% O2, ${amb[1].value} atm); smoke behavior at habitat atmosphere is untested.`,
      factIds: amb.map((f) => f.id),
    });
  }

  // warning: pressure outside the extinction model's tested range
  const extSrc: Source = { psiId: data.extinction.source.psiId, doi: data.extinction.source.doi };
  // The extinction model covers droplet fuels only.
  if (h.liquids && extinction.extrapolatedPressure) {
    const rng: Fact[] = [
      { id: 'ext-pressure-min', label: 'Lowest pressure in the droplet extinction fit', value: data.extinction.pRangeAtm[0], unit: 'atm', provenance: 'measured', source: extSrc },
      { id: 'ext-pressure-max', label: 'Highest pressure in the droplet extinction fit', value: data.extinction.pRangeAtm[1], unit: 'atm', provenance: 'measured', source: extSrc },
      { id: 'ext-pressure-used', label: 'Pressure the extinction model is evaluated at', value: r2(extinction.pAtmUsed), unit: 'atm', provenance: 'model', source: extSrc },
    ];
    facts.push(...rng);
    flags.push({
      id: 'pressure-extrapolated', severity: 'warning',
      title: 'Droplet-fuel pressure outside tested range',
      detail: `FLEX droplet tests span ${rng[0].value} to ${rng[1].value} atm. Your cabin pressure is outside that range, so the extinction estimate is evaluated at ${rng[2].value} atm and is an extrapolation.`,
      factIds: rng.map((f) => f.id),
    });
  }

  // warning: droplet flames unlikely to self-extinguish
  if (h.liquids && extinction.p50 < SELF_EXTINGUISH_P) {
    const ex: Fact[] = [
      { id: 'ext-probability', label: 'Median chance a droplet flame goes out on its own', value: pct(extinction.p50), unit: '%', provenance: 'model', source: extSrc },
      { id: 'ext-probability-lo', label: 'Lower 95% bound of that chance', value: pct(extinction.lo), unit: '%', provenance: 'model', source: extSrc },
      { id: 'ext-probability-hi', label: 'Upper 95% bound of that chance', value: pct(extinction.hi), unit: '%', provenance: 'model', source: extSrc },
      { id: 'ext-droplet-size', label: 'Droplet diameter the model is evaluated at', value: data.extinction.d0Mm, unit: 'mm', provenance: 'model', source: extSrc },
    ];
    facts.push(...ex);
    flags.push({
      id: 'droplet-no-self-extinction', severity: 'warning',
      title: 'Droplet flames unlikely to self-extinguish',
      detail: `The FLEX model gives a ${ex[0].value}% median chance (range ${ex[1].value}–${ex[2].value}%) that a ${ex[3].value} mm droplet flame goes out on its own at this oxygen level.`,
      factIds: ex.map((f) => f.id),
    });
  }

  // info: no partial-gravity data (always)
  const ids = [...new Set(data.investigations.map((i) => i.psiId))].sort();
  const invCount: Fact = {
    id: 'psi-investigations', label: 'PSI investigations in the HALO dataset', value: ids.length,
    provenance: 'measured',
    source: {
      url: PARTIAL_GRAVITY_URL,
      note: `The challenge states PSI holds no partial-gravity combustion data. Investigations counted: ${ids.join(', ')}`,
    },
  };
  facts.push(invCount);
  flags.push({
    id: 'no-partial-gravity', severity: 'info',
    title: 'No partial-gravity data in PSI',
    detail: `None of the ${invCount.value} PSI investigations HALO uses ran at lunar or Martian gravity. Behavior at partial gravity is untested here.`,
    factIds: [invCount.id],
  });

  const order = { critical: 0, warning: 1, info: 2 } as const;
  flags.sort((a, b) => order[a.severity] - order[b.severity]);
  return { flags, facts };
}
