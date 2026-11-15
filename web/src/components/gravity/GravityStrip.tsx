import { cx } from "@/components/ui";
import { LEVELS } from "./gravity";

const moon = LEVELS[1];
const mars = LEVELS[2];

/** Marker shapes: evidence at an end (filled), simulated lunar gravity (hollow diamond), planned (dashed diamond). */
export function StripMarker({ kind, className }: { kind: "psi" | "oneg" | "lit" | "none" | "luci" | "fm2"; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={cx("shrink-0", className)}>
      {kind === "psi" && <circle cx="8" cy="8" r="5.5" fill="var(--accent)" style={{ filter: "drop-shadow(0 0 4px var(--accent-glow))" }} />}
      {kind === "oneg" && <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1" fill="var(--text-1)" />}
      {kind === "lit" && <rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="var(--accent)" strokeWidth="1.6" />}
      {kind === "none" && <circle cx="8" cy="8" r="5" fill="none" stroke="var(--border-strong)" strokeWidth="1.4" strokeDasharray="2 2" />}
      {kind === "luci" && <path d="M8 2l6 6-6 6-6-6z" fill="var(--surface-1)" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" />}
      {kind === "fm2" && <path d="M8 2l6 6-6 6-6-6z" fill="none" stroke="var(--text-2)" strokeWidth="1.4" strokeDasharray="2.2 1.8" strokeLinejoin="round" />}
    </svg>
  );
}

/**
 * One material's line across the gravity axis: an end mark at microgravity and
 * at 1 g where evidence exists, the untested span between them hatched, the
 * Moon and Mars ticks, and LUCI / FM2 markers at lunar gravity.
 */
export function GravityStrip({
  micro,
  oneG,
  luci,
  fm2,
  label,
}: {
  micro: "psi" | "lit" | "none";
  oneG: boolean;
  luci: boolean;
  fm2: boolean;
  label: string;
}) {
  return (
    <div role="img" aria-label={label} className="relative h-16 w-full">
      {/* hatched untested span */}
      <div
        aria-hidden="true"
        className="absolute inset-x-2 top-1/2 h-5 -translate-y-1/2 rounded-[var(--radius-xs)] border border-dashed border-line-strong"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--border) 0 1px, transparent 1px 7px)" }}
      />
      {/* Moon to Mars band, the habitats that matter */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 h-5 -translate-y-1/2 bg-[color-mix(in_oklab,var(--accent-soft)_80%,transparent)]"
        style={{ left: `calc(0.5rem + (100% - 1rem) * ${moon.g})`, width: `calc((100% - 1rem) * ${mars.g - moon.g})` }}
      />
      {[moon, mars].map((l) => (
        <span
          key={l.key}
          aria-hidden="true"
          className="absolute top-1/2 h-8 w-px -translate-y-1/2 bg-[var(--text-3)]"
          style={{ left: `calc(0.5rem + (100% - 1rem) * ${l.g})` }}
        />
      ))}
      {(luci || fm2) && (
        <span
          aria-hidden="true"
          className="absolute top-0 flex -translate-x-1/2 gap-0.5"
          style={{ left: `calc(0.5rem + (100% - 1rem) * ${moon.g})` }}
        >
          {luci && <StripMarker kind="luci" />}
          {fm2 && <StripMarker kind="fm2" />}
        </span>
      )}
      <span aria-hidden="true" className="absolute left-2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <StripMarker kind={micro} className="size-5" />
      </span>
      <span aria-hidden="true" className="absolute right-2 top-1/2 -translate-y-1/2 translate-x-1/2">
        <StripMarker kind={oneG ? "oneg" : "none"} className="size-5" />
      </span>
    </div>
  );
}

/** The shared axis: microgravity, Moon, Mars, Earth, positioned by surface gravity. */
export function GravityAxis() {
  return (
    <div aria-hidden="true" className="relative h-10 w-full">
      <div className="absolute inset-x-2 bottom-2 h-px bg-[var(--border-strong)]" />
      {LEVELS.map((l, i) => (
        <div
          key={l.key}
          className={cx(
            "absolute bottom-0 flex flex-col",
            i === 0 ? "items-start" : i === LEVELS.length - 1 ? "items-end" : "-translate-x-1/2 items-center",
          )}
          style={i === LEVELS.length - 1 ? { right: 0 } : { left: i === 0 ? 0 : `calc(0.5rem + (100% - 1rem) * ${l.g})` }}
        >
          <span className={cx("type-label whitespace-nowrap text-fg-2", l.key === "micro" && "normal-case")}>{l.short}</span>
          <span className={cx("mt-1 h-2 w-px bg-[var(--border-strong)]", i === 0 && "ml-2", i === LEVELS.length - 1 && "mr-2")} />
        </div>
      ))}
    </div>
  );
}
