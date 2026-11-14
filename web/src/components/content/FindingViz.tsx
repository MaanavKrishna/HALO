import type { ReactNode } from "react";
import { ProvenanceBadge } from "@/components/ui";
import type { FindingViz as Viz } from "./findings";

/**
 * Small vector figures for the finding cards. Each is an SVG with a fixed
 * viewBox (scales with the card), token colours only, and an accessible name
 * that states what it shows. Numbers come from the finding's data.
 */

/** Desktop and phone viewBox widths: the phone layout keeps 12-unit labels at >= 11px on a ~280px card. */
const WIDE = 420;
const NARROW = 300;
const LABEL = { fontSize: 12, fill: "var(--text-3)" } as const;
const mono = "font-mono tabular-nums";

const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
/** First word of a preset name on phones ("Moon Envelope" -> "Moon"); the full name stays in the figure's accessible name. */
const shortName = (label: string, compact: boolean) => (compact ? label.split(" ")[0] : label);
const f1 = (x: number) => String(Math.round(x * 10) / 10);

function Figure({ W, label, caption, children, height }: { W: number; label: string; caption: ReactNode; children: ReactNode; height: number }) {
  return (
    <figure className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full overflow-visible">
        {children}
      </svg>
      <figcaption className="type-caption text-fg-3">{caption}</figcaption>
    </figure>
  );
}

function O2Range({ v, W, compact }: { v: Extract<Viz, { kind: "o2-range" }>; W: number; compact: boolean }) {
  const [d0, d1] = v.domain;
  const x = lin(d0, d1, 12, W - 12);
  const ticks = [];
  for (let t = d0; t <= d1; t += 5) ticks.push(t);
  const [a, b] = v.tested;
  return (
    <Figure
      W={W}
      height={128}
      label={`Oxygen axis from ${d0} to ${d1} percent. Real solids were tested from ${f1(a)} to ${f1(b)} percent. Habitat presets: ${v.markers.map((m) => `${m.label} ${m.o2}%`).join(", ")}.`}
      caption="Band: O2 range of every eligible real-solid test. Markers: habitat presets."
    >
      <line x1={12} x2={W - 12} y1={84} y2={84} stroke="var(--border-strong)" strokeWidth={1} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={84} y2={90} stroke="var(--border-strong)" />
          <text x={x(t)} y={106} textAnchor="middle" className={mono} {...LABEL}>
            {t}%
          </text>
        </g>
      ))}
      <rect x={x(a)} y={66} width={Math.max(4, x(b) - x(a))} height={18} rx={3} fill="var(--ok-soft)" stroke="var(--ok)" strokeWidth={1.25} />
      <text x={x(a)} y={58} className={mono} {...LABEL} fill="var(--ok)">
        tested
      </text>
      {v.markers.map((m, i) => {
        const outside = m.o2 > b || m.o2 < a;
        // Presets are habitats, not risks: accent when outside the tested band, neutral inside.
        const tone = outside ? "var(--accent)" : "var(--text-2)";
        const y = 18 + (i % 2) * 18;
        return (
          <g key={m.label}>
            <line x1={x(m.o2)} x2={x(m.o2)} y1={y + 6} y2={84} stroke={tone} strokeWidth={1.25} strokeDasharray={outside ? "3 3" : undefined} />
            <circle cx={x(m.o2)} cy={84} r={3.5} fill={tone} />
            <text x={x(m.o2)} y={y} textAnchor="middle" fontSize={12} fill={tone}>
              {shortName(m.label, compact)}
            </text>
          </g>
        );
      })}
    </Figure>
  );
}

