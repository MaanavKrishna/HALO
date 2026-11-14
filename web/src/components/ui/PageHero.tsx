import type { ReactNode } from "react";
import { GridLines } from "./Divider";
import { HaloOrb } from "./HaloOrb";
import { Eyebrow } from "./Panel";
import { RingsGraphic } from "./RingsGraphic";
import { cx } from "./cx";

/**
 * Page opener. A dark "mission theater" well (follows the theme) on an
 * instrument grid, with display type and an optional signature visual.
 * `size="cinematic"` is for the landing page only; inner pages use "page".
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  actions,
  visual = "none",
  size = "page",
  meta,
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
  titleId?: string;
  className?: string;
}) {
  const cinematic = size === "cinematic";
  return (
    <section
      aria-labelledby={titleId}
      className={cx("relative isolate overflow-hidden border-b border-line bg-canvas-deep", className)}
    >
      <GridLines axes={visual !== "none"} corners />
      {visual !== "none" && (
        <div
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute -z-[1] grid place-items-center",
            cinematic
              ? "right-[-45%] top-4 w-[110%] opacity-45 sm:top-1/2 sm:-translate-y-1/2 sm:right-[-12%] sm:w-[78%] sm:opacity-100 lg:right-[-4%] lg:w-[58%]"
              : "right-[-50%] top-4 w-[100%] opacity-40 sm:top-1/2 sm:-translate-y-1/2 sm:right-[-10%] sm:w-[55%] sm:opacity-100 lg:right-0 lg:w-[38%]",
          )}
        >
          <div className="relative grid w-full place-items-center">
            <RingsGraphic rings={visual === "rings" ? 6 : 4} active={visual === "rings" ? 2 : undefined} className="col-start-1 row-start-1" />
            {visual === "orb" && (
              <HaloOrb size={cinematic ? 300 : 200} fuel className="col-start-1 row-start-1 !w-[44%]" />
            )}
          </div>
        </div>
      )}
      <div
        className={cx(
          "container-wide relative flex flex-col",
          cinematic ? "min-h-[min(92svh,60rem)] justify-center gap-8 py-24" : "gap-6 pb-16 pt-20 sm:pb-20 sm:pt-28",
        )}
      >
        {eyebrow && <Eyebrow tone="accent">{eyebrow}</Eyebrow>}
        <h1 id={titleId} className={cx(cinematic ? "type-display-xl max-w-[12ch]" : "type-display-l max-w-[16ch]", "text-fg")}>
          {title}
        </h1>
        {lede && <p className="type-body-l max-w-[46ch] text-fg-2">{lede}</p>}
        {actions && <div className="flex flex-wrap items-center gap-3 pt-2">{actions}</div>}
        {meta && <div className="pt-6">{meta}</div>}
      </div>
    </section>
  );
}
