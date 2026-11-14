import Link from "next/link";
import { GradeBadge, Icon, StatusLight } from "@/components/ui";
import { mini } from "./data";

const SEVERITY = {
  critical: { status: "crit", label: "Critical" },
  warning: { status: "warn", label: "Caution" },
} as const;

/** Thumbnail of the brief's evidence halo: every eligible test by O2 and pressure, rings around the habitat. */
function MiniHalo() {
  const c = mini.chart;
  const pad = { l: 26, r: 10, t: 10, b: 24 };
  const vw = c.w + pad.l + pad.r;
  const vh = c.h + pad.t + pad.b;
  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      role="img"
      aria-label={`Evidence halo thumbnail for ${mini.name}: NASA microgravity tests by oxygen and pressure, with evidence rings around the habitat`}
      className="block h-auto w-full overflow-visible"
    >
      <defs>
        <clipPath id="mini-plot">
          <rect x="0" y="0" width={c.w} height={c.h} />
        </clipPath>
        <radialGradient id="mini-glow">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="var(--accent)" stopOpacity="0.08" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`translate(${pad.l} ${pad.t})`} fontFamily="var(--font-mono)" fontSize="9">
        <rect width={c.w} height={c.h} fill="var(--surface-2)" rx="4" />
        {c.yTicks.map((t) => (
          <g key={`y${t.v}`}>
            <line x1="0" x2={c.w} y1={t.y} y2={t.y} stroke="var(--border)" />
            <text x="-6" y={t.y} dy="0.32em" textAnchor="end" fill="var(--text-3)">
              {t.v}
            </text>
          </g>
        ))}
        {c.xTicks.map((t) => (
          <g key={`x${t.v}`}>
            <line x1={t.x} x2={t.x} y1="0" y2={c.h} stroke="var(--border)" />
            <text x={t.x} y={c.h + 14} textAnchor="middle" fill="var(--text-3)">
              {t.v}%
            </text>
          </g>
        ))}
        <g clipPath="url(#mini-plot)">
          <ellipse cx={c.habitat.x} cy={c.habitat.y} rx={c.rings[2].rx * 1.15} ry={c.rings[2].ry * 1.15} fill="url(#mini-glow)" />
          {c.points.map(([x, y, k]) =>
            k === 0 ? (
              <rect key={`${x}-${y}-${k}`} x={x - 2.2} y={y - 2.2} width="4.4" height="4.4" fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth="1" />
            ) : k === 1 ? (
              <path key={`${x}-${y}-${k}`} d={`M${x} ${y - 3}l3 3-3 3-3-3z`} fill="var(--accent)" />
            ) : (
              <circle key={`${x}-${y}-${k}`} cx={x} cy={y} r={k === 2 ? 1.6 : 1.2} fill="var(--text-3)" fillOpacity={k === 2 ? 0.45 : 0.3} />
            ),
          )}
          {c.rings.map((r, i) => (
            <ellipse
              key={r.d}
              data-ring=""
              pathLength={1}
              cx={c.habitat.x}
              cy={c.habitat.y}
              rx={r.rx}
              ry={r.ry}
              fill="none"
              stroke="var(--accent)"
              strokeOpacity={1 - i * 0.28}
              strokeWidth={i === 0 ? 1.4 : 1}
              style={{ ["--i" as string]: i }}
            />
          ))}
        </g>
        {c.nearestSolid && (
          <g data-link="">
            <line
              x1={c.habitat.x}
              y1={c.habitat.y}
              x2={c.nearestSolid.x}
              y2={c.nearestSolid.y}
              stroke="var(--text-2)"
              strokeDasharray="2 3"
            />
            <rect x={c.nearestSolid.x - 3.5} y={c.nearestSolid.y - 3.5} width="7" height="7" fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth="1.5" />
            <text x={c.nearestSolid.x - 6} y={c.nearestSolid.y - 8} textAnchor="end" fill="var(--text-2)">
              {c.nearestSolid.acronym}
            </text>
            <text
              x={(c.habitat.x + c.nearestSolid.x) / 2 + 4}
              y={(c.habitat.y + c.nearestSolid.y) / 2 - 6}
              fill="var(--text-1)"
            >
              d {c.nearestSolid.d}
            </text>
          </g>
        )}
        <circle cx={c.habitat.x} cy={c.habitat.y} r="4" fill="var(--accent)" style={{ filter: "drop-shadow(0 0 4px var(--accent-glow))" }} />
        <circle cx={c.habitat.x} cy={c.habitat.y} r="7.5" fill="none" stroke="var(--accent)" strokeOpacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * A miniature of the real Fire Brief for the Artemis Base preset: grade,
 * flags and the evidence halo, all computed by the engine at build time.
 */
export function MiniBrief() {
  const flags = mini.flags.filter((f) => f.severity !== "info");
  const info = mini.flags.find((f) => f.severity === "info");
  return (
    <article
      data-mini-brief=""
      aria-label={`Fire Brief preview for ${mini.name}`}
      className="landing-mini relative overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-3)]"
    >
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-6">
        <span className="type-label text-fg-3">Fire Brief</span>
        <span className="font-mono text-[0.75rem] text-fg-2 tabular-nums">
          {mini.o2}% O<sub>2</sub> · {mini.p} psia · ppO<sub>2</sub> {mini.pp}
        </span>
      </header>

      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <GradeBadge grade={mini.grade} size="lg" />
            <div className="min-w-0">
              <p className="type-title text-fg">{mini.name}</p>
              <p className="type-caption text-fg-3">Evidence grade {mini.grade}</p>
            </div>
          </div>
          <p className="type-body-s text-fg-2">{mini.reason}</p>
          <ul className="flex flex-col divide-y divide-[var(--border)] border-y border-line">
            {flags.map((f, i) => {
              const s = SEVERITY[f.severity as keyof typeof SEVERITY];
              return (
                <li key={f.id} data-flag="" className="flex items-start gap-3 py-2.5" style={{ ["--i" as string]: i }}>
                  <StatusLight status={s.status} label={s.label} hideLabel className="mt-1.5" />
                  <span className="text-[0.875rem] leading-snug text-fg">{f.title}</span>
                </li>
              );
            })}
          </ul>
          {info && (
            <p className="type-caption flex items-start gap-2 text-fg-3">
              <Icon name="info" size={16} className="mt-px shrink-0" />
              {info.title}
            </p>
          )}
        </div>
        <figure className="m-0 flex flex-col gap-3">
          <MiniHalo />
          <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.6875rem] text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block size-2 border border-fg bg-surface-1" /> Real solid
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block size-2 rotate-45 bg-accent" /> Surrogate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-fg-3" /> Droplet, gas
            </span>
            <span>O₂ × psia</span>
          </figcaption>
        </figure>
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 sm:px-6">
        <span className="type-caption text-fg-3">Computed by the HALO engine</span>
        <Link href={mini.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          Open the full brief
          <Icon name="arrowRight" size={16} />
        </Link>
      </footer>
    </article>
  );
}
