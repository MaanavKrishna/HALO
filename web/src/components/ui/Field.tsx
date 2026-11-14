import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { cx } from "./cx";

/**
 * Label + control + hint/error. The control must use `id` = htmlFor and
 * aria-describedby = `${htmlFor}-error` or `${htmlFor}-hint`
 * (see describedBy()).
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  aside,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Right-aligned extra in the label row, e.g. a live value readout. */
  aside?: ReactNode;
}) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.9375rem] font-medium text-fg">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-start gap-1.5 text-sm text-invalid">
          <Icon name="invalid" size={16} className="mt-[2px] shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-fg-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, { error, hint }: { error?: unknown; hint?: unknown }) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}
