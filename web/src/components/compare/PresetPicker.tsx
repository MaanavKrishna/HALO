import Link from "next/link";
import { useId } from "react";
import { cx } from "@/components/ui";

export interface PickerOption {
  value: string;
  label: string;
  href: string;
}

/**
 * Preset picker styled as a Segmented capsule, built from plain links so it
 * works without JS and never navigates on arrow keys (WCAG 3.2.2). The
 * current option is marked aria-current="page" and carries the thumb.
 */
export function PresetPicker({ label, options, value }: { label: string; options: PickerOption[]; value: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span id={id} className="type-label text-fg-3">
        {label}
      </span>
      <div className="-mx-1 overflow-x-auto px-1 py-1">
        <div
          role="group"
          aria-labelledby={id}
          className="inline-grid auto-cols-fr grid-flow-col rounded-[var(--radius-pill)] bg-surface-2 p-[3px] shadow-[inset_0_0_0_1px_var(--border)]"
        >
          {options.map((o) => {
            const on = o.value === value;
            return (
              <Link
                key={o.value}
                href={o.href}
                prefetch={false}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "relative flex h-7 items-center justify-center whitespace-nowrap rounded-[var(--radius-pill)] px-3 text-[0.8125rem] font-medium transition-[color,background-color,box-shadow] duration-[var(--dur-fast)] active:scale-[0.97]",
                  on
                    ? "bg-surface-1 text-fg shadow-[0_0_0_1px_var(--border-strong),var(--inner-highlight),var(--elev-2)]"
                    : "text-fg-2 hover:text-fg",
                )}
              >
                {o.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
