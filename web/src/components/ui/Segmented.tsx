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
  // Four or more options fold into a 3-column tray on phones (below 30rem),
  // where one capsule row cannot hold them; the thumb then moves in 2D.
  const wrap = options.length > 3;
  const cols = 3;
  const rows = Math.ceil(options.length / cols);
  return (
    <fieldset className={cx("inline-flex max-w-full", className)}>
      <legend className="sr-only">{label}</legend>
      <div
        data-wrap={wrap || undefined}
        className="relative grid auto-cols-fr grid-flow-col rounded-[var(--radius-pill)] bg-surface-2 p-[3px] shadow-[inset_0_0_0_1px_var(--border)] max-[30rem]:data-wrap:grid-flow-row max-[30rem]:data-wrap:grid-cols-3 max-[30rem]:data-wrap:rounded-[var(--radius-lg)]"
        style={{
          ["--n" as string]: options.length,
          ["--i" as string]: index,
          ["--rows" as string]: rows,
          ["--col" as string]: index % cols,
          ["--row" as string]: Math.floor(index / cols),
        }}
      >
        <span
          aria-hidden="true"
          className="absolute left-[3px] top-[3px] h-[calc(100%-6px)] w-[calc((100%-6px)/var(--n))] translate-x-[calc(var(--i)*100%)] rounded-[var(--radius-pill)] bg-surface-1 shadow-[0_0_0_1px_var(--border-strong),var(--inner-highlight),var(--elev-2)] transition-[translate] duration-[var(--spring-dur-snappy)] ease-[var(--spring)] in-data-wrap:max-[30rem]:h-[calc((100%-6px)/var(--rows))] in-data-wrap:max-[30rem]:w-[calc((100%-6px)/3)] in-data-wrap:max-[30rem]:translate-x-[calc(var(--col)*100%)] in-data-wrap:max-[30rem]:translate-y-[calc(var(--row)*100%)] in-data-wrap:max-[30rem]:rounded-[var(--radius-md)]"
        />
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              "relative z-[1] flex cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-pill)] font-medium transition-colors duration-[var(--dur-fast)] in-data-wrap:max-[30rem]:rounded-[var(--radius-md)]",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--focus)]",
              size === "sm" ? "h-7 px-3 text-[0.8125rem] pointer-coarse:h-10" : "h-9 px-4 text-sm pointer-coarse:h-10",
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
