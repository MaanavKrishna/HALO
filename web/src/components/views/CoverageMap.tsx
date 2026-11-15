import "server-only";
import Link from "next/link";
import { GradeBadge } from "@/components/ui";
import { COVERAGE_CLASSES, COVERAGE_LABEL, MOON_WINDOW, VIEW, coverageMap, type ClassCoverage } from "@/lib/coverage";
import { HALO_DATA } from "@/lib/data/load";
import { PSI_SEARCH_URL } from "@/lib/engine/brief";
import { GRADE_RINGS, SURROGATE_CAP } from "@/lib/engine/grade";
import { PRESETS } from "@/lib/engine/presets";
import type { FuelClass, Grade } from "@/lib/engine/types";
import "./coverage-map.css";

/**
 * Evidence coverage map: the O2 x pressure plane shaded by the class grade a
 * habitat there would get from one fuel class's PSI tests alone. Server
 * rendered SVG: the ring unions are defined once in data space and reused by
 * a wide chart (sm and up) and a tall phone chart. The fuel-class toggle is
 * plain radio buttons; CSS (:has) shows the chosen class, so it works
 * without JavaScript.
 */

const MAP = coverageMap(HALO_DATA);
const BY_CLASS = Object.fromEntries(MAP.map((c) => [c.fuelClass, c])) as Record<FuelClass, ClassCoverage>;

const FILL = {
  F: "color-mix(in oklab, var(--warn) 17%, var(--surface-1))",
  D: "color-mix(in oklab, var(--warn) 7%, var(--surface-1))",
  C: "var(--surface-2)",
  B: "color-mix(in oklab, var(--accent) 20%, var(--surface-1))",
};
const EDGE = { D: "var(--warn-line)", C: "var(--border-strong)", B: "var(--accent-line)" };
const INK: Record<Grade, string> = { A: "var(--accent)", B: "var(--accent)", C: "var(--text-2)", D: "var(--warn)", F: "var(--warn)" };

const fmt = (x: number) => String(Number(x.toFixed(1)));
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Preset markers: Moon Envelope and the Pressurized Rover share an atmosphere, so they share a marker. */
function presetMarks() {
  const m = PRESETS.moon;
  const r = PRESETS.rover;
  const same = m.o2Pct === r.o2Pct && m.pressurePsia === r.pressurePsia;
  return [
    { key: "iss", long: PRESETS.iss.name, short: PRESETS.iss.name, o2: PRESETS.iss.o2Pct, p: PRESETS.iss.pressurePsia, pos: "ne" as const },
    { key: "moon", long: same ? `${m.name} · Rover` : m.name, short: same ? "Moon · Rover" : "Moon", o2: m.o2Pct, p: m.pressurePsia, pos: "ne" as const },
    ...(same ? [] : [{ key: "rover", long: r.name, short: "Rover", o2: r.o2Pct, p: r.pressurePsia, pos: "ne" as const }]),
    { key: "artemis", long: PRESETS.artemis.name, short: "Artemis", o2: PRESETS.artemis.o2Pct, p: PRESETS.artemis.pressurePsia, pos: "se" as const },
    { key: "suit", long: `${PRESETS.suit.name}, ${PRESETS.suit.o2Pct}% O₂`, short: `Suit ${PRESETS.suit.o2Pct}%`, o2: PRESETS.suit.o2Pct, p: PRESETS.suit.pressurePsia, pos: "w" as const },
  ];
}

const X_TICKS = [10, 15, 20, 25, 30, 35, 40, 45];
const Y_TICKS = [2, 4, 6, 8, 10, 12, 14, 16];

