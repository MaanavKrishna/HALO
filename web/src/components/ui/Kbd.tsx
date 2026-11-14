import type { ReactNode } from "react";

/** Keyboard key. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[var(--radius-xs)] border border-line border-b-line-strong bg-surface-1 px-1.5 font-mono text-[0.75rem] text-fg-2 shadow-[var(--elev-1)]">
      {children}
    </kbd>
  );
}
