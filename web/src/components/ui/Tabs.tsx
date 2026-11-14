"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

/**
 * ARIA tabs (automatic activation): Left/Right/Home/End move focus and
 * selection; only the active tab is in the tab order. An underline indicator
 * glides to the selected tab.
 */
export function Tabs({
  label,
  items,
  defaultId,
  className,
}: {
  label: string;
  items: readonly TabItem[];
  defaultId?: string;
  className?: string;
}) {
  const base = useId();
  const [active, setActive] = useState(defaultId ?? items[0]?.id);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(
    0,
    items.findIndex((t) => t.id === active),
  );

  function onKey(e: KeyboardEvent) {
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(items[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} onKeyDown={onKey} className="relative flex gap-1 overflow-x-auto border-b border-line">
        {items.map((t, i) => {
          const selected = i === index;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={cx(
                "relative -mb-px whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)]",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:origin-center after:rounded-full after:bg-accent after:transition-[scale,opacity] after:duration-[var(--spring-dur-snappy)] after:ease-[var(--spring)]",
                selected ? "text-fg after:scale-x-100 after:opacity-100" : "text-fg-2 after:scale-x-50 after:opacity-0 hover:text-fg",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {items.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={i !== index}
          tabIndex={0}
          className="pt-5 focus-visible:rounded-[var(--radius-sm)]"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
