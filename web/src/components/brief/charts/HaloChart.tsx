"use client";

import { useId, useState } from "react";
import { GRADE_RINGS } from "@/lib/engine/grade";
import { PRESETS } from "@/lib/engine/presets";
import { X_MAX, X_MIN, Y_MAX } from "./haloAxes";
import { useWidth } from "./useWidth";

export type ChartClass = "solid" | "solid_surrogate" | "droplet" | "gas";

export interface HaloChartProps {
  /** Eligible tests as [o2Pct, pressurePsia, class index into CLASSES]. */
  points: Array<[number, number, number]>;
  habitat: { name: string; o2: number; p: number };
  /** Nearest real solid test, with a label built from facts. */
  nearestSolid: { o2: number; p: number; label: string; acronym: string } | null;
  classCounts: Record<ChartClass, number>;
  /** Eligible tests above the pressure axis, left out of the plot. */
  hiddenAbove: number;
  /** Short text alternative for the chart. */
  description: string;
}

const CLASSES: ChartClass[] = ["solid", "solid_surrogate", "droplet", "gas"];
const CLASS_NAME: Record<ChartClass, string> = {
  solid: "Real cabin solid",
  solid_surrogate: "Solid surrogate",
  droplet: "Liquid droplet",
  gas: "Gas flame",
};

// Ring radii follow the evidence distance (10 O2-points ≙ 3 psia) at the grade limits.
const RINGS = GRADE_RINGS.map((d, i) => ({ d, label: `${["B", "C", "D"][i]}-ring` }));
const O2_PER_D = 10;
const P_PER_D = 3;
// The challenge's Moon envelope: O2 at least the Moon preset's, pressure at most the Moon preset's.
// The box is drawn up to 40% O2 and down to 5 psia (plotting extent, not a limit from the challenge).
const ENVELOPE = { o2: [PRESETS.moon.o2Pct, 40], p: [5, PRESETS.moon.pressurePsia] } as const;

function Marker({ cls, x, y, size = 1 }: { cls: ChartClass; x: number; y: number; size?: number }) {
  switch (cls) {
    case "solid": {
      const s = 3.6 * size;
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.4} />;
    }
    case "solid_surrogate": {
      const s = 4.2 * size;
      return <path d={`M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`} fill="var(--flame)" stroke="var(--surface)" strokeWidth={0.8} />;
    }
    case "droplet":
      return <circle cx={x} cy={y} r={2.4 * size} fill="var(--muted)" fillOpacity={0.32} />;
    default: {
      const s = 2.4 * size;
      return <path d={`M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}`} stroke="var(--rule-strong)" strokeWidth={1.1} strokeOpacity={0.75} />;
    }
  }
}

function LegendSwatch({ cls }: { cls: ChartClass }) {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-hidden="true">
      <Marker cls={cls} x={7} y={7} size={1.25} />
    </svg>
  );
}

