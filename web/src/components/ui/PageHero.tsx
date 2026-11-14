import type { CSSProperties, ReactNode } from "react";
import { GridLines } from "./Divider";
import { HaloOrb } from "./HaloOrb";
import { Eyebrow } from "./Panel";
import { RingsGraphic } from "./RingsGraphic";
import { cx } from "./cx";

const settle = (ms: number) => ({ ["--settle-delay" as string]: `${ms}ms` }) as CSSProperties;

/**
 * Page opener: always a dark "theater well" (scoped data-theme="dark", even in
 * the light theme) so the orb keeps its energy. Instrument grid, display type
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
      data-theme="dark"
      aria-labelledby={titleId}
      className={cx("relative isolate overflow-hidden border-b border-line bg-canvas-deep text-fg", className)}
    >
      <GridLines corners />
      {visual !== "none" && (
        <div
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute -z-[1]",
            cinematic
              ? "right-[-48%] top-6 w-[115%] opacity-50 sm:right-[-14%] sm:top-1/2 sm:w-[74%] sm:-translate-y-1/2 sm:opacity-100 lg:right-[-2%] lg:w-[52%]"
              : "right-[-50%] top-4 w-[100%] opacity-40 sm:right-[-10%] sm:top-1/2 sm:w-[55%] sm:-translate-y-1/2 sm:opacity-100 lg:right-0 lg:w-[38%]",
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
          cinematic ? "min-h-[min(88svh,56rem)] justify-center gap-7 py-24" : "gap-6 pb-16 pt-20 sm:pb-20 sm:pt-28",
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
          <p className="hero-settle type-body-l max-w-[46ch] text-fg-2" style={settle(820)}>
            {lede}
          </p>
        )}
        {actions && (
          <div className="hero-settle flex flex-wrap items-center gap-3 pt-2" style={settle(920)}>
            {actions}
          </div>
        )}
        {meta && (
          <div className="hero-settle pt-6" style={settle(1000)}>
            {meta}
          </div>
        )}
      </div>
    </section>
  );
}
