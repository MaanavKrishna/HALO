"use client";

import { useId } from "react";
import { cx } from "./cx";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control: native radio buttons (arrow keys move the selection),
 * styled as one capsule with a sliding thumb. For 2-5 mutually exclusive
 * views of the same thing; use Tabs when each option owns a panel.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const name = useId();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <fieldset className={cx("inline-flex", className)}>
      <legend className="sr-only">{label}</legend>
      <div
        className="relative grid auto-cols-fr grid-flow-col rounded-[var(--radius-pill)] bg-surface-2 p-[3px] shadow-[inset_0_0_0_1px_var(--border)]"
        style={{ ["--n" as string]: options.length, ["--i" as string]: index }}
      >
        <span
          aria-hidden="true"
          className="absolute bottom-[3px] left-[3px] top-[3px] rounded-[var(--radius-pill)] bg-surface-1 shadow-[0_0_0_1px_var(--border-strong),var(--inner-highlight),var(--elev-2)] transition-transform duration-[var(--spring-dur-snappy)] ease-[var(--spring)]"
          style={{ width: `calc((100% - 6px) / var(--n))`, transform: `translateX(calc(var(--i) * 100%))` }}
        />
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              "relative z-[1] flex cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-pill)] font-medium transition-colors duration-[var(--dur-fast)]",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--focus)]",
              size === "sm" ? "h-7 px-3 text-[0.8125rem]" : "h-9 px-4 text-sm",
              o.value === value ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
