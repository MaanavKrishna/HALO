"use client";

import { useId } from "react";
import { useWidth } from "./useWidth";

export interface ExtinctionCurveProps {
  curve: Array<{ o2: number; p50: number; lo: number; hi: number }>;
  habitatO2: number;
  /** Median and band at the habitat, as fact values in percent. */
  here: { p50: number; lo: number; hi: number };
  fitO2Range: [number, number];
  description: string;
}

/**
 * Chance a droplet flame goes out on its own versus O2: median line with the
 * 95% bootstrap band; the fitted O2 range is shaded, the habitat is marked.
 */
export function ExtinctionCurve({ curve, habitatO2, here, fitO2Range, description }: ExtinctionCurveProps) {
  const [wrap, width] = useWidth<HTMLDivElement>(640, 280, 760);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const narrow = width < 480;
  const height = Math.round(narrow ? width * 0.78 : Math.max(240, width * 0.42));
  const m = { l: narrow ? 38 : 46, r: 12, t: 14, b: 40 };
  const x0 = curve[0]?.o2 ?? 10;
  const x1 = curve[curve.length - 1]?.o2 ?? 45;
  const sx = (o2: number) => m.l + ((o2 - x0) / (x1 - x0)) * (width - m.l - m.r);
  const sy = (p: number) => height - m.b - p * (height - m.t - m.b);
  const fs = narrow ? 10.5 : 11.5;

  const band =
    curve.map((c, i) => `${i ? "L" : "M"}${sx(c.o2).toFixed(1)} ${sy(c.hi).toFixed(1)}`).join("") +
    [...curve].reverse().map((c) => `L${sx(c.o2).toFixed(1)} ${sy(c.lo).toFixed(1)}`).join("") +
    "Z";
  const line = curve.map((c, i) => `${i ? "L" : "M"}${sx(c.o2).toFixed(1)} ${sy(c.p50).toFixed(1)}`).join("");
  const inRange = habitatO2 >= x0 && habitatO2 <= x1;
  const hx = sx(Math.min(x1, Math.max(x0, habitatO2)));
  const hy = sy(here.p50 / 100);
  const xTicks: number[] = [];
  for (let v = Math.ceil(x0 / 5) * 5; v <= x1; v += narrow ? 10 : 5) xTicks.push(v);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div ref={wrap} className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-labelledby={`${uid}-t ${uid}-d`} className="block h-auto w-full">
        <title id={`${uid}-t`}>Chance a droplet flame goes out on its own, by oxygen level</title>
        <desc id={`${uid}-d`}>{description}</desc>
        <g aria-hidden="true">
          <rect
            x={sx(Math.max(x0, fitO2Range[0]))}
            y={m.t}
            width={Math.max(0, sx(Math.min(x1, fitO2Range[1])) - sx(Math.max(x0, fitO2Range[0])))}
            height={height - m.t - m.b}
            fill="var(--flame-soft)"
            opacity={0.55}
          />
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={width - m.r} y1={sy(v)} y2={sy(v)} stroke="var(--rule)" strokeWidth={v === 0 ? 1 : 0.6} />
              <text x={m.l - 7} y={sy(v)} dy="0.32em" textAnchor="end" fontSize={fs} fill="var(--muted)" className="num">
                {`${v * 100}%`}
              </text>
            </g>
          ))}
          {xTicks.map((v) => (
            <text key={v} x={sx(v)} y={height - m.b + 16} textAnchor="middle" fontSize={fs} fill="var(--muted)" className="num">
              {v}
            </text>
          ))}
          <text x={(m.l + width - m.r) / 2} y={height - 6} textAnchor="middle" fontSize={fs} fill="var(--muted)">
            Oxygen, O₂ (%)
          </text>
          <text x={sx(Math.max(x0, fitO2Range[0])) + 5} y={m.t + 13} fontSize={fs - 1} fill="var(--flame)" fontWeight={600}>
            tested O₂ range
          </text>

          <path d={band} fill="var(--flame)" fillOpacity={0.14} />
          <path d={line} fill="none" stroke="var(--flame)" strokeWidth={2} strokeLinejoin="round" />

          <line x1={hx} x2={hx} y1={m.t} y2={height - m.b} stroke="var(--ink)" strokeWidth={1} strokeDasharray="3 3" />
          {inRange && (
            <>
              <line x1={hx} x2={hx} y1={sy(here.lo / 100)} y2={sy(here.hi / 100)} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={hx} cy={hy} r={4.5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
            </>
          )}
          <text
            x={hx + (hx > width - 120 ? -8 : 8)}
            y={m.t + 13}
            textAnchor={hx > width - 120 ? "end" : "start"}
            fontSize={fs}
            fontWeight={700}
            fill="var(--ink)"
            className="halo-label"
          >
            {inRange ? "Your habitat" : "Your habitat (off chart)"}
          </text>
        </g>
      </svg>
    </div>
  );
}