function Breakdown({ v }: { v: Extract<Viz, { kind: "breakdown" }> }) {
  return (
    <figure className="flex flex-col gap-3">
      <div role="list" aria-label={`${v.total} eligible test rows in the window, by fuel kind`} className="flex flex-col gap-4">
        {v.parts.map((p) => {
          const pct = v.total ? (p.count / v.total) * 100 : 0;
          const empty = p.count === 0;
          return (
            <div role="listitem" key={p.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className={empty ? "font-medium text-warn" : "text-fg-2"}>{p.label}</span>
                <span className={`${mono} ${empty ? "text-warn" : "text-fg"}`}>{p.count}</span>
              </div>
              <div className={`relative h-2.5 overflow-hidden rounded-[var(--radius-pill)] ${empty ? "border border-dashed border-[var(--warn-line)]" : "bg-surface-2"}`}>
                {!empty && <div className="absolute inset-y-0 left-0 rounded-[var(--radius-pill)] bg-accent" style={{ width: `${pct}%` }} />}
              </div>
              {!empty && <ProvenanceBadge provenance={p.provenance} className="self-start" />}
            </div>
          );
        })}
      </div>
      <figcaption className="type-caption text-fg-3">Eligible rows in the Moon window, by fuel kind. Bars share one scale.</figcaption>
    </figure>
  );
}

function Runs({ v, W, compact }: { v: Extract<Viz, { kind: "runs" }>; W: number; compact: boolean }) {
  const cols = compact ? 14 : 18;
  const gap = 22;
  let y = 0;
  const blocks = v.rows.map((r) => {
    const top = y;
    const rowsN = Math.ceil(r.runs / cols);
    y += 26 + rowsN * gap + 14;
    return { r, top, rowsN };
  });
  return (
    <Figure
      W={W}
      height={y}
      label={v.rows.map((r) => `${r.label}: ${r.low} of ${r.runs} runs read below HALO's ${v.threshold} volt scatter alarm proxy`).join(". ")}
      caption={
        <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-full border-[1.5px] border-warn" /> below the {v.threshold} V alarm proxy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-fg-3" /> reached it
          </span>
          <span>One dot per SAME run.</span>
        </span>
      }
    >
      {blocks.map(({ r, top }) => (
        <g key={r.label}>
          <text x={0} y={top + 12} fontSize={13} fill="var(--text-1)" fontWeight={600}>
            {r.label}
          </text>
          <text x={W} y={top + 12} textAnchor="end" className={mono} {...LABEL}>
            {r.low} of {r.runs} below
          </text>
          {Array.from({ length: r.runs }, (_, i) => {
            const low = i < r.low;
            const cx = 9 + (i % cols) * ((W - 18) / (cols - 1));
            const cy = top + 32 + Math.floor(i / cols) * gap;
            return low ? (
              <circle key={i} cx={cx} cy={cy} r={6} fill="var(--warn-soft)" stroke="var(--warn)" strokeWidth={1.5} />
            ) : (
              <circle key={i} cx={cx} cy={cy} r={6} fill="var(--text-3)" />
            );
          })}
        </g>
      ))}
    </Figure>
  );
}

function Curve({ v, W, compact }: { v: Extract<Viz, { kind: "curve" }>; W: number; compact: boolean }) {
  const H = 200;
  const o2s = v.points.map((p) => p.o2);
  const x0 = Math.min(...o2s);
  const x1 = Math.max(...o2s);
  const x = lin(x0, x1, 34, W - 6);
  const y = lin(0, 1, H - 30, 10);
  const band =
    v.points.map((p, i) => `${i ? "L" : "M"}${x(p.o2).toFixed(1)},${y(p.hi).toFixed(1)}`).join("") +
    [...v.points].reverse().map((p) => `L${x(p.o2).toFixed(1)},${y(p.lo).toFixed(1)}`).join("") +
    "Z";
  const line = v.points.map((p, i) => `${i ? "L" : "M"}${x(p.o2).toFixed(1)},${y(p.p50).toFixed(1)}`).join("");
  const ticks = [];
  for (let t = Math.ceil(x0 / 5) * 5; t <= x1; t += 5) ticks.push(t);
  const m = v.marker;
  const inRange = m.o2 >= x0 && m.o2 <= x1;
  return (
    <Figure
      W={W}
      height={H}
      label={`Chance that a droplet flame goes out on its own, falling with oxygen. Even odds at ${f1(v.at50.median)} percent O2, interval ${f1(v.at50.lo)} to ${f1(v.at50.hi)}.`}
      caption="Median of 200 bootstrap fits (line) and 95% band, 1 atm. Shaded column: interval of the 50% point."
    >
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line x1={34} x2={W - 6} y1={y(p)} y2={y(p)} stroke="var(--border)" />
          <text x={28} y={y(p) + 4} textAnchor="end" className={mono} {...LABEL}>
            {p * 100}%
          </text>
        </g>
      ))}
      <rect x={x(v.at50.lo)} y={y(1)} width={x(v.at50.hi) - x(v.at50.lo)} height={y(0) - y(1)} fill="var(--surface-2)" />
      <path d={band} fill="var(--accent-soft)" stroke="var(--accent-line)" strokeWidth={0.75} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      <line x1={x(v.at50.median)} x2={x(v.at50.median)} y1={y(1)} y2={y(0)} stroke="var(--accent)" strokeDasharray="3 3" />
      <circle cx={x(v.at50.median)} cy={y(0.5)} r={4} fill="var(--accent)" stroke="var(--surface-1)" strokeWidth={1.5} />
      {inRange && (
        <g>
          <line x1={x(m.o2)} x2={x(m.o2)} y1={y(1)} y2={y(0)} stroke="var(--text-2)" strokeWidth={1.25} strokeDasharray="4 3" />
          <text x={x(m.o2) - 5} y={y(1) + 12} textAnchor="end" fontSize={12} fill="var(--text-1)">
            {m.label}
          </text>
        </g>
      )}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 10} textAnchor="middle" className={mono} {...LABEL}>
          {t}%
        </text>
      ))}
    </Figure>
  );
}

