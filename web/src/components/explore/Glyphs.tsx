import type { FuelClass } from "@/lib/engine/types";
import { O2_TRACK, type HardwareFamily } from "@/lib/explore";
import { PRESETS } from "@/lib/engine/presets";
import { cx } from "@/components/ui";

/**
 * Geometric glyph per hardware family, authored on a 24px grid with the icon
 * set's 1.5px stroke. Our own marks: no agency insignia. Decorative.
 */
const HW: Record<HardwareFamily, React.ReactNode> = {
  // Rack: a tall cabinet with a round chamber window and a vent strip.
  rack: (
    <>
      <rect x="5.5" y="2.75" width="13" height="18.5" rx="2" />
      <circle cx="12" cy="10" r="3.6" />
      <circle cx="12" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <path d="M8.5 17h7" />
    </>
  ),
  // Glovebox: a sealed box with two glove ports.
  glovebox: (
    <>
      <rect x="2.75" y="5.5" width="18.5" height="13" rx="2" />
      <path d="M2.75 9h18.5" />
      <circle cx="8.5" cy="13.75" r="2.4" />
      <circle cx="15.5" cy="13.75" r="2.4" />
    </>
  ),
  // Cargo vehicle: a capsule hull with a burn strip.
  vehicle: (
    <>
      <path d="M8 4.5h8l2.5 3v9l-2.5 3H8l-2.5-3v-9z" />
      <path d="M12 8.5v7" />
      <path d="M9.5 21.25h5" />
    </>
  ),
  // Smoke diagnostics: particles rising from a sensor plate.
  smoke: (
    <>
      <path d="M4 20.25h16" />
      <circle cx="8" cy="15.5" r="2.25" />
      <circle cx="13.5" cy="10.5" r="1.75" />
      <circle cx="17.5" cy="5.5" r="1.25" />
    </>
  ),
  // Laboratory: a bench crosshair (ground hardware).
  lab: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  // None tabulated: an open dashed ring.
  none: <circle cx="12" cy="12" r="7.5" strokeDasharray="2 2.6" />,
};

export function HardwareGlyph({ family, size = 20, className }: { family: HardwareFamily; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("shrink-0", className)}
    >
      {HW[family]}
    </svg>
  );
}

/** Fuel-class marks, the same shapes the evidence chart uses: square, diamond, dot, cross. */
export function FuelMark({ fuel, className }: { fuel: FuelClass; className?: string }) {
  const shape =
    fuel === "solid" ? (
      <rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    ) : fuel === "solid_surrogate" ? (
      <path d="M6 1.5L10.5 6 6 10.5 1.5 6z" fill="currentColor" />
    ) : fuel === "droplet" ? (
      <circle cx="6" cy="6" r="3.5" fill="currentColor" fillOpacity="0.55" />
    ) : (
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    );
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className={cx("shrink-0", className)}>
      {shape}
    </svg>
  );
}

const [T0, T1] = O2_TRACK;
const MOON = PRESETS.moon.o2Pct;
const pos = (v: number) => (Math.min(T1, Math.max(T0, v)) - T0) / (T1 - T0);

/**
 * O2 coverage bar on a fixed 0-40% track. The dashed band marks the Moon
 * envelope's oxygen side (O2 at or above the Moon preset). Decorative: the
 * range is always printed next to it as text.
 */
export function CoverageBar({ range, className }: { range: [number, number] | null; className?: string }) {
  const ticks = [0, 10, 20, 30, 40];
  return (
    <span aria-hidden="true" className={cx("relative block h-3.5 w-full min-w-24", className)}>
      {/* track */}
      <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]" />
      {/* Moon envelope band */}
      <span
        className="absolute inset-y-0 border-x border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--accent-soft)_0_3px,transparent_3px_6px)]"
        style={{ left: `${pos(MOON) * 100}%`, right: 0 }}
      />
      {/* ticks */}
      {ticks.map((t) => (
        <span key={t} className="absolute bottom-0 h-1 w-px bg-line" style={{ left: `calc(${pos(t) * 100}% - ${t === T1 ? 1 : 0}px)` }} />
      ))}
      {range ? (
        range[0] === range[1] ? (
          <span
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface-1 shadow-[0_0_8px_var(--accent-glow)]"
            style={{ left: `${pos(range[0]) * 100}%` }}
          />
        ) : (
          <span
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_var(--accent-glow)]"
            style={{ left: `${pos(range[0]) * 100}%`, width: `max(6px, ${(pos(range[1]) - pos(range[0])) * 100}%)` }}
          />
        )
      ) : null}
    </span>
  );
}

/** Polar point, 0 deg at the top, clockwise. */
function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [60 + r * Math.cos(a), 60 + r * Math.sin(a)];
}
function arc(r: number, from: number, to: number): string {
  const [x0, y0] = polar(r, from);
  const [x1, y1] = polar(r, to);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const SWEEP = 240;
const deg = (v: number) => -SWEEP / 2 + pos(v) * SWEEP;

/**
 * Mission patch: our own geometric mark (no insignia). The gauge ring is the
 * same 0-40% O2 track as the coverage bar, with the tested range lit and the
 * Moon band hatched; the hardware glyph sits at the core. Decorative.
 */
export function MissionPatch({
  family,
  o2Range,
  code,
  size = 112,
  className,
}: {
  family: HardwareFamily;
  o2Range: [number, number] | null;
  code: string;
  size?: number;
  className?: string;
}) {
  const ticks = Array.from({ length: 9 }, (_, i) => i * 5);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" className={cx("shrink-0 overflow-visible", className)}>
      <circle cx="60" cy="60" r="57" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      <circle cx="60" cy="60" r="35" fill="var(--surface-1)" stroke="var(--border)" strokeWidth="1" />
      {ticks.map((t) => {
        const [x0, y0] = polar(53, deg(t));
        const [x1, y1] = polar(t % 10 === 0 ? 49 : 51, deg(t));
        return <line key={t} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--border-strong)" strokeWidth="1" />;
      })}
      <path d={arc(44, deg(T0), deg(T1))} fill="none" stroke="var(--surface-3)" strokeWidth="4" strokeLinecap="round" />
      <path d={arc(44, deg(MOON), deg(T1))} fill="none" stroke="var(--text-3)" strokeWidth="1" strokeDasharray="1.5 2.5" transform="translate(0 0)" />
      {o2Range && (
        <path
          d={o2Range[0] === o2Range[1] ? arc(44, deg(o2Range[0]) - 1.5, deg(o2Range[0]) + 1.5) : arc(44, deg(o2Range[0]), deg(o2Range[1]))}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 3px var(--accent-glow))" }}
        />
      )}
      <g transform="translate(44 44) scale(1.333)" fill="none" stroke="var(--text-1)" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        {HW[family]}
      </g>
      <text x="60" y="108" textAnchor="middle" fontSize="9" letterSpacing="0.12em" fill="var(--text-3)" style={{ fontFamily: "var(--font-mono)" }}>
        {code}
      </text>
    </svg>
  );
}