export function HaloChart({ points, habitat, nearestSolid, classCounts, hiddenAbove, description }: HaloChartProps) {
  const [wrap, width] = useWidth<HTMLDivElement>(760, 300, 900);
  const [hidden, setHidden] = useState<Set<ChartClass>>(new Set());
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const narrow = width < 520;
  const height = Math.round(narrow ? width * 1.02 : Math.max(340, width * 0.58));
  const broken = habitat.o2 > X_MAX;
  const xMin = Math.min(X_MIN, Math.floor(habitat.o2 / 5) * 5);
  const m = { l: narrow ? 36 : 46, r: narrow ? 8 : 14, t: 14, b: 40 };
  const breakW = broken ? (narrow ? 50 : 64) : 0;
  const plotR = width - m.r - breakW;
  const kx = (plotR - m.l) / (X_MAX - xMin);
  const ky = (height - m.t - m.b) / Y_MAX;
  const sx = (o2: number) => m.l + (o2 - xMin) * kx;
  const sy = (p: number) => height - m.b - Math.min(Y_MAX, Math.max(0, p)) * ky;
  // Habitat x: on the main axis, or centred in the break column (">45%").
  const hx = broken ? plotR + breakW / 2 + 4 : sx(habitat.o2);
  const hy = sy(habitat.p);
  const fs = narrow ? 10.5 : 11.5;
  const xTicks = [] as number[];
  for (let v = Math.ceil(xMin / 5) * 5; v <= X_MAX; v += narrow ? 10 : 5) xTicks.push(v);
  const yTicks = [0, 5, 10, 15, 20];

  const toggle = (c: ChartClass) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  const clipMain = `halo-main-${uid}`;
  const clipBreak = `halo-break-${uid}`;
  const ringClip = broken ? clipBreak : clipMain;

  // When the nearest solid sits under the habitat mark, the habitat label carries it instead.
  const solidAtHabitat =
    !!nearestSolid && Math.hypot(sx(nearestSolid.o2) - hx, sy(nearestSolid.p) - hy) < 18;
  const habitatLabel = broken
    ? "Habitat"
    : `${habitat.name.length > 22 ? "Habitat" : habitat.name}${solidAtHabitat ? ` · ${nearestSolid!.acronym} ${nearestSolid!.label}` : ""}`;

  const ordered = [3, 2, 1, 0]; // draw gas first, solids last (on top)

  return (
    <figure className="halo-chart m-0">
      <div ref={wrap} className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-labelledby={`${uid}-t ${uid}-d`}
          className="block h-auto w-full overflow-visible"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <title id={`${uid}-t`}>{`Evidence halo for ${habitat.name}: NASA microgravity tests by oxygen and pressure`}</title>
          <desc id={`${uid}-d`}>{description}</desc>
          <defs>
            <clipPath id={clipMain}>
              <rect x={m.l} y={m.t} width={plotR - m.l} height={height - m.t - m.b} />
            </clipPath>
            {broken && (
              <clipPath id={clipBreak}>
                <rect x={plotR + 8} y={m.t} width={breakW - 8} height={height - m.t - m.b} />
              </clipPath>
            )}
            <radialGradient id={`${uid}-glow`}>
              <stop offset="0%" stopColor="var(--flame)" stopOpacity="0.16" />
              <stop offset="55%" stopColor="var(--flame)" stopOpacity="0.07" />
              <stop offset="100%" stopColor="var(--flame)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* grid */}
          <g aria-hidden="true">
            <rect x={m.l} y={m.t} width={plotR - m.l} height={height - m.t - m.b} fill="var(--surface)" />
            {yTicks.map((v) => (
              <g key={`y${v}`}>
                <line x1={m.l} x2={plotR} y1={sy(v)} y2={sy(v)} stroke="var(--rule)" strokeWidth={v === 0 ? 1 : 0.6} />
                <text x={m.l - 7} y={sy(v)} dy="0.32em" textAnchor="end" fontSize={fs} fill="var(--muted)" className="num">
                  {v}
                </text>
              </g>
            ))}
            {xTicks.map((v) => (
              <g key={`x${v}`}>
                <line x1={sx(v)} x2={sx(v)} y1={m.t} y2={height - m.b} stroke="var(--rule)" strokeWidth={0.6} />
                <text x={sx(v)} y={height - m.b + 16} textAnchor="middle" fontSize={fs} fill="var(--muted)" className="num">
                  {v}
                </text>
              </g>
            ))}
            <text x={(m.l + plotR) / 2} y={height - 6} textAnchor="middle" fontSize={fs} fill="var(--muted)">
              Oxygen, O₂ (%)
            </text>
            <text transform={`translate(11 ${(m.t + height - m.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs} fill="var(--muted)">
              Pressure (psia)
            </text>
            {broken && (
              <g>
                <rect x={plotR + 8} y={m.t} width={breakW - 8} height={height - m.t - m.b} fill="var(--surface)" />
                {yTicks.map((v) => (
                  <line key={v} x1={plotR + 8} x2={width - m.r} y1={sy(v)} y2={sy(v)} stroke="var(--rule)" strokeWidth={v === 0 ? 1 : 0.6} />
                ))}
                {/* axis break: two slanted strokes */}
                <path
                  d={`M${plotR + 1} ${height - m.b + 6}l4 -12M${plotR + 5} ${height - m.b + 6}l4 -12`}
                  stroke="var(--muted)"
                  strokeWidth={1.2}
                />
                <text x={hx} y={height - m.b + 16} textAnchor="middle" fontSize={fs} fill="var(--ink)" fontWeight={600} className="num">
                  {`${habitat.o2}%`}
                </text>
              </g>
            )}
          </g>

          {/* Moon envelope */}
          <g aria-hidden="true" clipPath={`url(#${clipMain})`}>
            <rect
              x={sx(ENVELOPE.o2[0])}
              y={sy(ENVELOPE.p[1])}
              width={(ENVELOPE.o2[1] - ENVELOPE.o2[0]) * kx}
              height={(ENVELOPE.p[1] - ENVELOPE.p[0]) * ky}
              fill="none"
              stroke="var(--ink)"
              strokeOpacity={0.55}
              strokeWidth={1.1}
              strokeDasharray="5 4"
            />
            <text x={sx(ENVELOPE.o2[1]) - 5} y={sy(ENVELOPE.p[0]) - 6} textAnchor="end" fontSize={fs - 0.5} fill="var(--muted)" className="halo-label">
              Moon envelope
            </text>
          </g>

          {/* halo rings */}
          <g aria-hidden="true" clipPath={`url(#${ringClip})`}>
            <ellipse cx={hx} cy={hy} rx={2.4 * O2_PER_D * kx} ry={2.4 * P_PER_D * ky} fill={`url(#${uid}-glow)`} />
            {RINGS.map((r, i) => {
              const rx = r.d * O2_PER_D * kx;
              const ry = r.d * P_PER_D * ky;
              return (
                <ellipse
                  key={r.label}
                  cx={hx}
                  cy={hy}
                  rx={rx}
                  ry={ry}
                  fill="var(--flame)"
                  fillOpacity={0.045}
                  stroke="var(--flame)"
                  strokeOpacity={0.62 - i * 0.14}
                  strokeWidth={1.1}
                  strokeDasharray={i === 2 ? "2 3" : undefined}
                />
              );
            })}
          </g>

          {/* tests */}
          <g aria-hidden="true" clipPath={`url(#${clipMain})`}>
            {ordered.map((ci) =>
              hidden.has(CLASSES[ci]) ? null : (
                <g key={ci} data-class={CLASSES[ci]}>
                  {points
                    .filter((pt) => pt[2] === ci)
                    .map((pt, i) => (
                      <Marker key={i} cls={CLASSES[ci]} x={sx(pt[0])} y={sy(pt[1])} />
                    ))}
                </g>
              ),
            )}
          </g>

          {/* ring labels, drawn above the points */}
          <g aria-hidden="true" clipPath={`url(#${ringClip})`}>
            {RINGS.map((r) => {
              const rx = r.d * O2_PER_D * kx;
              const ry = r.d * P_PER_D * ky;
              // First candidate position on the ring where the label fits inside the plot.
              const lw = r.label.length * fs * 0.55;
              const [left, right] = broken ? [plotR + 8, width - m.r] : [m.l, plotR];
              const spot =
                [-58, -122, -90, 58, 122].map((deg) => {
                  const a = (deg * Math.PI) / 180;
                  return { x: hx + rx * Math.cos(a), y: hy + ry * Math.sin(a), deg };
                }).find((c) => c.x - lw / 2 > left + 2 && c.x + lw / 2 < right - 2 && c.y > m.t + fs && c.y < height - m.b - 4) ?? null;
              if (!spot) return null;
              return (
                <text key={r.label} x={spot.x} y={spot.y - 3} textAnchor="middle" fontSize={fs - 1} fill="var(--flame)" fontWeight={600} className="halo-label">
                  {r.label}
                </text>
              );
            })}
          </g>

          {/* nearest solid and its gap */}
          {nearestSolid && !hidden.has("solid") && !solidAtHabitat && (
            <g aria-hidden="true">
              <line
                x1={hx}
                y1={hy}
                x2={sx(nearestSolid.o2)}
                y2={sy(nearestSolid.p)}
                stroke="var(--ink)"
                strokeOpacity={0.7}
                strokeWidth={1}
                strokeDasharray="1 3"
                strokeLinecap="round"
              />
              <rect
                x={sx(nearestSolid.o2) - 6}
                y={sy(nearestSolid.p) - 6}
                width={12}
                height={12}
                fill="var(--surface)"
                stroke="var(--ink)"
                strokeWidth={2}
              />
              <NearestLabel
                x={sx(nearestSolid.o2)}
                y={sy(nearestSolid.p)}
                lines={[`Nearest real solid · ${nearestSolid.acronym}`, nearestSolid.label]}
                fs={fs}
                minX={m.l + 4}
                maxX={plotR - 4}
                above={sy(nearestSolid.p) > m.t + 44}
              />
            </g>
          )}

          {/* habitat */}
          <g aria-hidden="true">
            <path
              d={`M${hx - 7} ${hy - 7}L${hx + 7} ${hy + 7}M${hx + 7} ${hy - 7}L${hx - 7} ${hy + 7}`}
              stroke="var(--paper)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <path
              d={`M${hx - 7} ${hy - 7}L${hx + 7} ${hy + 7}M${hx + 7} ${hy - 7}L${hx - 7} ${hy + 7}`}
              stroke="var(--ink)"
              strokeWidth={2.6}
              strokeLinecap="round"
            />
            <text
              x={broken ? hx : hx + 11}
              y={broken ? hy + 22 : hy + 18}
              textAnchor={broken ? "middle" : hx > plotR - 120 ? "end" : "start"}
              fontSize={fs}
              fontWeight={700}
              fill="var(--ink)"
              className="halo-label"
            >
              {habitatLabel}
            </text>
          </g>
        </svg>
      </div>

      <figcaption className="mt-4 flex flex-col gap-3">
        <ul className="flex flex-wrap gap-x-1.5 gap-y-2 text-sm" aria-label="Fuel classes (toggle to show or hide)">
          {CLASSES.map((c) => (
            <li key={c}>
              <button
                type="button"
                aria-pressed={!hidden.has(c)}
                onClick={() => toggle(c)}
                className={`legend-toggle inline-flex items-center gap-2 rounded-full border px-3 py-1 transition-[opacity,border-color] duration-150 ${
                  hidden.has(c) ? "border-rule opacity-50" : "border-rule-strong"
                }`}
              >
                <LegendSwatch cls={c} />
                <span>{CLASS_NAME[c]}</span>
                <span className="num font-mono text-xs text-muted">{classCounts[c]}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Your habitat
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 22 14" className="h-3.5 w-5" aria-hidden="true">
              <ellipse cx="11" cy="7" rx="9.5" ry="5.5" fill="var(--flame)" fillOpacity="0.08" stroke="var(--flame)" strokeOpacity="0.6" />
            </svg>
            {`Halo rings at evidence distance ${GRADE_RINGS.join(" · ")} (grades B · C · D)`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 22 14" className="h-3.5 w-5" aria-hidden="true">
              <rect x="1.5" y="2" width="19" height="10" fill="none" stroke="var(--ink)" strokeOpacity="0.6" strokeDasharray="3 2" />
            </svg>
            Moon envelope
          </span>
          {hiddenAbove > 0 && (
            <span data-hidden-above>
              <span className="num">{hiddenAbove}</span> tests above {Y_MAX} psia not shown
            </span>
          )}
        </p>
      </figcaption>
    </figure>
  );
}

function NearestLabel({
  x,
  y,
  lines,
  fs,
  minX,
  maxX,
  above,
}: {
  x: number;
  y: number;
  lines: string[];
  fs: number;
  minX: number;
  maxX: number;
  above: boolean;
}) {
  const approxW = Math.max(...lines.map((l) => l.length)) * fs * 0.56;
  const tx = Math.min(maxX - approxW / 2, Math.max(minX + approxW / 2, x));
  const ty = above ? y - 14 - (lines.length - 1) * (fs + 3) : y + 22;
  return (
    <text x={tx} y={ty} textAnchor="middle" fontSize={fs} fill="var(--ink)" className="halo-label">
      {lines.map((l, i) => (
        <tspan key={i} x={tx} dy={i === 0 ? 0 : fs + 3} fontWeight={i === 1 ? 700 : 500}>
          {l}
        </tspan>
      ))}
    </text>
  );
}
