"use client";

import { useId } from "react";
import { TBody, TableFrame, Td, Th, Tr } from "@/components/ui";
import { useWidth } from "@/components/brief/charts/useWidth";
import { PRESETS } from "@/lib/engine/presets";
import type { PlotPoint } from "@/lib/explore";

function niceStep(span: number): number {
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

function axis(min: number, max: number): { lo: number; hi: number; ticks: number[] } {
  const pad = Math.max((max - min) * 0.08, 1);
  const step = niceStep(max - min + 2 * pad);
  const lo = Math.max(0, Math.floor((min - pad) / step) * step);
  const hi = Math.ceil((max + pad) / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo, hi, ticks };
}

// Reference habitats drawn as crosshairs when they fall inside the plot.
const REFS = [PRESETS.iss, PRESETS.moon, PRESETS.artemis];
// Moon envelope, as on the brief's evidence chart: O2 at least the Moon preset's, pressure at most the Moon preset's.
const ENV = { o2: PRESETS.moon.o2Pct, p: PRESETS.moon.pressurePsia };

/**
 * O2 x pressure scatter of one investigation's eligible tests, in the brief
 * chart's visual language: hairline grid, mono ticks, the Moon envelope as a
 * dashed box, reference habitats as crosshairs. Filled dot: both conditions
 * measured; hollow: at least one inferred or assumed. A data table carries
 * the same points for screen readers and for checking.
 */
export function AtmospherePlot({ points, label }: { points: PlotPoint[]; label: string }) {
  const [wrap, width] = useWidth<HTMLDivElement>(640, 280, 820);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  if (points.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-6 text-sm text-fg-2">
        No test rows from this investigation count toward habitat coverage, so there is nothing to plot.
      </p>
    );
  }

  const narrow = width < 520;
  const H = Math.round(narrow ? width * 0.86 : width * 0.56);
  const M = { l: narrow ? 40 : 48, r: 12, t: 12, b: 42 };
  const fs = narrow ? 10.5 : 11.5;
  const xs = axis(Math.min(...points.map((p) => p.o2Pct)), Math.max(...points.map((p) => p.o2Pct)));
  const ys = axis(Math.min(...points.map((p) => p.pressurePsia)), Math.max(...points.map((p) => p.pressurePsia)));
  const x = (v: number) => M.l + ((v - xs.lo) / (xs.hi - xs.lo)) * (width - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - ys.lo) / (ys.hi - ys.lo)) * (H - M.t - M.b);
  const nTests = points.reduce((s, p) => s + p.count, 0);
  const inside = (o2: number, p: number) => o2 >= xs.lo && o2 <= xs.hi && p >= ys.lo && p <= ys.hi;
  const clip = `plot-${uid}`;
  const env = {
    x0: x(Math.max(ENV.o2, xs.lo)),
    x1: x(xs.hi),
    y0: y(Math.min(ENV.p, ys.hi)),
    y1: y(ys.lo),
  };
  const showEnv = ENV.o2 < xs.hi && ENV.p > ys.lo;

  return (
    <figure className="m-0 flex flex-col gap-4">
      <div ref={wrap} className="w-full">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width="100%"
          role="img"
          aria-label={`${label}: ${nTests} eligible tests at ${points.length} distinct oxygen and pressure combinations. A data table follows.`}
          className="block h-auto w-full overflow-visible"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <defs>
            <clipPath id={clip}>
              <rect x={M.l} y={M.t} width={width - M.l - M.r} height={H - M.t - M.b} />
            </clipPath>
          </defs>
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
                <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} stroke="var(--border)" strokeWidth={0.6} />
                <line x1={x(t)} x2={x(t)} y1={H - M.b} y2={H - M.b + 4} stroke="var(--border-strong)" strokeWidth={1} />
                <text x={x(t)} y={H - M.b + 17} textAnchor="middle" fontSize={fs} fill="var(--text-3)" style={{ fontFamily: "var(--font-mono)" }}>
                  {t}
                </text>
              </g>
            ))}
            <text x={(M.l + width - M.r) / 2} y={H - 4} textAnchor="middle" fontSize={fs} fill="var(--text-2)">
              Oxygen, O₂ (%)
            </text>
            <text transform={`translate(11 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs} fill="var(--text-2)">
              Pressure (psia)
            </text>
          </g>

          <g aria-hidden="true" clipPath={`url(#${clip})`}>
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
                  strokeWidth={1}
                  strokeDasharray="5 4"
                />
                <text x={env.x1 - 6} y={env.y1 - 7} textAnchor="end" fontSize={fs - 0.5} fill="var(--text-2)">
                  Moon envelope
                </text>
              </>
            )}
            {REFS.filter((r) => inside(r.o2Pct, r.pressurePsia)).map((r) => {
              const cx = x(r.o2Pct);
              const cy = y(r.pressurePsia);
              return (
                <g key={r.name}>
                  <path d={`M${cx - 6} ${cy}H${cx + 6}M${cx} ${cy - 6}V${cy + 6}`} stroke="var(--text-2)" strokeWidth={1.25} strokeLinecap="round" />
                  <text x={cx + 8} y={cy - 7} fontSize={fs - 1} fill="var(--text-2)" textAnchor={cx > width - 110 ? "end" : "start"} dx={cx > width - 110 ? -16 : 0}>
                    {r.name}
                  </text>
                </g>
              );
            })}
            {points.map((p) => {
              const r = 3.5 + Math.min(4.5, Math.log2(p.count) * 1.2);
              const cx = x(p.o2Pct);
              const cy = y(p.pressurePsia);
              return p.measured ? (
                <circle
                  key={`${p.o2Pct}|${p.pressurePsia}`}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="var(--accent)"
                  fillOpacity={0.85}
                  stroke="var(--surface-1)"
                  strokeWidth={1}
                  style={{ filter: "drop-shadow(0 0 4px var(--accent-glow))" }}
                />
              ) : (
                <circle key={`${p.o2Pct}|${p.pressurePsia}`} cx={cx} cy={cy} r={r} fill="var(--surface-1)" stroke="var(--accent)" strokeWidth={1.6} />
              );
            })}
          </g>
        </svg>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" fill="var(--accent)" fillOpacity="0.85" />
          </svg>
          O₂ and pressure measured
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true">
            <circle cx="6" cy="6" r="4.2" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
          </svg>
          At least one inferred or assumed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="12" aria-hidden="true">
            <path d="M7 1v10M2 6h10" stroke="var(--text-2)" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Reference habitat
        </span>
        <span>Dot size grows with the number of tests at a point.</span>
      </figcaption>
      <details className="group text-sm">
        <summary className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-xs)] font-medium text-accent">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className="transition-transform duration-[var(--dur-fast)] group-open:rotate-90">
            <path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Data table ({points.length} points)
        </summary>
        <TableFrame caption="Oxygen and pressure of each distinct test condition" maxHeight="18rem" className="mt-3">
          <thead className="glass-chrome sticky top-0 z-[1]">
            <tr>
              <Th numeric>O₂ (%)</Th>
              <Th numeric>Pressure (psia)</Th>
              <Th numeric>Tests</Th>
              <Th>Conditions</Th>
            </tr>
          </thead>
          <TBody>
            {points.map((p) => (
              <Tr key={`${p.o2Pct}|${p.pressurePsia}`}>
                <Td numeric className="py-2">{p.o2Pct}</Td>
                <Td numeric className="py-2">{p.pressurePsia}</Td>
                <Td numeric className="py-2">{p.count}</Td>
                <Td className="py-2">{p.measured ? "measured" : "inferred or assumed"}</Td>
              </Tr>
            ))}
          </TBody>
        </TableFrame>
      </details>
    </figure>
  );
}
