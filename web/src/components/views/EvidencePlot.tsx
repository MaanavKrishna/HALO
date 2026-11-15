import type { ReactNode } from "react";
import { PRESETS } from "@/lib/engine/presets";

/**
 * Server-rendered O2 x pressure scatter in the Explore plot's visual language
 * (hairline grid, mono ticks, the Moon envelope as a dashed box, habitats as
 * crosshairs), for several series at once. It renders without JavaScript: a
 * wide SVG from sm up and a taller one with larger type on phones, so text
 * never shrinks below legibility. Shape carries the series, never colour alone.
 */

export type SeriesShape = "circle" | "square" | "triangle" | "diamond";
export type SeriesTone = "accent" | "ink";

export interface PlotSeriesPoint {
  o2Pct: number;
  pressurePsia: number;
  /** Tests merged into this point (sets the mark size). */
  count?: number;
  /** Hollow mark: at least one condition inferred or assumed. */
  hollow?: boolean;
}

export interface PlotSeries {
  key: string;
  label: string;
  shape: SeriesShape;
  tone: SeriesTone;
  /** Hollow marks for the whole series (overrides per-point hollow). */
  hollow?: boolean;
  points: PlotSeriesPoint[];
}

export interface PlotRef {
  label: string;
  o2Pct: number;
  pressurePsia: number;
  /** Emphasised crosshair (the reader's chosen atmosphere). */
  primary?: boolean;
}

export const SERIES_STYLES: Array<{ shape: SeriesShape; tone: SeriesTone; hollow: boolean }> = [
  { shape: "circle", tone: "accent", hollow: false },
  { shape: "square", tone: "ink", hollow: false },
  { shape: "triangle", tone: "accent", hollow: true },
  { shape: "diamond", tone: "ink", hollow: true },
];

const ENV = { o2: PRESETS.moon.o2Pct, p: PRESETS.moon.pressurePsia };

