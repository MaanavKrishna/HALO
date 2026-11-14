"use client";

import { useEffect, useRef, useState } from "react";

/** Container width in CSS px, so SVG text stays at a readable size at any width. */
export function useWidth<T extends HTMLElement>(initial: number, min = 280, max = 900) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(min, Math.min(max, Math.round(el.clientWidth))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, max]);
  return [ref, width] as const;
}
