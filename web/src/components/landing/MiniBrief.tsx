import Link from "next/link";
import { GradeBadge, Icon, StatusLight } from "@/components/ui";
import { Tooltip } from "@/components/ui/Tooltip";
import { mini } from "./data";

const SEVERITY = {
  critical: { status: "crit", label: "Critical" },
  warning: { status: "warn", label: "Caution" },
} as const;

/** Thumbnail of the brief's evidence halo: every eligible test by O2 and pressure, rings around the habitat. */
function MiniHalo() {
  const c = mini.chart;
  const pad = { l: 30, r: 10, t: 12, b: 28 };
  const vw = c.w + pad.l + pad.r;
  const vh = c.h + pad.t + pad.b;
  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      role="img"
      aria-label={`Evidence halo thumbnail for ${mini.name}: NASA microgravity tests by oxygen and pressure, with evidence rings around the habitat${c.nearestSolid ? `; the nearest real-material test (${c.nearestSolid.acronym}) is ${c.nearestSolid.d} away in evidence distance` : ""}`}
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
      <g transform={`translate(${pad.l} ${pad.t})`} fontFamily="var(--font-mono)" fontSize="11.5">
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
            <text x={t.x} y={c.h + 17} textAnchor="middle" fill="var(--text-3)">
              {t.v}%
            </text>
          </g>
        ))}
        <g clipPath="url(#mini-plot)">
          <ellipse cx={c.habitat.x} cy={c.habitat.y} rx={c.rings[2].rx * 1.15} ry={c.rings[2].ry * 1.15} fill="url(#mini-glow)" />
          {c.points.map(([x, y, k]) =>
            k === 0 ? (
              <rect key={`${x}-${y}-${k}`} x={x - 3.5} y={y - 3.5} width="7" height="7" fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth="1.4" />
            ) : k === 1 ? (
              <path key={`${x}-${y}-${k}`} d={`M${x} ${y - 5}l5 5-5 5-5-5z`} fill="var(--accent)" />
            ) : (
              <circle key={`${x}-${y}-${k}`} cx={x} cy={y} r={k === 2 ? 2.6 : 2} fill="var(--text-2)" fillOpacity={k === 2 ? 0.7 : 0.5} />
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
            <rect x={c.nearestSolid.x - 5} y={c.nearestSolid.y - 5} width="10" height="10" fill="var(--surface-1)" stroke="var(--text-1)" strokeWidth="2" />
            <text x={c.nearestSolid.x - 6} y={c.nearestSolid.y - 8} textAnchor="end" fill="var(--text-2)">
              {c.nearestSolid.acronym}
            </text>
            <text
              x={(c.habitat.x + c.nearestSolid.x) / 2 + 4}
              y={(c.habitat.y + c.nearestSolid.y) / 2 - 6}
              fill="var(--text-1)"
            >
              {c.nearestSolid.d} away
            </text>
          </g>
        )}
        <circle cx={c.habitat.x} cy={c.habitat.y} r="6" fill="var(--accent)" style={{ filter: "drop-shadow(0 0 5px var(--accent-glow))" }} />
        <circle cx={c.habitat.x} cy={c.habitat.y} r="11" fill="none" stroke="var(--accent)" strokeOpacity="0.6" />
        <text
          x={c.habitat.x}
          y={c.habitat.y + 26}
          textAnchor="middle"
          fill="var(--text-1)"
          fontWeight="600"
          stroke="var(--surface-2)"
          strokeWidth="3"
          paintOrder="stroke"
        >
          {mini.name}
        </text>
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
        <span className="flex flex-wrap items-center justify-end gap-x-1.5 text-right font-mono text-[0.75rem] text-fg-2 tabular-nums">
          <span>
            {mini.o2}% oxygen · {mini.p} psia
          </span>
          <span aria-hidden="true">·</span>
          <Tooltip
            align="end"
            side="bottom"
            content="Oxygen partial pressure: the oxygen fraction times the total pressure, the share of the cabin pressure that is oxygen."
          >
            {mini.pp} psia of it oxygen
          </Tooltip>
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
              <span aria-hidden="true" className="inline-block size-2.5 border-[1.5px] border-fg bg-surface-1" /> Real solid
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block size-2.5 rotate-45 bg-accent" /> Surrogate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block size-2 rounded-full bg-fg-2" /> Droplet, gas
            </span>
            <span>Oxygen % × pressure</span>
            <Tooltip
              align="end"
              content={`Evidence distance (${mini.chart.nearestSolid?.d ?? "n/a"} here): how far the nearest real-material test sits from this habitat in oxygen and pressure combined. Smaller is closer; the rings mark grades B, C and D.`}
            >
              What “away” means
            </Tooltip>
          </figcaption>
        </figure>
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 sm:px-6">
        <span className="type-caption min-w-0 text-fg-3">HALO engine output</span>
        <Link href={mini.href} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium text-accent hover:underline">
          Open the full brief
          <Icon name="arrowRight" size={16} />
        </Link>
      </footer>
    </article>
  );
}
