"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import type { Grade } from "@/lib/engine/types";
import { BriefIcon } from "./icons";

interface ActionsApi {
  print: () => void;
  copy: () => Promise<void>;
  save: () => void;
  status: string;
}

const Ctx = createContext<ActionsApi | null>(null);

/**
 * Holds the "Download data" payload once (it is large) and the shared status
 * line, so the hero actions and the sticky bar run the same three actions.
 * The data file is built in the browser from what the server rendered.
 */
export function BriefActionsProvider({ download, filename, children }: { download: unknown; filename: string; children: ReactNode }) {
  const [status, setStatus] = useState("");

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed; copy the address bar instead.");
    }
  }, []);

  const save = useCallback(() => {
    const blob = new Blob([JSON.stringify(download, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("Data downloaded.");
  }, [download, filename]);

  const api = useMemo<ActionsApi>(() => ({ print: () => window.print(), copy, save, status }), [copy, save, status]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

function useActions(): ActionsApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("BriefActions needs BriefActionsProvider");
  return api;
}

/** Print / Save PDF, Copy link and Download data, in the hero. */
export function BriefActions() {
  const { print, copy, save, status } = useActions();
  return (
    <div className="no-print flex flex-wrap items-center gap-2.5" data-actions>
      <Button onClick={print} icon={<BriefIcon name="print" />}>
        Print / Save PDF
      </Button>
      <Button variant="secondary" onClick={copy} icon={<BriefIcon name="link" />}>
        Copy link
      </Button>
      <Button variant="secondary" onClick={save} icon={<BriefIcon name="download" />}>
        Download data
      </Button>
      <p role="status" aria-live="polite" className="type-caption min-h-[1.45em] text-fg-2 sm:ml-1">
        {status}
      </p>
    </div>
  );
}

const GRADE_TONE: Record<Grade, string> = {
  A: "text-accent border-accent-line bg-accent-soft",
  B: "text-accent border-accent-line bg-accent-soft",
  C: "text-fg border-line-strong bg-surface-2",
  D: "text-warn border-[var(--warn-line)] bg-warn-soft",
  F: "text-warn border-[var(--warn-line)] bg-warn-soft",
};

/**
 * Glass sub-bar under the site nav that appears once the hero has scrolled
 * away: habitat name, grade and the three actions. `watch` is the id of the
 * element whose departure reveals it. Hidden from assistive tech and the tab
 * order while it is offscreen, so the page never has two live copies.
 */
export function BriefStickyBar({ name, grade, watch }: { name: string; grade: Grade; watch: string }) {
  const { print, copy, save } = useActions();
  const [shown, setShown] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) * 16 || 56;
    // Shown once the hero's bottom edge passes under the nav.
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < 0), {
      rootMargin: `-${Math.round(navH)}px 0px 0px 0px`,
    });
    io.observe(target);
    return () => io.disconnect();
  }, [watch]);

  return (
    <div
      ref={bar}
      data-brief-bar
      data-visible={shown}
      aria-hidden={!shown}
      inert={!shown}
      className={cx(
        "brief-bar no-print glass-chrome fixed inset-x-0 top-[var(--nav-h)] z-[var(--z-sticky)] border-b border-line",
        "transition-[opacity,translate,visibility] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        shown ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
      )}
    >
      <div className="container-page flex h-[var(--brief-bar-h)] items-center gap-3">
        <span
          aria-hidden="true"
          className={cx("grid size-7 shrink-0 place-items-center rounded-full border font-display text-sm font-bold", GRADE_TONE[grade])}
        >
          {grade}
        </span>
        <p className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-fg">
          <span className="sr-only">Evidence grade {grade}, </span>
          {name}
          <span className="ml-2 hidden font-normal text-fg-3 sm:inline">Fire Brief</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden sm:contents">
            <Button size="sm" variant="ghost" onClick={copy} icon={<BriefIcon name="link" size={16} />}>
              Copy link
            </Button>
            <Button size="sm" variant="ghost" onClick={save} icon={<BriefIcon name="download" size={16} />}>
              Download
            </Button>
          </span>
          <span className="contents sm:hidden">
            <IconButton label="Copy link" onClick={copy}>
              <BriefIcon name="link" />
            </IconButton>
            <IconButton label="Download data" onClick={save}>
              <BriefIcon name="download" />
            </IconButton>
          </span>
          <Button size="sm" onClick={print} icon={<BriefIcon name="print" size={16} />} className="ml-1">
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}
