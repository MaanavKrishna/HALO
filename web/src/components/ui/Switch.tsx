import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cx } from "./cx";

/**
 * On/off switch: a checkbox with role="switch". The visible label and
 * optional description are wired to the input. Spring-timed thumb.
 */
export function Switch({
  label,
  description,
  className,
  id,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & { label: ReactNode; description?: ReactNode }) {
  const auto = useId();
  const inputId = id ?? auto;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <label htmlFor={inputId} className={cx("flex cursor-pointer items-center justify-between gap-4", className)}>
      <span className="flex flex-col">
        <span className="text-[0.9375rem] text-fg">{label}</span>
        {description && (
          <span id={descId} className="text-sm text-fg-2">
            {description}
          </span>
        )}
      </span>
      <input id={inputId} type="checkbox" role="switch" aria-describedby={descId} className="peer sr-only" {...input} />
      <span
        aria-hidden="true"
        className={cx(
          "relative h-[1.75rem] w-[2.875rem] shrink-0 rounded-full bg-sur-3 bg-surface-3 shadow-[inset_0_0_0_1px_var(--border)] transition-colors duration-[var(--dur-fast)]",
          "after:absolute after:left-[3px] after:top-[3px] after:size-[1.375rem] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgb(0_0_0/0.2),0_3px_8px_rgb(0_0_0/0.15)]",
          "after:transition-transform after:duration-[var(--spring-dur-snappy)] after:ease-[var(--spring)]",
          "peer-checked:bg-accent peer-checked:shadow-none peer-checked:after:translate-x-[1.125rem]",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]",
          "peer-disabled:opacity-50",
        )}
      />
    </label>
  );
}
