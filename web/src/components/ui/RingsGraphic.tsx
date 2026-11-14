import { cx } from "./cx";

/**
 * Concentric rings: HALO's graphic language (and the shape of the brief's
 * evidence chart). Rings sit on an instrument dial with crosshair axes and
 * degree ticks; the tick ring turns very slowly (stops under reduced motion).
 * Decorative unless you pass `title`, which makes it an img with that name.
 */
export function RingsGraphic({
  rings = 5,
  active,
  labels,
  spin = true,
  title,
  className,
}: {
  rings?: number;
  /** Index (0 = innermost) of the ring drawn in accent. */
  active?: number;
  /** Optional labels for rings, innermost first, set on the 45° radial. */
  labels?: readonly string[];
  spin?: boolean;
  title?: string;
  className?: string;
}) {
  const c = 200;
  const inner = 34;
  const outer = 168;
  const step = rings > 1 ? (outer - inner) / (rings - 1) : 0;
  const radii = Array.from({ length: rings }, (_, i) => inner + i * step);
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg
      viewBox="0 0 400 400"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cx("h-auto w-full overflow-visible", className)}
    >
      <g stroke="var(--border-strong)" strokeOpacity="0.5" strokeWidth="1">
        <line x1={c} y1={6} x2={c} y2={394} strokeDasharray="2 6" />
        <line x1={6} y1={c} x2={394} y2={c} strokeDasharray="2 6" />
      </g>
      <g className={spin ? "rings-spin" : undefined} stroke="var(--border-strong)" strokeWidth="1">
        {ticks.map((deg) => {
          const major = deg % 30 === 0;
          const r1 = 184;
          const r2 = major ? 194 : 189;
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={c + r1 * Math.cos(a)}
              y1={c + r1 * Math.sin(a)}
              x2={c + r2 * Math.cos(a)}
              y2={c + r2 * Math.sin(a)}
              strokeOpacity={major ? 0.9 : 0.45}
            />
          );
        })}
      </g>
      {radii.map((r, i) => {
        const on = i === active;
        return (
          <circle
            key={r}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={on ? "var(--accent)" : "var(--border-strong)"}
            strokeOpacity={on ? 1 : 0.35 + (0.4 * (rings - i)) / rings}
            strokeWidth={on ? 1.75 : 1}
            style={on ? { filter: "drop-shadow(0 0 6px var(--accent-glow))" } : undefined}
          />
        );
      })}
      {labels?.map((label, i) => {
        const r = radii[i];
        if (r === undefined) return null;
        const a = -Math.PI / 4;
        const x = c + r * Math.cos(a);
        const y = c + r * Math.sin(a);
        return (
          <g key={label}>
            <circle cx={x} cy={y} r={2.5} fill={i === active ? "var(--accent)" : "var(--text-3)"} />
            <text
              x={x + 7}
              y={y - 6}
              fill={i === active ? "var(--accent)" : "var(--text-3)"}
              fontFamily="var(--font-mono)"
              fontSize="10"
              letterSpacing="0.12em"
            >
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={c} cy={c} r={2} fill="var(--text-3)" />
    </svg>
  );
}