function niceStep(span: number): number {
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

export function plotAxis(min: number, max: number): { lo: number; hi: number; ticks: number[] } {
  const pad = Math.max((max - min) * 0.08, 1);
  const step = niceStep(max - min + 2 * pad);
  const lo = Math.max(0, Math.floor((min - pad) / step) * step);
  const hi = Math.ceil((max + pad) / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo, hi, ticks };
}

function color(tone: SeriesTone) {
  return tone === "accent" ? "var(--accent)" : "var(--text-1)";
}

export function Mark({
  shape,
  tone,
  cx,
  cy,
  r,
  hollow,
}: {
  shape: SeriesShape;
  tone: SeriesTone;
  cx: number;
  cy: number;
  r: number;
  hollow?: boolean;
}) {
  const c = color(tone);
  const paint = hollow
    ? { fill: "var(--surface-1)", stroke: c, strokeWidth: 1.6 }
    : { fill: c, fillOpacity: 0.85, stroke: "var(--surface-1)", strokeWidth: 1 };
  switch (shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={r} {...paint} />;
    case "square": {
      const s = r * 1.7;
      return <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={1} {...paint} />;
    }
    case "triangle": {
      const h = r * 1.25;
      return <path d={`M${cx} ${cy - h}L${cx + h} ${cy + h * 0.8}H${cx - h}Z`} strokeLinejoin="round" {...paint} />;
    }
    case "diamond": {
      const h = r * 1.3;
      return <path d={`M${cx} ${cy - h}L${cx + h} ${cy}L${cx} ${cy + h}L${cx - h} ${cy}Z`} strokeLinejoin="round" {...paint} />;
    }
  }
}

/** A 12px legend swatch for a series. */
export function SeriesSwatch({ shape, tone, hollow }: { shape: SeriesShape; tone: SeriesTone; hollow?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <Mark shape={shape} tone={tone} cx={7} cy={7.5} r={4.4} hollow={hollow} />
    </svg>
  );
}

function radius(count = 1) {
  return 3.6 + Math.min(4.2, Math.log2(Math.max(1, count)) * 1.1);
}

function Chart({
  series,
  refs,
  width,
  height,
  fs,
  label,
  className,
  envelope,
}: {
  series: PlotSeries[];
  refs: PlotRef[];
  width: number;
  height: number;
  fs: number;
  label: string;
  className: string;
  envelope: boolean;
}) {
  const all = series.flatMap((s) => s.points);
  const o2s = [...all.map((p) => p.o2Pct), ...refs.map((r) => r.o2Pct), ...(envelope ? [ENV.o2] : [])];
  const ps = [...all.map((p) => p.pressurePsia), ...refs.map((r) => r.pressurePsia), ...(envelope ? [ENV.p] : [])];
  const xs = plotAxis(Math.min(...o2s), Math.max(...o2s));
  const ys = plotAxis(Math.min(...ps), Math.max(...ps));
  const M = { l: fs * 4, r: 14, t: 14, b: fs * 3.8 };
  const x = (v: number) => M.l + ((v - xs.lo) / (xs.hi - xs.lo)) * (width - M.l - M.r);
  const y = (v: number) => height - M.b - ((v - ys.lo) / (ys.hi - ys.lo)) * (height - M.t - M.b);
  const showEnv = envelope && ENV.o2 < xs.hi && ENV.p > ys.lo;
  const env = { x0: x(Math.max(ENV.o2, xs.lo)), x1: x(xs.hi), y0: y(Math.min(ENV.p, ys.hi)), y1: y(ys.lo) };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label} className={className} style={{ fontFamily: "var(--font-sans)" }}>
      <g aria-hidden="true">
        {ys.ticks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={t === ys.lo ? 1 : 0.6} />
            <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={fs} fill="var(--text-3)" style={{ fontFamily: "var(--font-mono)" }}>
              {t}
            </text>
          </g>
        ))}
        {xs.ticks.map((t) => (
          <g key={`x${t}`}>
            <line x1={x(t)} x2={x(t)} y1={M.t} y2={height - M.b} stroke="var(--border)" strokeWidth={0.6} />
            <line x1={x(t)} x2={x(t)} y1={height - M.b} y2={height - M.b + 4} stroke="var(--border-strong)" strokeWidth={1} />
            <text x={x(t)} y={height - M.b + fs * 1.6} textAnchor="middle" fontSize={fs} fill="var(--text-3)" style={{ fontFamily: "var(--font-mono)" }}>
              {t}
            </text>
          </g>
        ))}
        <text x={(M.l + width - M.r) / 2} y={height - fs * 0.5} textAnchor="middle" fontSize={fs} fill="var(--text-2)">
          Oxygen, O₂ (%)
        </text>
        <text transform={`translate(${fs * 1.05} ${(M.t + height - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs} fill="var(--text-2)">
          Pressure (psia)
        </text>
        {showEnv && (
          <>
            <rect
              x={env.x0}
              y={env.y0}
              width={Math.max(0, env.x1 - env.x0)}
              height={Math.max(0, env.y1 - env.y0)}
              fill="var(--accent-soft)"
              fillOpacity={0.5}
              stroke="var(--text-2)"
              strokeOpacity={0.6}
              strokeDasharray="5 4"
            />
            <text
              x={env.x1 - 7}
              y={env.y1 - 7}
              textAnchor="end"
              fontSize={fs - 0.5}
              fontWeight={500}
              fill="var(--text-2)"
              stroke="var(--surface-1)"
              strokeWidth={3}
              paintOrder="stroke"
            >
              Moon envelope
            </text>
          </>
        )}
        {/* First series on top: later series are drawn first. */}
        {[...series].reverse().map((s) =>
          s.points.map((p, i) => (
            <Mark
              key={`${s.key}-${i}`}
              shape={s.shape}
              tone={s.tone}
              cx={x(p.o2Pct)}
              cy={y(p.pressurePsia)}
              r={radius(p.count) * (fs / 11.5)}
              hollow={s.hollow ?? p.hollow}
            />
          )),
        )}
        {refs.map((r) => {
          const cx = x(r.o2Pct);
          const cy = y(r.pressurePsia);
          const arm = r.primary ? 9 : 6;
          const right = cx < width * 0.72;
          return (
            <g key={r.label}>
              {r.primary && <circle cx={cx} cy={cy} r={arm + 3} fill="none" stroke="var(--accent)" strokeWidth={1.25} />}
              <path
                d={`M${cx - arm} ${cy}H${cx + arm}M${cx} ${cy - arm}V${cy + arm}`}
                stroke={r.primary ? "var(--accent)" : "var(--text-2)"}
                strokeWidth={r.primary ? 1.75 : 1.25}
                strokeLinecap="round"
              />
              <text
                x={cx + (right ? arm + 6 : -arm - 6)}
                y={cy - arm - 2}
                textAnchor={right ? "start" : "end"}
                fontSize={fs - 1}
                fontWeight={r.primary ? 600 : 500}
                fill={r.primary ? "var(--accent)" : "var(--text-2)"}
                stroke="var(--surface-1)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {r.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function EvidencePlot({
  series,
  refs = [],
  label,
  legend,
  envelope = true,
}: {
  series: PlotSeries[];
  refs?: PlotRef[];
  label: string;
  legend?: ReactNode;
  envelope?: boolean;
}) {
  const plotted = series.filter((s) => s.points.length > 0);
  if (plotted.length === 0 && refs.length === 0) return null;
  return (
    <figure className="m-0 flex flex-col gap-4">
      <Chart series={plotted} refs={refs} width={860} height={470} fs={12} label={label} envelope={envelope} className="hidden h-auto w-full overflow-visible sm:block" />
      <Chart series={plotted} refs={refs} width={320} height={360} fs={12} label={label} envelope={envelope} className="block h-auto w-full overflow-visible sm:hidden" />
      {legend && <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-3">{legend}</figcaption>}
    </figure>
  );
}
