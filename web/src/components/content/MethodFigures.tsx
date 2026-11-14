import type { ReactNode } from "react";
import { scaledDistance } from "@/lib/engine/distance";
import { GRADE_RINGS } from "@/lib/engine/grade";
import type { FuelClass, Habitat, RankWeights, TestPoint } from "@/lib/engine/types";
import "./content.css";

/* ---------- Math, set in HTML (no math library) ---------- */

export function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="math-frac">
      <span>{num}</span>
      <span>{den}</span>
    </span>
  );
}

export function Sqrt({ children }: { children: ReactNode }) {
  return (
    <span className="math-sqrt">
      <span className="math-radical" aria-hidden="true">
        <svg viewBox="0 0 12 40" preserveAspectRatio="none">
          <path d="M0.5 25 L3.5 23 L7 39 L11.5 0.6" fill="none" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="math-radicand">{children}</span>
    </span>
  );
}

/** A display equation in an instrument panel; `label` is read instead of the visual math. */
export function Equation({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  return (
    <figure className="content-block not-italic">
      <div className="flex flex-col gap-3 overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface-1 px-5 py-6 shadow-[var(--inner-highlight),var(--elev-1)] sm:px-8">
        <p role="math" aria-label={label} className="math flex flex-wrap items-center justify-center gap-x-1 text-[1.15rem] sm:text-[1.35rem]">
          {children}
        </p>
      </div>
      {note && <figcaption className="type-caption mt-3 text-fg-3">{note}</figcaption>}
    </figure>
  );
}

export const DistanceFormula = ({ o2Scale, pScale }: { o2Scale: number; pScale: number }) => (
  <Equation
    label={`d equals the square root of the O2 difference over ${o2Scale}, squared, plus the pressure difference over ${pScale}, squared`}
    note={`${o2Scale} O2 percentage points count the same as ${pScale} psia. O2 in %, pressure in psia; h is the habitat, t the test.`}
  >
    <var>d</var>
    <span className="mx-2 text-fg-3">=</span>
    <Sqrt>
      <span className="text-fg-3">(</span>
      <Frac
        num={
          <>
            O<sub>2,h</sub> − O<sub>2,t</sub>
          </>
        }
        den={o2Scale}
      />
      <span className="text-fg-3">)</span>
      <sup>2</sup>
      <span className="mx-2 text-fg-3">+</span>
      <span className="text-fg-3">(</span>
      <Frac
        num={
          <>
            <var>p</var>
            <sub>h</sub> − <var>p</var>
            <sub>t</sub>
          </>
        }
        den={pScale}
      />
      <span className="text-fg-3">)</span>
      <sup>2</sup>
    </Sqrt>
  </Equation>
);

/* ---------- Evidence rings around a habitat, with the real tests nearby ---------- */

const CLASS_TONE: Record<FuelClass, { fill: string; label: string }> = {
  solid: { fill: "var(--text-1)", label: "Real solid" },
  solid_surrogate: { fill: "var(--accent)", label: "Solid surrogate" },
  droplet: { fill: "var(--ok)", label: "Droplet" },
  gas: { fill: "var(--text-3)", label: "Gas flame" },
};

const GRADE_OF_RING = ["A/B", "C", "D"] as const;

/**
 * Evidence-distance space centred on one habitat: each axis is a scaled gap
 * (O2 / 10, pressure / 3), so the grade thresholds are circles. Dots are the
 * eligible tests within the plotted radius, coloured by fuel class.
 */
export function EvidenceRings({
  habitat,
  tests,
  o2Scale,
  pScale,
}: {
  habitat: Habitat;
  tests: TestPoint[];
  o2Scale: number;
  pScale: number;
}) {
  const S = 440;
  const C = S / 2;
  const outer = GRADE_RINGS[GRADE_RINGS.length - 1];
  const R = outer * 1.25; // plotted radius in distance units
  const k = (C - 24) / R;
  const seen = new Set<string>();
  const pts = tests
    .map((t) => ({ t, dx: (t.o2Pct - habitat.o2Pct) / o2Scale, dy: (t.pressurePsia - habitat.pressurePsia) / pScale }))
    .filter(({ t }) => scaledDistance(habitat.o2Pct, habitat.pressurePsia, t.o2Pct, t.pressurePsia) <= R)
    .filter(({ t, dx, dy }) => {
      const key = `${t.fuelClass}|${dx.toFixed(2)}|${dy.toFixed(2)}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  const counts = new Map<FuelClass, number>();
  for (const { t } of pts) counts.set(t.fuelClass, (counts.get(t.fuelClass) ?? 0) + 1);
  return (
    <figure className="content-block">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-canvas p-4 sm:p-6">
        <svg
          viewBox={`0 0 ${S} ${S}`}
          role="img"
          aria-label={`Evidence rings around ${habitat.name} (${habitat.o2Pct}% O2, ${habitat.pressurePsia} psia) at distances ${GRADE_RINGS.join(", ")}, with ${pts.length} distinct eligible test atmospheres within ${R.toFixed(1)}.`}
          className="mx-auto h-auto w-full max-w-[28rem]"
        >
          <line x1={C} y1={8} x2={C} y2={S - 8} stroke="var(--border-strong)" strokeOpacity={0.5} strokeDasharray="2 6" />
          <line x1={8} y1={C} x2={S - 8} y2={C} stroke="var(--border-strong)" strokeOpacity={0.5} strokeDasharray="2 6" />
          {GRADE_RINGS.map((r, i) => (
            <g key={r}>
              <circle
                cx={C}
                cy={C}
                r={r * k}
                fill={i === 0 ? "var(--accent-soft)" : "none"}
                stroke={i === 0 ? "var(--accent)" : "var(--border-strong)"}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeOpacity={i === 0 ? 1 : 0.8 - i * 0.15}
              />
              <text
                x={C + (r * k) / Math.SQRT2 + 4}
                y={C - (r * k) / Math.SQRT2 - 4}
                fontSize={12}
                className="font-mono"
                fill={i === 0 ? "var(--accent)" : "var(--text-2)"}
              >
                {GRADE_OF_RING[i]} · {r}
              </text>
            </g>
          ))}
          <text x={S - 12} y={C - 8} textAnchor="end" fontSize={11} className="font-mono" fill="var(--text-3)">
            +{o2Scale} O2 pts
          </text>
          <text x={C + 8} y={20} fontSize={11} className="font-mono" fill="var(--text-3)">
            +{pScale} psia
          </text>
          <text x={S - 12} y={S - 12} textAnchor="end" fontSize={11} className="font-mono" fill="var(--warn)">
            F beyond {outer}
          </text>
          {pts.map(({ t, dx, dy }) => (
            <circle
              key={`${t.id}`}
              cx={C + dx * k}
              cy={C - dy * k}
              r={3.4}
              fill={CLASS_TONE[t.fuelClass].fill}
              stroke="var(--bg)"
              strokeWidth={1}
            />
          ))}
          <circle cx={C} cy={C} r={6} fill="none" stroke="var(--text-1)" strokeWidth={2} />
          <circle cx={C} cy={C} r={1.8} fill="var(--text-1)" />
        </svg>
      </div>
      <figcaption className="mt-3 flex flex-col gap-2">
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-2">
          {(Object.keys(CLASS_TONE) as FuelClass[]).map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true">
                <circle cx="5" cy="5" r="4" fill={CLASS_TONE[c].fill} />
              </svg>
              {CLASS_TONE[c].label} <span className="font-mono text-fg-3">{counts.get(c) ?? 0}</span>
            </span>
          ))}
        </span>
        <span className="type-caption text-fg-3">
          Centre: {habitat.name}, {habitat.o2Pct}% O2 at {habitat.pressurePsia} psia. Each dot is a distinct eligible test atmosphere within
          distance {R.toFixed(1)}; right is more oxygen, up is more pressure.
        </span>
      </figcaption>
    </figure>
  );
}

/* ---------- Ranking weights ---------- */

const PART_LABEL: Record<keyof RankWeights, string> = {
  proximity: "Closeness",
  fuel: "Fuel match",
  hazard: "Hazards",
  richness: "Evidence size",
};
const PART_TONE: Record<keyof RankWeights, string> = {
  proximity: "bg-accent",
  fuel: "bg-[var(--accent-line)]",
  hazard: "bg-fg-3",
  richness: "bg-line-strong",
};

export function WeightsBar({ weights }: { weights: RankWeights }) {
  const keys = Object.keys(weights) as (keyof RankWeights)[];
  const total = keys.reduce((s, k) => s + weights[k], 0);
  return (
    <figure className="content-block">
      <div
        role="img"
        aria-label={`Ranking weights: ${keys.map((k) => `${PART_LABEL[k]} ${weights[k]}`).join(", ")}`}
        className="flex h-11 overflow-hidden rounded-[var(--radius-md)] border border-line"
      >
        {keys.map((k) => (
          <div key={k} className={`${PART_TONE[k]} flex items-center border-r border-canvas px-3 last:border-r-0`} style={{ width: `${(weights[k] / total) * 100}%` }}>
            <span className={`font-mono text-[0.8125rem] ${k === "proximity" ? "text-accent-ink" : "text-fg"}`}>{weights[k]}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-2">
        {keys.map((k) => (
          <span key={k} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className={`inline-block size-2.5 rounded-[2px] ${PART_TONE[k]}`} />
            {PART_LABEL[k]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
