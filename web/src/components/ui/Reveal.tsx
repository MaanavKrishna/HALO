"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll reveal: content rises 24px and sharpens from a soft blur as it
 * enters the viewport, once. Hidden state applies only when scripting is on
 * and motion is allowed (CSS in globals.css), so no-JS and reduced-motion
 * users always see the content. Use for narrative moments, not every block.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: ReactNode;
  /** Stagger in ms (keep steps 40-80ms). */
  delay?: number;
  as?: "div" | "section" | "li" | "figure";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // One ref type covers every allowed block tag.
  const Comp = Tag as "div";
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.revealed = "";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.revealed = "";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Comp
      ref={ref}
      data-reveal=""
      className={className}
      style={delay ? { ["--reveal-delay" as string]: `${delay}ms` } : undefined}
    >
      {children}
    </Comp>
  );
}
