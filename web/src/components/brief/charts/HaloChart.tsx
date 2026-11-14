"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/components/ui/cx";
import { scaledDistance } from "@/lib/engine/distance";
import { GRADE_RINGS } from "@/lib/engine/grade";
import { PRESETS } from "@/lib/engine/presets";
import { X_MAX, X_MIN, Y_MAX } from "./haloAxes";
import { useWidth } from "./useWidth";

export type ChartClass = "solid" | "solid_surrogate" | "droplet" | "gas";

/** One plotted mark: [o2Pct, pressurePsia, class index, acronym index, fuel index, tests at this point]. */
export type ChartPoint = [number, number, number, number, number, number];

export interface HaloChartProps {
  /** Eligible tests, deduplicated by condition, investigation and fuel. */
  points: ChartPoint[];
  acronyms: string[];
  fuels: string[];
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
const RINGS = GRADE_RINGS.map((d, i) => ({ d, grade: ["B", "C", "D"][i], label: `${["B", "C", "D"][i]}-ring` }));
const O2_PER_D = 10;
const P_PER_D = 3;
// The challenge's Moon envelope: O2 at least the Moon preset's, pressure at most the Moon preset's.
// The box is drawn up to 40% O2 and down to 5 psia (plotting extent, not a limit from the challenge).
const ENVELOPE = { o2: [PRESETS.moon.o2Pct, 40], p: [5, PRESETS.moon.pressurePsia] } as const;
const MONO = "var(--font-mono)";
const ordered = [3, 2, 1, 0]; // draw gas first, solids last (on top)

function Marker({ cls, x, y, size = 1 }: { cls: ChartClass; x: number; y: number; size?: number }) {
  switch (cls) {
    case "solid": {
      const s = 3.4 * size;
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth={1.3} />;
    }
    case "solid_surrogate": {
      const s = 4.2 * size;
      return <path d={`M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`} fill="var(--accent)" stroke="var(--surface-1)" strokeWidth={0.8} />;
    }
    case "droplet":
      return <circle cx={x} cy={y} r={2.3 * size} fill="var(--text-3)" fillOpacity={0.42} />;
    default: {
      const s = 2.5 * size;
      return <path d={`M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}`} stroke="var(--text-3)" strokeWidth={1.1} strokeOpacity={0.8} />;
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

/** Ring draw-in, once, when the chart first scrolls into view (never under reduced motion). */
function useDrawOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<"idle" | "pending" | "go">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already visible: draw nothing, show it as is
    setState("pending");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("go");
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, state] as const;
}

export function HaloChart({ points, acronyms, fuels, habitat, nearestSolid, classCounts, hiddenAbove, description }: HaloChartProps) {
  const [wrap, width] = useWidth<HTMLDivElement>(760, 300, 900);
  const [drawRef, draw] = useDrawOnView<HTMLElement>();
  const [hidden, setHidden] = useState<Set<ChartClass>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const narrow = width < 520;
  const height = Math.round(narrow ? width * 1.05 : Math.max(360, width * 0.6));
  const broken = habitat.o2 > X_MAX;
  const xMin = Math.min(X_MIN, Math.floor(habitat.o2 / 5) * 5);
  const m = { l: narrow ? 40 : 52, r: narrow ? 10 : 16, t: 16, b: narrow ? 44 : 48 };
  const breakW = broken ? (narrow ? 54 : 70) : 0;
  const plotR = width - m.r - breakW;
  const plotB = height - m.b;
  const kx = (plotR - m.l) / (X_MAX - xMin);
  const ky = (plotB - m.t) / Y_MAX;
  const sx = (o2: number) => m.l + (o2 - xMin) * kx;
  const sy = (p: number) => plotB - Math.min(Y_MAX, Math.max(0, p)) * ky;
  // Habitat x: on the main axis, or centred in the break column (">45%").
  const hx = broken ? plotR + breakW / 2 + 4 : sx(habitat.o2);
  const hy = sy(habitat.p);
  const fs = narrow ? 10.5 : 11.5;
  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin / 5) * 5; v <= X_MAX; v += narrow ? 10 : 5) xTicks.push(v);
  const xMinor: number[] = [];
  for (let v = Math.ceil(xMin); v <= X_MAX; v += 1) xMinor.push(v);
  const yTicks = [0, 5, 10, 15, 20];
  const yMinor = Array.from({ length: Y_MAX + 1 }, (_, i) => i);

