"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { SliderField } from "@/components/ui/SliderField";
import { COVERAGE_CLASSES, COVERAGE_LABEL, VIEW, chartScale, probeReadout, probeTests, type ProbePoints } from "@/lib/coverage";
import type { FuelClass, Grade } from "@/lib/engine/types";

/**
 * "Place your habitat": two sliders move a crosshair over the coverage map and
 * a live readout grades that atmosphere on the chosen fuel class, client side,
 * with the engine's own nearest-test and ring functions. The fuel class is the
 * map's radio toggle (read from the DOM, so the toggle keeps working without
 * JavaScript). Before hydration the sliders, crosshair and readout stay hidden
 * and the preset chips are inert, so the static map reads the same.
 */

export interface ProbePreset {
  key: string;
  name: string;
  o2: number;
  p: number;
  href: string;
  grades: Record<FuelClass, Grade>;
}

type Size = { width: number; height: number; fs: number; compact: boolean };

const fmt = (x: number, dp = 1) => String(Number(x.toFixed(dp)));
const signed = (x: number, dp = 1) => (x > 0 ? `+${fmt(x, dp)}` : fmt(x, dp));
const snap = (v: number, step: number) => Math.round(v / step) * step;

function Crosshair({ size, o2, p, show }: { size: Size; o2: number; p: number; show: boolean }) {
  const s = chartScale(size.width, size.height, size.fs, size.compact);
  const cx = s.x(o2);
  const cy = s.y(p);
  const flip = cx > s.plot.x + s.plot.w * 0.62;
  const below = cy < s.plot.y + 28;
  return (
    <svg viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true" className="covprobe-overlay pointer-events-none absolute inset-0 h-full w-full overflow-visible" style={show ? undefined : { display: "none" }}>
      <line x1={s.plot.x} x2={cx} y1={cy} y2={cy} stroke="var(--accent)" strokeWidth={1.2} strokeDasharray="3 3" />
      <line x1={cx} x2={cx} y1={cy} y2={s.plot.y + s.plot.h} stroke="var(--accent)" strokeWidth={1.2} strokeDasharray="3 3" />
      <g className="covprobe-mark" style={{ transform: `translate(${cx}px, ${cy}px)` }}>
        <circle r={11} fill="color-mix(in oklab, var(--accent) 18%, transparent)" stroke="var(--accent)" strokeWidth={2} />
        <path d="M-17 0H-6M6 0H17M0 -17V-6M0 6V17" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" />
        <circle r={2.2} fill="var(--accent)" />
        <text
          x={flip ? -20 : 20}
          y={below ? 26 : -14}
          textAnchor={flip ? "end" : "start"}
          fontSize={size.fs}
          fontWeight={700}
          fill="var(--accent)"
          stroke="var(--surface-1)"
          strokeWidth={3.5}
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Your habitat
        </text>
      </g>
    </svg>
  );
}

