"use client";

import { catchError, type ErrorInfo } from "next/error";

/**
 * Error boundary around one brief section: if a card fails, the rest of the
 * brief still renders and this section says so plainly.
 */
function SectionError(props: { title: string }, { retry }: ErrorInfo) {
  return (
    <div role="alert" className="brief-section border-t border-rule py-9">
      <p className="text-sm font-semibold">{props.title}</p>
      <p className="mt-1 text-sm text-muted">This section could not be computed.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="no-print mt-3 rounded-sm border border-rule-strong px-3 py-1.5 text-sm hover:border-ink"
      >
        Try again
      </button>
    </div>
  );
}

export const SectionBoundary = catchError(SectionError);