function Spread({ v, W, compact }: { v: Extract<Viz, { kind: "spread" }>; W: number; compact: boolean }) {
  const H = 210;
  const o2s = v.rows.map((r) => r.o2);
  const rates = v.rows.map((r) => r.rate);
  const x0 = Math.floor(Math.min(...o2s) - 1);
  const x1 = Math.ceil(Math.max(...o2s) + 1);
  const yMax = Math.ceil(Math.max(...rates) + 0.5);
  const x = lin(x0, x1, 34, W - 10);
  const y = lin(0, yMax, H - 30, 12);
  const yt = Array.from({ length: yMax + 1 }, (_, i) => i).filter((t) => t % (yMax > 6 ? 2 : 1) === 0);
  const xt = [];
  for (let t = Math.ceil(x0 / 2) * 2; t <= x1; t += 2) xt.push(t);
  return (
    <Figure
      W={W}
      height={H}
      label={`Saffire flame spread rate against oxygen: ${v.rows.map((r) => `${r.mission} ${r.id} ${r.rate} millimetres per second at ${f1(r.o2)} percent`).join("; ")}.`}
      caption="Spread rate (mm/s) against O2, one square per Saffire sample. Literature values from NASA reports."
    >
      {yt.map((t) => (
        <g key={t}>
          <line x1={34} x2={W - 10} y1={y(t)} y2={y(t)} stroke="var(--border)" />
          <text x={28} y={y(t) + 4} textAnchor="end" className={mono} {...LABEL}>
            {t}
          </text>
        </g>
      ))}
      {xt.map((t) => (
        <text key={t} x={x(t)} y={H - 10} textAnchor="middle" className={mono} {...LABEL}>
          {t}%
        </text>
      ))}
      {v.rows.map((r) => (
        <g key={r.id}>
          <rect
            x={x(r.o2) - 5}
            y={y(r.rate) - 5}
            width={10}
            height={10}
            rx={1.5}
            fill={r.elevated ? "var(--accent)" : "var(--surface-1)"}
            stroke={r.elevated ? "var(--accent)" : "var(--text-2)"}
            strokeWidth={1.5}
          />
          <text
            x={x(r.o2) > W - 44 ? x(r.o2) - 9 : x(r.o2) + 9}
            y={y(r.rate) + 4}
            textAnchor={x(r.o2) > W - 44 ? "end" : "start"}
            fontSize={11.5}
            className="font-mono"
            fill={r.elevated ? "var(--accent)" : "var(--text-3)"}
          >
            {r.id}
          </text>
        </g>
      ))}
    </Figure>
  );
}

