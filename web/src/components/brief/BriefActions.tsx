"use client";

import { useState } from "react";

/**
 * Print / Save PDF, Copy link and Download data. The data file is built in
 * the browser from the facts and cited rows the server already rendered.
 */
export function BriefActions({ download, filename }: { download: unknown; filename: string }) {
  const [status, setStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed; copy the address bar instead.");
    }
  }

  function save() {
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
  }

  const btn =
    "inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]";

  return (
    <div className="no-print flex flex-wrap items-center gap-2" data-actions>
      <button type="button" onClick={() => window.print()} className={`${btn} border-flame bg-flame text-flame-ink hover:brightness-110`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 6V2h8v4M4 12H2.5V6.5h11V12H12M4 9.5h8V14H4z" strokeLinejoin="round" />
        </svg>
        Print / Save PDF
      </button>
      <button type="button" onClick={copy} className={`${btn} border-rule-strong bg-surface hover:border-ink`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.5 2.5 0 013.5 3.5L10.5 8M9 11.5l-1.2 1.2a2.5 2.5 0 01-3.5-3.5L5.5 8" strokeLinecap="round" />
        </svg>
        Copy link
      </button>
      <button type="button" onClick={save} className={`${btn} border-rule-strong bg-surface hover:border-ink`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2v8m0 0L5 7m3 3l3-3M3 12.5h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download data
      </button>
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {status}
      </p>
    </div>
  );
}
