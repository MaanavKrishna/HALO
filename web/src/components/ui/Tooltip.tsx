"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";

/**
 * Tooltip with its own trigger button, so it works with keyboard (focus),
 * mouse (hover after a short delay) and touch (tap opens; tap outside or
 * Escape closes). The tip is hoverable and stays open while the pointer is
 * over the trigger or the tip (WCAG 1.4.13). Its text is the trigger's
 * description (aria-describedby), so screen readers get it without opening.
 * Supplementary help only; never hide required information in a tooltip.
 */
export function Tooltip({
  content,
  children,
  label,
  side = "top",
  align = "center",
  className,
}: {
  content: ReactNode;
  /** The trigger's visible content (an icon, a term). */
  children: ReactNode;
  /** Accessible name for the trigger when children is an icon. */
  label?: string;
  side?: "top" | "bottom";
  /** Horizontal anchor; use "end" for triggers near the right edge of a phone screen. */
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const root = useRef<HTMLSpanElement>(null);

  const schedule = (next: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), ms);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      ref={root}
      className={cx("relative inline-flex", className)}
      // Hover covers the trigger and the tip, so the pointer can move onto the tip.
      onPointerEnter={(e) => e.pointerType === "mouse" && schedule(true, open ? 0 : 350)}
      onPointerLeave={(e) => e.pointerType === "mouse" && schedule(false, 150)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        // Opens (never toggles): focus already opened it, so a toggle would close it on the same tap.
        onClick={() => {
          window.clearTimeout(timer.current);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] text-fg-2 underline decoration-dotted decoration-1 underline-offset-[0.25em] hover:text-fg"
      >
        {children}
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cx(
          "glass-strong absolute z-[var(--z-tooltip)] w-max max-w-[min(16rem,80vw)] rounded-[var(--radius-sm)] px-3 py-2 text-left text-[0.8125rem] font-normal leading-snug text-fg no-underline",
          "transition-[opacity,scale,filter,display] transition-discrete duration-[var(--dur-fast)] ease-out starting:scale-[0.96] starting:opacity-0 starting:blur-[2px]",
          // An invisible bridge over the 8px gap keeps hover alive between trigger and tip.
          "before:absolute before:inset-x-0 before:h-2",
          align === "center" ? "left-1/2 -translate-x-1/2" : align === "start" ? "left-0" : "right-0",
          side === "top"
            ? "bottom-[calc(100%+8px)] origin-bottom before:top-full"
            : "top-[calc(100%+8px)] origin-top before:bottom-full",
        )}
      >
        {content}
      </span>
    </span>
  );
}
