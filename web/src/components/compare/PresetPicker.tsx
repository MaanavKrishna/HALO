"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Segmented } from "@/components/ui";

export interface PickerOption {
  value: string;
  label: string;
  href: string;
}

/**
 * Preset picker as a Segmented control. Each option carries the compare URL
 * it leads to; choosing one navigates (no scroll jump) so the page stays the
 * single source of truth.
 */
export function PresetPicker({ label, options, value }: { label: string; options: PickerOption[]; value: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  return (
    <div className="flex min-w-0 flex-col gap-2.5" aria-busy={pending || undefined}>
      <span aria-hidden="true" className="type-label flex items-center gap-2 text-fg-3">
        {label}
        {pending && <span className="normal-case tracking-normal text-accent">updating…</span>}
      </span>
      <div className="-mx-1 overflow-x-auto px-1 py-1">
        <Segmented
          label={label}
          size="sm"
          options={options}
          value={shown}
          onChange={(v) => {
            const o = options.find((x) => x.value === v);
            if (o)
              start(() => {
                setShown(v);
                router.push(o.href, { scroll: false });
              });
          }}
        />
      </div>
    </div>
  );
}