function Gravity({ v, W, compact }: { v: Extract<Viz, { kind: "gravity" }>; W: number; compact: boolean }) {
  const stops = [
    { label: "Microgravity", at: 16, tested: true },
    { label: "Moon", at: Math.round(W * (compact ? 0.44 : 0.36)), tested: false },
    { label: "Mars", at: Math.round(W * (compact ? 0.7 : 0.64)), tested: false },
    { label: "Earth", at: W - 16, tested: true },
  ];
  return (
    <Figure
      W={W}
      height={96}
      label={`Gravity scale from microgravity to Earth. Tested: microgravity and ground. Untested: Moon and Mars. ${v.tested} of ${v.total} investigations ran at partial gravity.`}
      caption="PSI fire data sits at the two ends of this scale. Positions are schematic."
    >
      <defs>
        <pattern id={`gravity-hatch-${W}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--warn)" strokeOpacity="0.55" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect x={16} y={40} width={W - 32} height={10} rx={5} fill={`url(#gravity-hatch-${W})`} stroke="var(--warn-line)" />
      {stops.map((s) => (
        <g key={s.label}>
          <circle cx={s.at} cy={45} r={s.tested ? 8 : 6} fill={s.tested ? "var(--accent)" : "var(--surface-1)"} stroke={s.tested ? "var(--accent)" : "var(--warn)"} strokeWidth={1.5} />
          <text x={s.at} y={24} textAnchor={s.at < 40 ? "start" : s.at > W - 40 ? "end" : "middle"} fontSize={12.5} fill={s.tested ? "var(--text-1)" : "var(--warn)"}>
            {s.label}
          </text>
          <text x={s.at} y={76} textAnchor={s.at < 40 ? "start" : s.at > W - 40 ? "end" : "middle"} className="font-mono" fontSize={11} fill="var(--text-3)">
            {s.tested ? "tested" : "untested"}
          </text>
        </g>
      ))}
    </Figure>
  );
}

function Distance({ v, W, compact }: { v: Extract<Viz, { kind: "distance" }>; W: number; compact: boolean }) {
  const rowH = 30;
  const top = 26;
  const H = top + v.rows.length * rowH + 22;
  const max = Math.ceil(Math.max(...v.rows.map((r) => r.d)));
  const x = lin(0, max, compact ? 88 : 96, W - (compact ? 40 : 30));
  const sorted = [...v.rows].sort((a, b) => a.d - b.d);
  return (
    <Figure
      W={W}
      height={H}
      label={`Evidence distance from the EVA suit to the nearest test of each fuel kind: ${sorted.map((r) => `${r.label} ${r.d.toFixed(2)}`).join(", ")}. Grade rings at ${v.rings.join(", ")}.`}
      caption="Bars: evidence distance to the nearest test of each fuel kind. Lines: the A/B, C and D grade rings."
    >
      {v.rings.map((r) => (
        <g key={r}>
          <line x1={x(r)} x2={x(r)} y1={top - 8} y2={H - 22} stroke="var(--accent-line)" strokeDasharray="2 3" />
          {r === v.rings[v.rings.length - 1] && (
            <text x={x(r) + 4} y={top - 12} className={mono} {...LABEL} fontSize={10.5}>
              D ring · {r}
            </text>
          )}
        </g>
      ))}
      {sorted.map((r, i) => {
        const yy = top + i * rowH;
        return (
          <g key={r.label}>
            <text x={0} y={yy + 14} fontSize={12} fill="var(--text-2)">
              {r.label}
            </text>
            <rect x={x(0)} y={yy + 4} width={x(r.d) - x(0)} height={12} rx={6} fill="var(--warn-soft)" stroke="var(--warn-line)" />
            <text x={x(r.d) + 6} y={yy + 14} className={mono} fontSize={11.5} fill="var(--warn)">
              {r.d.toFixed(2)}
            </text>
          </g>
        );
      })}
      <text x={x(0)} y={H - 4} className={mono} {...LABEL} fontSize={10.5}>
        0
      </text>
    </Figure>
  );
}

function Next({ v, W, compact }: { v: Extract<Viz, { kind: "next" }>; W: number; compact: boolean }) {
  const H = 230;
  const x = lin(0, 42, 34, W - 8);
  const y = lin(0, 16, H - 28, 10);
  // The B-ring around the pick: d = 0.5 is 5 O2 points or 1.5 psia.
  const rx = x(5) - x(0);
  const ry = y(0) - y(1.5);
  return (
    <Figure
      W={W}
      height={H}
      label={`Map of eligible test atmospheres, oxygen against pressure, with the suggested test at ${v.pick.o2} percent and ${v.pick.p} psia among the habitat presets ${v.presets.map((p) => p.label).join(", ")}.`}
      caption="Dots: eligible PSI test atmospheres. Blue ring: the suggested test and its 0.5 evidence-distance ring."
    >
      {[0, 4, 8, 12, 16].map((t) => (
        <g key={t}>
          <line x1={34} x2={W - 8} y1={y(t)} y2={y(t)} stroke="var(--border)" />
          <text x={28} y={y(t) + 4} textAnchor="end" className={mono} {...LABEL} fontSize={11}>
            {t}
          </text>
        </g>
      ))}
      {[0, 10, 20, 30, 40].map((t) => (
        <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className={mono} {...LABEL} fontSize={11}>
          {t}%
        </text>
      ))}
      <text x={34} y={6} className={mono} {...LABEL} fontSize={10.5}>
        psia
      </text>
      {v.tests.map((t) => (
        <circle key={`${t.o2}-${t.p}`} cx={x(t.o2)} cy={y(t.p)} r={2.2} fill="var(--text-3)" opacity={0.6} />
      ))}
      <ellipse cx={x(v.pick.o2)} cy={y(v.pick.p)} rx={rx} ry={ry} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.25} />
      {v.presets.map((p) => {
        // Presets inside the pick's ring label to the left, clear of the ring.
        const near = Math.abs(p.o2 - v.pick.o2) < 5 && Math.abs(p.p - v.pick.p) < 1.5;
        // Near the right edge, label below and to the left so it stays inside the card.
        const edge = x(p.o2) > W - 110;
        return (
        <g key={p.label}>
          <circle cx={x(p.o2)} cy={y(p.p)} r={4} fill="none" stroke="var(--text-1)" strokeWidth={1.5} />
          <text
            x={near ? x(v.pick.o2) : edge ? x(p.o2) + 4 : x(p.o2) + 7}
            y={near ? y(v.pick.p) - ry - 6 : edge ? y(p.p) + 18 : y(p.p) - 6}
            textAnchor={near ? "middle" : edge ? "end" : "start"} fontSize={11.5} fill="var(--text-1)">
            {shortName(p.label, compact)}
          </text>
        </g>
        );
      })}
      <circle cx={x(v.pick.o2)} cy={y(v.pick.p)} r={5.5} fill="var(--accent)" style={{ filter: "drop-shadow(0 0 6px var(--accent-glow))" }} />
    </Figure>
  );
}

type FigProps = { W: number; compact: boolean };

function Svg({ viz, ...p }: { viz: Viz } & FigProps) {
  switch (viz.kind) {
    case "o2-range":
      return <O2Range v={viz} {...p} />;
    case "runs":
      return <Runs v={viz} {...p} />;
    case "curve":
      return <Curve v={viz} {...p} />;
    case "spread":
      return <Spread v={viz} {...p} />;
    case "gravity":
      return <Gravity v={viz} {...p} />;
    case "distance":
      return <Distance v={viz} {...p} />;
    case "next":
      return <Next v={viz} {...p} />;
    default:
      return null;
  }
}

/** Two layouts of the same figure: wide from 640px, narrow (larger relative type, short labels) on phones. The hidden one is display:none, so assistive tech reads one. */
export function FindingViz({ viz }: { viz: Viz }) {
  if (viz.kind === "breakdown") return <Breakdown v={viz} />;
  return (
    <>
      <div className="hidden sm:block">
        <Svg viz={viz} W={WIDE} compact={false} />
      </div>
      <div className="viz-compact sm:hidden">
        <Svg viz={viz} W={NARROW} compact />
      </div>
    </>
  );
}
