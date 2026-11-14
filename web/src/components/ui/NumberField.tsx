import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { Field, describedBy } from "./Field";
import { cx } from "./cx";

/** Numeric input with a fixed unit suffix, mono tabular digits, and Field wiring. */
export function NumberField({
  label,
  unit,
  hint,
  error,
  id,
  className,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  unit: string;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { error, hint })}
          className={cx("field-input num font-mono text-lg", unit.length > 3 ? "pr-16" : "pr-12")}
          {...input}
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-fg-3">
          {unit}
        </span>
      </div>
    </Field>
  );
}
