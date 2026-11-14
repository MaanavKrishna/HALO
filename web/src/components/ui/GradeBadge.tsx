import type { Grade } from "@/lib/engine/types";

/**
 * Evidence grade: how close the nearest NASA test sits to the habitat.
 * The ring is a halo whose closure shrinks as evidence thins; D and F use the
 * warning amber. It grades evidence, not the habitat.
 */
const RING: Record<Grade, { arc: number; tone: string; label: string }> = {
  A: { arc: 1, tone: "var(--flame)", label: "tested at these conditions" },
  B: { arc: 0.8, tone: "var(--flame)", label: "tested close to these conditions" },
  C: { arc: 0.6, tone: "var(--ink)", label: "nearest test is a moderate step away" },
  D: { arc: 0.4, tone: "var(--amber)", label: "nearest test is far; extrapolation" },
  F: { arc: 0.15, tone: "var(--amber)", label: "untested; no test close enough" },
};

const SIZES = { sm: 28, md: 44, lg: 76 } as const;

export function GradeBadge({ grade, size = "md" }: { grade: Grade; size?: keyof typeof SIZES }) {
  const px = SIZES[size];
  const r = 15;
  const c = 2 * Math.PI * r;
  const ring = RING[grade];
  return (
    <span
      role="img"
      aria-label={`Evidence grade ${grade}: ${ring.label}`}
      title={`Evidence grade ${grade}: ${ring.label}`}
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: px, height: px }}
    >
      <svg viewBox="0 0 36 36" width={px} height={px} aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--rule)" strokeWidth="2" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={ring.tone}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${c * ring.arc} ${c}`}
        />
      </svg>
      <span
        aria-hidden="true"
        className="wide font-extrabold leading-none"
        style={{ fontSize: px * 0.42, color: ring.tone }}
      >
        {grade}
      </span>
    </span>
  );
}