  const toggle = (c: ChartClass) => {
    setActive(null);
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  };

  // Visible points in reading order for the keyboard: nearest to the habitat first.
  const order = useMemo(
    () =>
      points
        .map((pt, i) => ({ i, d: scaledDistance(habitat.o2, habitat.p, pt[0], pt[1]) }))
        .filter(({ i }) => !hidden.has(CLASSES[points[i][2]]))
        .sort((a, b) => a.d - b.d || a.i - b.i)
        .map((x) => x.i),
    [points, hidden, habitat.o2, habitat.p],
  );

  const clipMain = `halo-main-${uid}`;
  const clipBreak = `halo-break-${uid}`;
  const ringClip = broken ? clipBreak : clipMain;

  // When the nearest solid sits under the habitat mark, the habitat label carries it instead.
  const solidAtHabitat = !!nearestSolid && Math.hypot(sx(nearestSolid.o2) - hx, sy(nearestSolid.p) - hy) < 18;
  const habitatLabel = broken
    ? "Habitat"
    : `${habitat.name.length > 22 ? "Habitat" : habitat.name}${solidAtHabitat ? ` · ${nearestSolid!.acronym} ${nearestSolid!.label}` : ""}`;


  // Pointer: the nearest visible mark within reach of the cursor.
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * width;
    const y = ((e.clientY - r.top) / r.height) * height;
    let best = -1;
    let bd = 14 * 14;
    for (const i of order) {
      const pt = points[i];
      if (pt[1] > Y_MAX) continue;
      const dx = sx(pt[0]) - x;
      const dy = sy(pt[1]) - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bd) {
        bd = d2;
        best = i;
      }
    }
    setKeyboard(false);
    setActive(best >= 0 ? best : null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!order.length) return;
    const pos = active === null ? -1 : order.indexOf(active);
    let next: number | null | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = order[Math.min(order.length - 1, pos + 1)];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = order[Math.max(0, pos - 1)];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[order.length - 1];
    else if (e.key === "Escape") next = null;
    if (next === undefined) return;
    e.preventDefault();
    setKeyboard(true);
    setActive(next);
  };

  const tip = active !== null ? points[active] : null;
  const tipInfo = tip
    ? {
        cls: CLASSES[tip[2]],
        acronym: acronyms[tip[3]] ?? "",
        fuel: fuels[tip[4]] ?? "",
        o2: tip[0],
        p: tip[1],
        n: tip[5],
        d: scaledDistance(habitat.o2, habitat.p, tip[0], tip[1]),
        x: sx(tip[0]),
        y: sy(tip[1]),
      }
    : null;
  const tipText = tipInfo
    ? `${tipInfo.acronym}, ${CLASS_NAME[tipInfo.cls].toLowerCase()}: ${tipInfo.fuel}. ${tipInfo.o2}% O2, ${tipInfo.p} psia` +
      `${tipInfo.n > 1 ? `, ${tipInfo.n} tests at this point` : ""}. Evidence distance ${tipInfo.d.toFixed(2)} from your habitat.`
    : "";

  // The ~600 marks only change with the data, the size or the class toggles, not on hover or keyboard steps.
  const markers = useMemo(
    () =>
      ordered.map((ci) =>
        hidden.has(CLASSES[ci]) ? null : (
          <g key={ci} data-class={CLASSES[ci]}>
            {points.map((pt, i) => (pt[2] === ci ? <Marker key={i} cls={CLASSES[ci]} x={sx(pt[0])} y={sy(pt[1])} /> : null))}
          </g>
        ),
      ),
    // sx/sy are derived from width, height and the habitat's O2 (axis start and break column).
    [points, hidden, width, height, habitat.o2],
  );

  // Ring geometry, shared by the ellipses, ticks and labels.
  const rings = RINGS.map((r) => ({ ...r, rx: r.d * O2_PER_D * kx, ry: r.d * P_PER_D * ky }));
  const outer = rings[rings.length - 1];
  const dialTicks = Array.from({ length: 36 }, (_, i) => i * 10);

  return (
    <figure ref={drawRef} className="halo-chart m-0" data-draw={draw}>
      <div
        ref={wrap}
        tabIndex={0}
        role="group"
        aria-label="Evidence halo. Use the arrow keys to step through the tests, nearest first; Escape clears."
        onKeyDown={onKey}
        onFocus={() => {
          if (active === null && order.length) {
            setKeyboard(true);
            setActive(order[0]);
          }
        }}
        onBlur={() => keyboard && setActive(null)}
        className="relative w-full rounded-[var(--radius-md)] outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-labelledby={`${uid}-t ${uid}-d`}
          className="block h-auto w-full select-none overflow-visible"
          style={{ fontFamily: "var(--font-sans)" }}
          onPointerMove={onMove}
          onPointerLeave={() => !keyboard && setActive(null)}
        >
          <title id={`${uid}-t`}>{`Evidence halo for ${habitat.name}: NASA microgravity tests by oxygen and pressure`}</title>
          <desc id={`${uid}-d`}>{description}</desc>
          <defs>
            <clipPath id={clipMain}>
              <rect x={m.l} y={m.t} width={plotR - m.l} height={plotB - m.t} />
            </clipPath>
            {broken && (
              <clipPath id={clipBreak}>
                <rect x={plotR + 8} y={m.t} width={breakW - 8} height={plotB - m.t} />
              </clipPath>
            )}
            <radialGradient id={`${uid}-glow`}>
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="45%" stopColor="var(--accent)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Plot frame, grid, ticks and axis captions. */}
          <g aria-hidden="true">
            <rect x={m.l} y={m.t} width={plotR - m.l} height={plotB - m.t} fill="var(--surface-1)" />
            {yTicks.map((v) => (
              <line key={`gy${v}`} x1={m.l} x2={plotR} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth={1} shapeRendering="crispEdges" />
            ))}
            {xTicks.map((v) => (
              <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={m.t} y2={plotB} stroke="var(--border)" strokeWidth={1} shapeRendering="crispEdges" />
            ))}
            <rect x={m.l} y={m.t} width={plotR - m.l} height={plotB - m.t} fill="none" stroke="var(--border-strong)" strokeOpacity={0.55} strokeWidth={1} shapeRendering="crispEdges" />
            {/* minor ticks: every O2-point and every psia */}
            <g stroke="var(--border-strong)" strokeWidth={1} shapeRendering="crispEdges">
              {xMinor.map((v) => {
                const major = v % 5 === 0;
                return <line key={`mx${v}`} x1={sx(v)} x2={sx(v)} y1={plotB} y2={plotB + (major ? 6 : 3)} strokeOpacity={major ? 0.9 : 0.5} />;
              })}
              {yMinor.map((v) => {
                const major = v % 5 === 0;
                return <line key={`my${v}`} x1={m.l - (major ? 6 : 3)} x2={m.l} y1={sy(v)} y2={sy(v)} strokeOpacity={major ? 0.9 : 0.5} />;
              })}
            </g>
            {yTicks.map((v) => (
              <text key={`ty${v}`} x={m.l - 10} y={sy(v)} dy="0.32em" textAnchor="end" fontSize={fs - 0.5} fontFamily={MONO} fill="var(--text-3)" className="num">
                {v}
              </text>
            ))}
            {xTicks.map((v) => (
              <text key={`tx${v}`} x={sx(v)} y={plotB + 19} textAnchor="middle" fontSize={fs - 0.5} fontFamily={MONO} fill="var(--text-3)" className="num">
                {v}
              </text>
            ))}
            <text x={(m.l + plotR) / 2} y={height - 6} textAnchor="middle" fontSize={10} fontFamily={MONO} letterSpacing="0.12em" fill="var(--text-3)">
              OXYGEN O₂ · %
            </text>
            <text transform={`translate(11 ${(m.t + plotB) / 2}) rotate(-90)`} textAnchor="middle" fontSize={10} fontFamily={MONO} letterSpacing="0.12em" fill="var(--text-3)">
              PRESSURE · PSIA
            </text>
            {broken && (
              <g>
                <rect x={plotR + 8} y={m.t} width={breakW - 8} height={plotB - m.t} fill="var(--surface-1)" stroke="var(--border-strong)" strokeOpacity={0.55} shapeRendering="crispEdges" />
                {yTicks.map((v) => (
                  <line key={v} x1={plotR + 8} x2={width - m.r} y1={sy(v)} y2={sy(v)} stroke="var(--border)" shapeRendering="crispEdges" />
                ))}
                {/* axis break: two slanted strokes */}
                <path d={`M${plotR + 1} ${plotB + 6}l4 -12M${plotR + 5} ${plotB + 6}l4 -12`} stroke="var(--text-3)" strokeWidth={1.2} />
                <text x={hx} y={plotB + 19} textAnchor="middle" fontSize={fs} fontFamily={MONO} fill="var(--text-1)" fontWeight={600} className="num">
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
              fill="var(--text-2)"
              fillOpacity={0.03}
              stroke="var(--text-2)"
              strokeOpacity={0.7}
              strokeWidth={1}
              strokeDasharray="5 4"
            />
            <text x={sx(ENVELOPE.o2[1]) - 6} y={sy(ENVELOPE.p[0]) - 7} textAnchor="end" fontSize={9.5} fontFamily={MONO} letterSpacing="0.12em" fill="var(--text-2)" className="halo-label">
              MOON ENVELOPE
            </text>
          </g>

          {/* The halo: crosshair through the habitat, glow, the grade rings and a dial on the outer ring. */}
          <g aria-hidden="true" clipPath={`url(#${ringClip})`} className="halo-rings">
            <g stroke="var(--border-strong)" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 5">
              <line x1={broken ? plotR + 8 : m.l} x2={broken ? width - m.r : plotR} y1={hy} y2={hy} />
              <line x1={hx} x2={hx} y1={m.t} y2={plotB} />
            </g>
            <ellipse className="chart-glow" cx={hx} cy={hy} rx={outer.rx * 1.15} ry={outer.ry * 1.15} fill={`url(#${uid}-glow)`} />
            {rings.map((r, i) => {
              const inner = i === 0;
              return (
                <ellipse
                  key={r.label}
                  cx={hx}
                  cy={hy}
                  rx={r.rx}
                  ry={r.ry}
                  pathLength={1}
                  fill="none"
                  stroke={inner ? "var(--accent)" : "var(--border-strong)"}
                  strokeOpacity={inner ? 1 : i === 1 ? 0.85 : 0.7}
                  strokeWidth={inner ? 1.75 : 1}
                  className={cx("halo-ring", inner && "halo-ring-active")}
                  style={{ ["--i" as string]: i }}
                />
              );
            })}
            {/* dial ticks on the D-ring, every 10° (major every 30°) */}
            <g stroke="var(--border-strong)" strokeWidth={1} className="halo-dial">
              {dialTicks.map((deg) => {
                const a = (deg * Math.PI) / 180;
                const major = deg % 30 === 0;
                const c = Math.cos(a);
                const s = Math.sin(a);
                const len = major ? 7 : 4;
                return (
                  <line
                    key={deg}
                    x1={hx + outer.rx * c}
                    y1={hy + outer.ry * s}
                    x2={hx + (outer.rx + len) * c}
                    y2={hy + (outer.ry + len) * s}
                    strokeOpacity={major ? 0.9 : 0.45}
                  />
                );
              })}
            </g>
          </g>

          {/* tests */}
          <g aria-hidden="true" clipPath={`url(#${clipMain})`}>
            {markers}
          </g>

          {/* Ring labels on the 45° radial, as on the dial, drawn above the points. */}
          <g aria-hidden="true" clipPath={`url(#${ringClip})`}>
            {rings.map((r, i) => {
              const text = `${r.label} · d ${r.d}`;
              const lw = text.length * 9.5 * 0.62;
              const [left, right] = broken ? [plotR + 8, width - m.r] : [m.l, plotR];
              const spot =
                [-45, -135, -60, -120, 45, 135]
                  .map((deg) => {
                    const a = (deg * Math.PI) / 180;
                    return { x: hx + r.rx * Math.cos(a), y: hy + r.ry * Math.sin(a), right: Math.cos(a) >= 0 };
                  })
                  .find((c) =>
                    c.right
                      ? c.x + 6 + lw < right - 2 && c.y - 14 > m.t && c.y < plotB - 4
                      : c.x - 6 - lw > left + 2 && c.y - 14 > m.t && c.y < plotB - 4,
                  ) ?? null;
              // Phones: no ring labels over the data; the legend names the rings.
              if (!spot || narrow) return null;
              const on = i === 0;
              return (
                <g key={r.label}>
                  <circle cx={spot.x} cy={spot.y} r={2.5} fill={on ? "var(--accent)" : "var(--text-3)"} />
                  <text
                    x={spot.right ? spot.x + 6 : spot.x - 6}
                    y={spot.y - 6}
                    textAnchor={spot.right ? "start" : "end"}
                    fontSize={9.5}
                    fontFamily={MONO}
                    letterSpacing="0.1em"
                    fill={on ? "var(--accent)" : "var(--text-2)"}
                    className="halo-label"
                  >
                    {text.toUpperCase()}
                  </text>
                </g>
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
                stroke="var(--text-1)"
                strokeOpacity={0.75}
                strokeWidth={1.1}
                strokeDasharray="1 3.5"
                strokeLinecap="round"
              />
              <rect
                x={sx(nearestSolid.o2) - 6}
                y={sy(nearestSolid.p) - 6}
                width={12}
                height={12}
                fill="var(--surface-1)"
                stroke="var(--text-1)"
                strokeWidth={2}
              />
              {!narrow && <NearestLabel
                x={sx(nearestSolid.o2)}
                y={sy(nearestSolid.p)}
                lines={[`Nearest real solid · ${nearestSolid.acronym}`, nearestSolid.label]}
                fs={fs}
                minX={m.l + 4}
                maxX={plotR - 4}
                above={sy(nearestSolid.p) > m.t + 48}
              />}
            </g>
          )}

          {/* habitat: glowing marker at the centre of its halo */}
          <g aria-hidden="true">
            <circle className="chart-glow habitat-glow" cx={hx} cy={hy} r={16} fill={`url(#${uid}-glow)`} />
            <circle cx={hx} cy={hy} r={10.5} fill="none" stroke="var(--accent)" strokeWidth={1.25} className="habitat-ring" />
            <path d={`M${hx - 6} ${hy - 6}L${hx + 6} ${hy + 6}M${hx + 6} ${hy - 6}L${hx - 6} ${hy + 6}`} stroke="var(--surface-1)" strokeWidth={5.5} strokeLinecap="round" />
            <path d={`M${hx - 6} ${hy - 6}L${hx + 6} ${hy + 6}M${hx + 6} ${hy - 6}L${hx - 6} ${hy + 6}`} stroke="var(--text-1)" strokeWidth={2.4} strokeLinecap="round" />
            <text
              x={broken ? hx : hx + 16}
              y={broken ? hy + 26 : hy + 20}
              textAnchor={broken ? "middle" : hx > plotR - 140 ? "end" : "start"}
              dx={!broken && hx > plotR - 140 ? -30 : 0}
              fontSize={fs + 0.5}
              fontWeight={650}
              fill="var(--text-1)"
              className="halo-label"
            >
              {habitatLabel}
            </text>
          </g>

          {/* inspected point */}
          {tipInfo && (
            <g aria-hidden="true" pointerEvents="none">
              <circle cx={tipInfo.x} cy={tipInfo.y} r={8} fill="none" stroke="var(--focus)" strokeWidth={1.75} />
              <line x1={tipInfo.x} x2={tipInfo.x} y1={tipInfo.y + 8} y2={plotB} stroke="var(--focus)" strokeOpacity={0.45} strokeDasharray="2 3" />
              <line x1={m.l} x2={tipInfo.x - 8} y1={tipInfo.y} y2={tipInfo.y} stroke="var(--focus)" strokeOpacity={0.45} strokeDasharray="2 3" />
            </g>
          )}
        </svg>

        {tipInfo && (
          <div
            aria-hidden="true"
            className="glass-strong pointer-events-none absolute z-[var(--z-tooltip)] w-max max-w-[15rem] rounded-[var(--radius-sm)] px-3 py-2 text-[0.8125rem] leading-snug text-fg"
            style={{
              left: `${(Math.min(Math.max(tipInfo.x, 110), width - 110) / width) * 100}%`,
              top: `${(tipInfo.y / height) * 100}%`,
              transform: tipInfo.y < 110 ? "translate(-50%, 18px)" : "translate(-50%, calc(-100% - 14px))",
            }}
          >
            <p className="flex items-center gap-2 font-semibold">
              <LegendSwatch cls={tipInfo.cls} />
              {tipInfo.acronym}
              <span className="font-normal text-fg-3">{CLASS_NAME[tipInfo.cls]}</span>
            </p>
            <p className="mt-0.5 text-fg-2">{tipInfo.fuel}</p>
            <p className="num mt-1 font-mono text-[0.75rem] text-fg">
              {tipInfo.o2}% O₂ · {tipInfo.p} psia{tipInfo.n > 1 ? ` · ×${tipInfo.n}` : ""}
            </p>
            <p className="num font-mono text-[0.75rem] text-fg-3">d = {tipInfo.d.toFixed(2)} from habitat</p>
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {keyboard ? tipText : ""}
        </p>
      </div>

      <figcaption className="mt-5 flex flex-col gap-3.5">
        <ul className="flex flex-wrap gap-2" aria-label="Fuel classes (toggle to show or hide)">
          {CLASSES.map((c) => {
            const on = !hidden.has(c);
            return (
              <li key={c}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c)}
                  className={cx(
                    "legend-toggle inline-flex h-8 items-center gap-2 rounded-[var(--radius-pill)] border px-3 text-[0.8125rem] font-medium transition-[background-color,border-color,opacity,scale] duration-[var(--dur-fast)] active:scale-[0.97]",
                    on ? "border-line-strong bg-surface-1 text-fg shadow-[var(--inner-highlight),var(--elev-1)]" : "border-line bg-transparent text-fg-3 opacity-70",
                  )}
                >
                  <LegendSwatch cls={c} />
                  <span className={cx(!on && "line-through decoration-[var(--text-3)]")}>{CLASS_NAME[c]}</span>
                  <span className="num font-mono text-[0.75rem] text-fg-3">{classCounts[c]}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-fg-2">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
              <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="var(--text-1)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Your habitat
          </span>
          {narrow && nearestSolid && !solidAtHabitat && (
            // Phones: the nearest-solid callout sits here instead of over the data.
            <span className="inline-flex items-center gap-1.5" data-nearest-legend>
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <rect x="3" y="3" width="10" height="10" fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth="1.8" />
              </svg>
              <span>
                Nearest real solid · {nearestSolid.acronym}: <span className="font-semibold text-fg">{nearestSolid.label}</span>
              </span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 26 14" className="h-3.5 w-6" aria-hidden="true">
              <ellipse cx="13" cy="7" rx="5" ry="2.6" fill="none" stroke="var(--accent)" strokeWidth="1.3" />
              <ellipse cx="13" cy="7" rx="11.5" ry="5.8" fill="none" stroke="var(--border-strong)" strokeWidth="1" />
            </svg>
            {`Halo rings at evidence distance ${GRADE_RINGS.join(" · ")} (grades B · C · D)`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 22 14" className="h-3.5 w-5" aria-hidden="true">
              <rect x="1.5" y="2" width="19" height="10" fill="none" stroke="var(--text-2)" strokeDasharray="3 2" />
            </svg>
            Moon envelope
          </span>
          {hiddenAbove > 0 && (
            <span data-hidden-above className="text-fg-3">
              <span className="num font-mono">{hiddenAbove}</span> tests above {Y_MAX} psia not shown
            </span>
          )}
        </p>
        <p className="no-print type-caption text-fg-3">Hover a mark, or focus the chart and use the arrow keys, to inspect a test.</p>
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
  const ty = above ? y - 16 - (lines.length - 1) * (fs + 3) : y + 24;
  return (
    <text x={tx} y={ty} textAnchor="middle" fontSize={fs} fill="var(--text-1)" className="halo-label">
      {lines.map((l, i) => (
        <tspan key={i} x={tx} dy={i === 0 ? 0 : fs + 3} fontWeight={i === 1 ? 700 : 500} fill={i === 0 ? "var(--text-2)" : undefined}>
          {l}
        </tspan>
      ))}
    </text>
  );
}
