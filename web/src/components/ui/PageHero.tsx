import type { CSSProperties, ReactNode } from "react";
import { GridLines } from "./Divider";
import { HaloOrb } from "./HaloOrb";
import { Eyebrow } from "./Panel";
import { RingsGraphic } from "./RingsGraphic";
import { cx } from "./cx";

const settle = (ms: number) => ({ ["--settle-delay" as string]: `${ms}ms` }) as CSSProperties;

/**
 * Page opener: a "theater well" that follows the theme (deep space in dark,
 * instrument bone lit from the orb side in light). Instrument grid, display type
 * and the signature visual, with one choreographed entrance: the orb ignites,
 * the rings draw in, then the text settles. Runs once; static under reduced
 * motion. `size="cinematic"` is for the landing page and the styleguide only.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  actions,
  visual = "none",
  size = "page",
  meta,
  ringLabels,
  titleId,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  visual?: "orb" | "rings" | "none";
  size?: "cinematic" | "page";
  /** Instrument readouts under the actions, e.g. a StatGroup or a data line. */
  meta?: ReactNode;
  /** Labels for the rings (innermost first), shown from sm up. */
  ringLabels?: readonly string[];
  titleId?: string;
  className?: string;
}) {
  const cinematic = size === "cinematic";
  const orb = visual === "orb";
  return (
    <section
      aria-labelledby={titleId}
      className={cx("theater-well relative isolate overflow-hidden border-b border-line text-fg", className)}
    >
      <GridLines corners />
      {visual !== "none" && (
        <div
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute -z-[1]",
            cinematic
              ? "right-[-48%] top-6 w-[115%] opacity-50 sm:right-[-24%] sm:top-1/2 sm:w-[74%] sm:-translate-y-1/2 sm:opacity-75 lg:right-[-2%] lg:w-[52%] lg:opacity-100 min-[100rem]:right-[max(-2%,calc((100%-var(--container-wide))/2-4rem))] min-[100rem]:w-[min(52%,64rem)]"
              : "right-[-50%] top-4 w-[100%] opacity-40 sm:right-[-22%] sm:top-1/2 sm:w-[55%] sm:-translate-y-1/2 sm:opacity-60 lg:right-0 lg:w-[38%] lg:opacity-100 min-[100rem]:right-[max(0px,calc((100%-var(--container-wide))/2-2rem))] min-[100rem]:w-[min(38%,44rem)]",
          )}
        >
          {/* Crosshair axes through the orb centre, running out to the hero edges. */}
          <span className="absolute left-1/2 top-[-150%] h-[400%] w-px bg-[linear-gradient(transparent,var(--accent-line)_45%,var(--accent-line)_55%,transparent)] opacity-50" />
          <span className="absolute left-[-150%] top-1/2 h-px w-[400%] bg-[linear-gradient(90deg,transparent,var(--accent-line)_45%,var(--accent-line)_55%,transparent)] opacity-50" />
          <div className="relative grid place-items-center">
            <RingsGraphic
              rings={orb ? 5 : 6}
              active={orb ? undefined : 2}
              labels={ringLabels}
              drawIn
              maskInner={orb ? 0.46 : undefined}
              className="col-start-1 row-start-1"
            />
            {orb && <HaloOrb size={cinematic ? 320 : 200} fuel className="col-start-1 row-start-1 !w-[42%]" />}
          </div>
        </div>
      )}
      <div
        className={cx(
          "container-wide relative flex flex-col",
          cinematic
            ? "min-h-[min(calc(100svh-var(--nav-h)),56rem)] justify-center gap-[clamp(1.25rem,3svh,1.75rem)] py-[clamp(2rem,7svh,6rem)]"
            : "gap-4 pb-8 pt-[clamp(1.5rem,4svh,2.5rem)] sm:gap-5 sm:pb-10",
        )}
      >
        {eyebrow && (
          <div className="hero-settle" style={settle(600)}>
            <Eyebrow tone="accent">{eyebrow}</Eyebrow>
          </div>
        )}
        <h1 id={titleId} className={cx("hero-settle text-fg", cinematic ? "type-display-xl max-w-[12ch]" : "type-display-l max-w-[16ch]")} style={settle(700)}>
          {title}
        </h1>
        {lede && (
          <p className={cx("hero-settle type-body-l text-fg-2", cinematic ? "max-w-[58ch]" : "max-w-[46ch]")} style={settle(820)}>
            {lede}
          </p>
        )}
        {actions && (
          <div className="hero-settle flex flex-wrap items-center gap-3 pt-2" style={settle(920)}>
            {actions}
          </div>
        )}
        {meta && (
          <div className={cx("hero-settle", cinematic ? "pt-6" : "pt-2")} style={settle(1000)}>
            {meta}
          </div>
        )}
      </div>
    </section>
  );
}
