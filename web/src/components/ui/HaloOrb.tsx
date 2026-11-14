import type { CSSProperties } from "react";
import { cx } from "./cx";

const SIZES = { sm: 48, md: 160, lg: 320, xl: 560 } as const;
export type HaloOrbSize = keyof typeof SIZES;

/**
 * The signature visual: a flame in microgravity burns as a dim blue sphere.
 * The flame sheet is a spherical shell, so it is brightest at the rim and dim
 * at the centre: a blue shell, a thin white-hot rim, an uneven turbulent veil
 * and a wide additive bloom. `fuel` adds the droplet at the core (droplet
 * combustion). Pure CSS, vector, decorative (aria-hidden). Ignites once, then
 * flickers slowly and asymmetrically; static under prefers-reduced-motion.
 */
export function HaloOrb({
  size = "md",
  fuel = false,
  animate = true,
  className,
  style,
}: {
  size?: HaloOrbSize | number;
  fuel?: boolean;
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <span
      aria-hidden="true"
      data-animate={animate}
      className={cx("halo-orb", className)}
      style={{ width: px, ["--orb-size" as string]: `${px}px`, ...style }}
    >
      <span className="halo-orb__shell" />
      <span className="halo-orb__turb" />
      <span className="halo-orb__hot" />
      {fuel && <span className="halo-orb__fuel" />}
    </span>
  );
}
