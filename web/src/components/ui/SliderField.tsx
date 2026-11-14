import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { Field } from "./Field";

/**
 * Range input with a live mono readout, min/max ticks and an accent fill.
 * Pass `value` (controlled). The readout is an <output> tied to the input.
 */
export function SliderField({
  label,
  unit,
  hint,
  min = 0,
  max = 100,
  value,
  format = (v) => String(v),
  id,
  className,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "min" | "max"> & {
  label: ReactNode;
  unit?: string;
  hint?: ReactNode;
  min?: number;
  max?: number;
  value: number;
  format?: (v: number) => string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <Field
      label={label}
      htmlFor={inputId}
      hint={hint}
      className={className}
      aside={
        <output htmlFor={inputId} className="font-mono text-sm text-fg tabular-nums">
          {format(value)}
          {unit && <span className="text-fg-3"> {unit}</span>}
        </output>
      }
    >
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        value={value}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className="range"
        style={{ ["--pct" as string]: `${pct}%` }}
        {...input}
      />
      <div aria-hidden="true" className="-mt-1 flex justify-between font-mono text-[0.6875rem] text-fg-3 tabular-nums">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </Field>
  );
}