function Defs({ uid }: { uid: string }) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        <pattern id={`${uid}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--warn)" strokeOpacity="0.22" strokeWidth="1.4" />
        </pattern>
        {MAP.map((c) => (
          <g key={c.fuelClass}>
            <path id={`${uid}-${c.fuelClass}-d`} d={c.rings.d} vectorEffect="non-scaling-stroke" />
            <path id={`${uid}-${c.fuelClass}-c`} d={c.rings.c} vectorEffect="non-scaling-stroke" />
            <path id={`${uid}-${c.fuelClass}-b`} d={c.rings.b} vectorEffect="non-scaling-stroke" />
            <path id={`${uid}-${c.fuelClass}-dots`} d={c.dots} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </defs>
    </svg>
  );
}

function Chart({ uid, width, height, fs, compact, className }: { uid: string; width: number; height: number; fs: number; compact: boolean; className: string }) {
  const M = { l: fs * 3.6, r: compact ? 10 : 16, t: 12, b: fs * 3.6 };
  const kx = (width - M.l - M.r) / (VIEW.o2[1] - VIEW.o2[0]);
  const ky = (height - M.t - M.b) / (VIEW.p[1] - VIEW.p[0]);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  const x = (v: number) => r1(M.l + (v - VIEW.o2[0]) * kx);
  const y = (v: number) => r1(height - M.b - (v - VIEW.p[0]) * ky);
  const matrix = `matrix(${r4(kx)} 0 0 ${r4(-ky)} ${r4(M.l - VIEW.o2[0] * kx)} ${r4(height - M.b + VIEW.p[0] * ky)})`;
  const plot = { x: M.l, y: M.t, w: width - M.l - M.r, h: height - M.t - M.b };
  const clip = `${uid}-clip-${compact ? "s" : "w"}`;
  const win = { x0: x(MOON_WINDOW.o2Min), x1: x(VIEW.o2[1]), y0: y(MOON_WINDOW.pMax), y1: y(VIEW.p[0]) };
  const lit = HALO_DATA.literature.flatMap((l) => (l.pressurePsia !== null && l.o2Pct !== null && l.o2Pct >= VIEW.o2[0] && l.o2Pct <= VIEW.o2[1] ? [{ o2: l.o2Pct, p: l.pressurePsia }] : []));
  const letter = compact ? fs * 1.55 : fs * 1.9;
  const halo = { stroke: "var(--surface-1)", strokeWidth: 3.5, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" aria-hidden="true" className={className} style={{ fontFamily: "var(--font-sans)" }}>
      <defs>
        <clipPath id={clip}>
          <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} fill={FILL.F} />
        <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} fill={`url(#${uid}-hatch)`} />
        {COVERAGE_CLASSES.map((c) => (
          <g key={c} data-cov={c} transform={matrix}>
            <use href={`#${uid}-${c}-d`} fill="none" stroke={EDGE.D} strokeWidth={2} />
            <use href={`#${uid}-${c}-d`} fill={FILL.D} />
            <use href={`#${uid}-${c}-c`} fill="none" stroke={EDGE.C} strokeOpacity={0.5} strokeWidth={2} />
            <use href={`#${uid}-${c}-c`} fill={FILL.C} />
            <use href={`#${uid}-${c}-b`} fill="none" stroke={EDGE.B} strokeWidth={2.5} />
            <use href={`#${uid}-${c}-b`} fill={FILL.B} />
          </g>
        ))}
      </g>
      {/* Hairline grid over the field */}
      {Y_TICKS.map((t) => (
        <g key={`y${t}`}>
          <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={t === VIEW.p[0] ? 1 : 0.6} />
          <text x={M.l - 7} y={y(t)} dy="0.32em" textAnchor="end" fontSize={fs} fill="var(--text-3)" style={{ fontFamily: "var(--font-mono)" }}>
            {t}
          </text>
        </g>
      ))}
      {X_TICKS.map((t) => (
        <g key={`x${t}`}>
          <line x1={x(t)} x2={x(t)} y1={M.t} y2={height - M.b} stroke="var(--border)" strokeWidth={0.6} />
          <text x={x(t)} y={height - M.b + fs * 1.5} textAnchor="middle" fontSize={fs} fill="var(--text-3)" style={{ fontFamily: "var(--font-mono)" }}>
            {compact && t % 10 !== 0 ? "" : t}
          </text>
        </g>
      ))}
      <text x={(M.l + width - M.r) / 2} y={height - fs * 0.45} textAnchor="middle" fontSize={fs} fill="var(--text-2)">
        Oxygen, O₂ (%)
      </text>
      <text transform={`translate(${fs * 1.05} ${(M.t + height - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs} fill="var(--text-2)">
        Total pressure (psia)
      </text>

      {/* Moon window from the challenge */}
      <rect x={win.x0} y={win.y0} width={win.x1 - win.x0} height={win.y1 - win.y0} fill="none" stroke="var(--text-1)" strokeOpacity={0.75} strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={win.x1 - 8} y={win.y1 - 8} textAnchor="end" fontSize={fs - 0.5} fontWeight={600} fill="var(--text-1)" {...halo}>
        Moon window
      </text>

      {/* Tested conditions and zone letters, per class */}
      {COVERAGE_CLASSES.map((c) => (
        <g key={c} data-cov={c}>
          <g transform={matrix}>
            <use href={`#${uid}-${c}-dots`} fill="none" stroke="var(--surface-1)" strokeWidth={7} strokeLinecap="round" />
            <use href={`#${uid}-${c}-dots`} fill="none" stroke="var(--text-1)" strokeWidth={4} strokeLinecap="round" />
          </g>
          {c === "solid" &&
            lit.map((l, i) => {
              const cx = x(l.o2);
              const cy = y(l.p);
              const h = compact ? 4.5 : 5.5;
              return <path key={i} d={`M${cx} ${cy - h}L${cx + h} ${cy}L${cx} ${cy + h}L${cx - h} ${cy}Z`} fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth={1.4} strokeLinejoin="round" />;
            })}
          {BY_CLASS[c].labels.map((l) => (
            <text key={`${l.grade}${l.o2}${l.p}`} x={x(l.o2)} y={y(l.p)} dy="0.36em" textAnchor="middle" fontSize={letter} fontWeight={700} fill={INK[l.grade]} style={{ fontFamily: "var(--font-display)" }} {...halo}>
              {l.grade}
            </text>
          ))}
        </g>
      ))}

      {/* Preset habitats */}
      {presetMarks().map((m) => {
        const off = m.o2 > VIEW.o2[1];
        const cx = off ? width - M.r - 2 : x(m.o2);
        const cy = y(m.p);
        const arm = 6.5;
        const lfs = fs - 0.5;
        const label = compact ? m.short : m.long;
        if (off) {
          return (
            <g key={m.key}>
              <path d={`M${cx - 12} ${cy}H${cx}M${cx - 5} ${cy - 5}L${cx} ${cy}L${cx - 5} ${cy + 5}`} fill="none" stroke="var(--text-1)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              <text x={cx - 16} y={cy} dy="0.34em" textAnchor="end" fontSize={lfs} fontWeight={600} fill="var(--text-1)" {...halo}>
                {label}
              </text>
            </g>
          );
        }
        const d = `M${cx - arm} ${cy}H${cx + arm}M${cx} ${cy - arm}V${cy + arm}`;
        const pos = {
          ne: { dx: arm + 4, dy: -arm - 2, anchor: "start" as const },
          nw: { dx: -arm - 4, dy: -arm - 2, anchor: "end" as const },
          se: { dx: arm + 4, dy: arm + lfs, anchor: "start" as const },
          w: { dx: -arm - 4, dy: 4, anchor: "end" as const },
        }[m.pos];
        return (
          <g key={m.key}>
            <circle cx={cx} cy={cy} r={arm + 2.5} fill="var(--surface-1)" fillOpacity={0.55} stroke="var(--text-1)" strokeWidth={1.25} />
            <path d={d} stroke="var(--text-1)" strokeWidth={1.6} strokeLinecap="round" />
            <text x={cx + pos.dx} y={cy + pos.dy} textAnchor={pos.anchor} fontSize={lfs} fontWeight={600} fill="var(--text-1)" {...halo}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Swatch({ fill, hatch, edge }: { fill: string; hatch?: boolean; edge: string }) {
  return (
    <span aria-hidden="true" className="relative inline-block size-3.5 shrink-0 overflow-hidden rounded-[3px]" style={{ background: fill, boxShadow: `inset 0 0 0 1px ${edge}` }}>
      {hatch && <span className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, color-mix(in oklab, var(--warn) 30%, transparent) 0 1.4px, transparent 1.4px 5px)" }} />}
    </span>
  );
}

function rangeSentence(c: ClassCoverage): string {
  const L = COVERAGE_LABEL[c.fuelClass];
  if (!c.o2Range || !c.pRange) return `PSI holds no ${L.long} tests.`;
  const o2 = c.o2Range[0] === c.o2Range[1] ? `${fmt(c.o2Range[0])}%` : `${fmt(c.o2Range[0])}–${fmt(c.o2Range[1])}%`;
  const p = c.pRange[0] === c.pRange[1] ? `all at ${fmt(c.pRange[0])} psia` : `${fmt(c.pRange[0])}–${fmt(c.pRange[1])} psia`;
  return `${c.tests} PSI test rows at ${c.conditions} distinct conditions span ${o2} O₂, ${p}.`;
}

export function CoverageMap({ id = "cov", compact = false }: { id?: string; compact?: boolean }) {
  const [b, cR, d] = GRADE_RINGS;
  return (
    <figure className="covmap relative m-0 flex flex-col gap-5" data-coverage-map>
      <Defs uid={id} />
      <fieldset className="covmap-toggle flex flex-wrap gap-2">
        <legend className="type-label mb-2 text-fg-3">Graded on</legend>
        {COVERAGE_CLASSES.map((c) => (
          <label key={c} className="covmap-opt">
            <input type="radio" name={`${id}-class`} value={c} defaultChecked={c === "solid"} className="sr-only" />
            {COVERAGE_LABEL[c].short}
          </label>
        ))}
      </fieldset>

      <div
        role="img"
        aria-label={`Evidence coverage map. Oxygen from ${VIEW.o2[0]} to ${VIEW.o2[1]}% across, total pressure from ${VIEW.p[0]} to ${VIEW.p[1]} psia up. Each zone is shaded and lettered with the evidence grade from the chosen fuel class's PSI tests. The Moon window and the five habitat presets are marked. A text summary follows.`}
        className={compact ? "max-w-[760px]" : undefined}
      >
        <Chart uid={id} width={compact ? 680 : 880} height={compact ? 400 : 470} fs={12} compact={false} className="hidden h-auto w-full overflow-visible sm:block" />
        <Chart uid={id} width={340} height={430} fs={11.5} compact className="block h-auto w-full overflow-visible sm:hidden" />
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-2" aria-label="Legend">
        <li className="flex items-center gap-2"><Swatch fill={FILL.B} edge="var(--accent-line)" />A/B: tested close by</li>
        <li className="flex items-center gap-2"><Swatch fill={FILL.C} edge="var(--border-strong)" />C: near</li>
        <li className="flex items-center gap-2"><Swatch fill={FILL.D} edge="var(--warn-line)" />D: some way off</li>
        <li className="flex items-center gap-2"><Swatch fill={FILL.F} hatch edge="var(--warn-line)" />F: untested</li>
        <li className="flex items-center gap-2">
          <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="2.6" fill="var(--text-1)" stroke="var(--surface-1)" strokeWidth="1.5" /></svg>
          PSI test condition
        </li>
        <li className="flex items-center gap-2" data-cov="solid">
          <svg width="14" height="14" aria-hidden="true"><path d="M7 1.5L12.5 7L7 12.5L1.5 7Z" fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth="1.4" /></svg>
          Saffire runs, NASA reports (not graded)
        </li>
        <li className="flex items-center gap-2">
          <svg width="16" height="12" aria-hidden="true"><rect x="1" y="1" width="14" height="10" fill="none" stroke="var(--text-1)" strokeWidth="1.3" strokeDasharray="3 2" /></svg>
          Moon window (≥{MOON_WINDOW.o2Min}% O₂, ≤{MOON_WINDOW.pMax} psia)
        </li>
      </ul>

      {MAP.map((c) => {
        const L = COVERAGE_LABEL[c.fuelClass];
        return (
          <div key={c.fuelClass} data-cov={c.fuelClass} className="flex flex-col gap-4">
            <p className="type-label text-fg-3">Preset grades from {L.alone}</p>
            <ul className="-mt-2 flex flex-wrap gap-2" aria-label={`Preset grades from ${L.alone}`}>
              {c.presets.map((p) => (
                <li key={p.key} className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface-1 py-1 pl-1 pr-3 text-[0.8125rem] text-fg">
                  <GradeBadge grade={p.grade} size="sm" />
                  {p.name}
                </li>
              ))}
            </ul>
            <p className="type-caption max-w-[72ch] text-fg-3">
              Each zone shows the evidence grade a habitat at that atmosphere would get from {L.alone}. It measures how close the
              nearest test sits (<Link href="/method#distance" className="text-accent underline-offset-4 hover:underline">evidence distance</Link>{" "}
              rings at {b}, {cR} and {d}): evidence coverage, not safety.{" "}
              {(c.fuelClass === "solid" || c.fuelClass === "solid_surrogate") && (
                <>
                  A Fire Brief&apos;s overall grade starts from the real-solid grade and can rise one step, to {SURROGATE_CAP} at most, when a
                  surrogate test sits inside the first ring ({b}), so a brief can read one letter higher than this map.{" "}
                </>
              )}
              {rangeSentence(c)} Data:{" "}
              <a href={PSI_SEARCH_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
                NASA PSI
              </a>
              .
            </p>
            <div className="sr-only">
              <p>
                Graded on {L.long}. {rangeSentence(c)} Share of the mapped window at each grade: A {pct(c.share.A)}, B {pct(c.share.B)}, C {pct(c.share.C)}, D {pct(c.share.D)}, F {pct(c.share.F)}.
              </p>
              <table>
                <caption>Preset grades from {L.alone}</caption>
                <thead>
                  <tr><th scope="col">Preset</th><th scope="col">O₂ %</th><th scope="col">Pressure, psia</th><th scope="col">Grade</th></tr>
                </thead>
                <tbody>
                  {c.presets.map((p) => (
                    <tr key={p.key}>
                      <th scope="row">{p.name}</th>
                      <td>{PRESETS[p.key].o2Pct}</td>
                      <td>{PRESETS[p.key].pressurePsia}</td>
                      <td>{p.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </figure>
  );
}