export function CoverageProbe({
  id,
  data,
  presets,
  initial,
  wide,
  phone,
  wideSize,
  phoneSize,
  wideClassName,
  legend,
  captions,
}: {
  id: string;
  data: ProbePoints;
  presets: ProbePreset[];
  initial: string;
  wide: ReactNode;
  phone: ReactNode;
  wideSize: Size;
  phoneSize: Size;
  wideClassName?: string;
  legend: ReactNode;
  captions: ReactNode;
}) {
  const start = presets.find((p) => p.key === initial) ?? presets[0];
  const [ready, setReady] = useState(false);
  const [o2, setO2] = useState(start.o2);
  const [p, setP] = useState(start.p);
  const [fuelClass, setFuelClass] = useState<FuelClass>("solid");
  const tests = useMemo(() => probeTests(data), [data]);

  useEffect(() => {
    const name = `${id}-class`;
    const read = () => {
      const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
      if (el && (COVERAGE_CLASSES as string[]).includes(el.value)) setFuelClass(el.value as FuelClass);
    };
    read();
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (t?.name === name) read();
    };
    document.addEventListener("change", onChange);
    setReady(true);
    return () => document.removeEventListener("change", onChange);
  }, [id]);

  const r = probeReadout(o2, p, fuelClass, tests);
  const n = r.nearest;
  const L = COVERAGE_LABEL[fuelClass];
  const preset = presets.find((x) => x.o2 === o2 && x.p === p);
  const href = preset ? preset.href : `/brief?${new URLSearchParams({ o2: fmt(o2), p: fmt(p) }).toString()}`;
  const inView = (x: ProbePreset) => x.o2 >= VIEW.o2[0] && x.o2 <= VIEW.o2[1];

  return (
    <div className="covmap-body" data-probe-ready={ready ? "" : undefined}>
      <div className="covmap-main flex min-w-0 flex-col gap-5">
        <div
          role="img"
          aria-label={`Evidence coverage map. Oxygen from ${VIEW.o2[0]} to ${VIEW.o2[1]}% across, total pressure from ${VIEW.p[0]} to ${VIEW.p[1]} psia up. Each zone is shaded and lettered with the evidence grade from the chosen fuel class's PSI tests. The Moon window and the five habitat presets are marked. A text summary follows.`}
          className={wideClassName}
        >
          <div className="relative hidden sm:block">
            {wide}
            <Crosshair size={wideSize} o2={o2} p={p} show={ready} />
          </div>
          <div className="relative block sm:hidden">
            {phone}
            <Crosshair size={phoneSize} o2={o2} p={p} show={ready} />
          </div>
        </div>

        {legend}

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2" hidden={!ready}>
          <SliderField
            label="Your habitat: oxygen"
            unit="% O₂"
            min={VIEW.o2[0]}
            max={VIEW.o2[1]}
            step={0.5}
            value={o2}
            format={(v) => fmt(v)}
            onChange={(e) => setO2(snap(Number(e.currentTarget.value), 0.5))}
            data-probe="o2"
          />
          <SliderField
            label="Your habitat: total pressure"
            unit="psia"
            min={VIEW.p[0]}
            max={VIEW.p[1]}
            step={0.1}
            value={p}
            format={(v) => fmt(v)}
            onChange={(e) => setP(Number(snap(Number(e.currentTarget.value), 0.1).toFixed(1)))}
            data-probe="p"
          />
        </div>
      </div>

      <div className="covmap-side flex min-w-0 flex-col gap-5">
        {COVERAGE_CLASSES.map((c) => {
          const label = c === "solid" ? "Real-solid tests alone (a full brief can read one letter higher)" : `${COVERAGE_LABEL[c].alone[0].toUpperCase()}${COVERAGE_LABEL[c].alone.slice(1)}`;
          return (
            <div key={c} data-cov={c} className="flex flex-col gap-2">
              <p className="type-label text-fg-3">{label}</p>
              <ul className="flex flex-wrap gap-2" aria-label={`Preset grades from ${COVERAGE_LABEL[c].alone}`}>
                {presets.map((x) => {
                  const on = ready && x.o2 === o2 && x.p === p;
                  return (
                    <li key={x.key}>
                      <button
                        type="button"
                        disabled={!ready || !inView(x)}
                        title={inView(x) ? undefined : "Outside the mapped window"}
                        aria-pressed={ready ? on : undefined}
                        onClick={() => {
                          setO2(x.o2);
                          setP(x.p);
                        }}
                        className="covprobe-chip flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface-1 py-1 pl-1 pr-3 text-[0.8125rem] text-fg"
                      >
                        <GradeBadge grade={x.grades[c]} size="sm" />
                        {x.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <div className="covprobe-readout flex flex-col gap-3 rounded-[var(--radius-lg,14px)] border border-line bg-surface-1 p-4" hidden={!ready}>
          <div aria-live="polite" aria-atomic="true" data-probe-readout className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <GradeBadge grade={r.grade} size="md" />
              <div className="flex flex-col">
                <span className="type-label text-fg-3">Your habitat · {fmt(o2)}% O₂ · {fmt(p)} psia</span>
                <span className="text-sm text-fg">
                  Grade <strong data-probe-grade>{r.grade}</strong> from {L.alone}
                </span>
              </div>
            </div>
            {n.test && n.d !== null && n.o2Gap !== null && n.pGap !== null ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.8125rem]">
                <dt className="text-fg-3">Nearest test</dt>
                <dd className="text-fg">
                  {n.test.acronym} at {fmt(n.test.o2Pct)}% O₂, {fmt(n.test.pressurePsia)} psia
                </dd>
                <dt className="text-fg-3">Gap</dt>
                <dd className="font-mono tabular-nums text-fg">
                  {signed(n.o2Gap)} O₂ pts, {signed(n.pGap)} psia
                </dd>
                <dt className="text-fg-3">Evidence distance</dt>
                <dd className="font-mono tabular-nums text-fg">{n.d.toFixed(2)}</dd>
              </dl>
            ) : (
              <p className="text-[0.8125rem] text-fg-2">PSI holds no {L.long} tests.</p>
            )}
          </div>
          <p className="flex flex-col gap-1 text-[0.8125rem]">
            <a href={href} className="font-medium text-accent underline-offset-4 hover:underline">
              Open the full brief for this atmosphere →
            </a>
            <span className="text-fg-3">A brief starts from the real-solid grade and can rise one step on a close surrogate test, so it can read one letter higher.</span>
          </p>
        </div>

        {captions}
      </div>
    </div>
  );
}
