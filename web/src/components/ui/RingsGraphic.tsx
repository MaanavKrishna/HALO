"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "./cx";

const C = 200;
const INNER = 34;
const OUTER = 168;
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

/**
 * Concentric rings: HALO's graphic language (and the shape of the brief's
 * evidence chart), on an instrument dial with crosshair axes and degree ticks.
 * The tick dial turns very slowly on its own composited layer and pauses when
 * off-screen; `drawIn` draws the rings once on load. Both stop under reduced
 * motion. Decorative unless you pass `title`, which makes it an img.
 */
export function RingsGraphic({
  rings = 5,
  active,
  labels,
  spin = true,
  drawIn = false,
  maskInner,
  title,
  className,
}: {
  rings?: number;
  /** Index (0 = innermost) of the ring drawn in accent. */
  active?: number;
  /** Optional labels for rings, innermost first, on the 45° radial. Hidden on phones. */
  labels?: readonly string[];
  spin?: boolean;
  /** Draw the rings in once (hero choreography). */
  drawIn?: boolean;
  /** Hide rings inside this fraction of the radius (0-1), e.g. where a HaloOrb sits. */
  maskInner?: number;
  title?: string;
  className?: string;
}) {
  const dial = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = dial.current;
    if (!spin || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [spin]);

  const step = rings > 1 ? (OUTER - INNER) / (rings - 1) : 0;
  const radii = Array.from({ length: rings }, (_, i) => INNER + i * step);
  const mask: CSSProperties | undefined =
    maskInner !== undefined
      ? {
          maskImage: `radial-gradient(circle, transparent ${maskInner * 50}%, #000 ${maskInner * 50 + 4}%)`,
          WebkitMaskImage: `radial-gradient(circle, transparent ${maskInner * 50}%, #000 ${maskInner * 50 + 4}%)`,
        }
      : undefined;

  return (
    <div className={cx("relative aspect-square w-full", className)}>
      <div ref={dial} aria-hidden="true" className="rings-dial absolute inset-0" data-spin={spin} data-visible={visible}>
        <svg viewBox="0 0 400 400" className="size-full overflow-visible">
          <g stroke="var(--border-strong)" strokeWidth="1">
            {TICKS.map((deg) => {
              const major = deg % 30 === 0;
              const a = (deg * Math.PI) / 180;
              const r2 = major ? 194 : 189;
              return (
                <line
                  key={deg}
                  x1={C + 184 * Math.cos(a)}
                  y1={C + 184 * Math.sin(a)}
                  x2={C + r2 * Math.cos(a)}
                  y2={C + r2 * Math.sin(a)}
                  strokeOpacity={major ? 0.9 : 0.45}
                />
              );
            })}
          </g>
        </svg>
      </div>
      <svg
        viewBox="0 0 400 400"
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        className={cx("absolute inset-0 size-full overflow-visible", drawIn && "rings-draw")}
        style={mask}
      >
        <g stroke="var(--border-strong)" strokeOpacity="0.5" strokeWidth="1">
          <line x1={C} y1={6} x2={C} y2={394} strokeDasharray="2 6" />
          <line x1={6} y1={C} x2={394} y2={C} strokeDasharray="2 6" />
        </g>
        {radii.map((r, i) => {
          const on = i === active;
          return (
            <circle
              key={r}
              cx={C}
              cy={C}
              r={r}
              pathLength={1}
              fill="none"
              stroke={on ? "var(--accent)" : "var(--border-strong)"}
              strokeOpacity={on ? 1 : 0.35 + (0.4 * (rings - i)) / rings}
              strokeWidth={on ? 1.75 : 1}
              style={{ ["--i" as string]: i, ...(on ? { filter: "drop-shadow(0 0 6px var(--accent-glow))" } : {}) }}
            />
          );
        })}
        {labels?.map((label, i) => {
          const r = radii[i];
          if (r === undefined || (maskInner !== undefined && r / C < maskInner + 0.06)) return null;
          const a = -Math.PI / 4;
          const x = C + r * Math.cos(a);
          const y = C + r * Math.sin(a);
          return (
            <g key={label} className="hidden sm:inline">
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
        <circle cx={C} cy={C} r={2} fill="var(--text-3)" />
      </svg>
    </div>
  );
}
