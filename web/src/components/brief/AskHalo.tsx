"use client";

import { useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SiChip } from "@/components/ui/SiChip";
import { cx } from "@/components/ui/cx";
import { QUESTION_MAX, citationChips, requestExplain, splitParagraphs, type ChipFact, type NarrativeChip } from "@/lib/brief/explain";
import { BriefIcon } from "./icons";

export type FactRef = ChipFact;

type State =
  | { mode: "fallback"; notice: boolean; open?: boolean }
  | { mode: "loading"; notice: boolean }
  | { mode: "live"; text: string };

/**
 * Ask HALO. The question box comes first; the precomputed narrative sits
 * behind a native disclosure. "Generate SI narration" asks /api/explain and
 * shows the live text only when the route answers 200 with source "live".
 * Any other answer, a network error or a timeout opens the precomputed text
 * and says so. Text is rendered as text (split on [fact-id] citations into
 * compact chips), never as HTML.
 */
export function AskHalo({
  fallback,
  query,
  facts,
  suggestions = [],
}: {
  fallback: string;
  query: string;
  facts: Record<string, FactRef>;
  suggestions?: string[];
}) {
  const [state, setState] = useState<State>({ mode: "fallback", notice: false });
  const [question, setQuestion] = useState("");
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const loading = state.mode === "loading";
  // Chips need JS to do anything, so they render only once hydrated; the form works without them.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  async function ask(text: string) {
    if (loading) return;
    setState((s) => ({ mode: "loading", notice: s.mode !== "live" && s.notice }));
    const out = await requestExplain(query, text);
    setState(out.kind === "live" ? { mode: "live", text: out.text } : { mode: "fallback", notice: true });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  const live = state.mode === "live";

  return (
    <div
      ref={root}
      data-ask
      data-state={state.mode}
      className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 sm:px-6">
        <span className="type-label text-fg-3">Ask HALO</span>
        {live && (
          <span className="type-label inline-flex items-center gap-2 text-fg-3">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent-glow)]" />
            SI narration
          </span>
        )}
      </div>

      <form onSubmit={submit} className="no-print border-b border-line bg-surface-2/40 px-4 py-5 sm:px-6" aria-describedby={`${id}-help`}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${id}-q`} className="text-sm font-medium text-fg">
            Ask about this brief
          </label>
          <span id={`${id}-count`} className={cx("num font-mono text-[0.75rem]", question.length >= QUESTION_MAX ? "text-fg" : "text-fg-3")}>
            {question.length}/{QUESTION_MAX}
            <span className="sr-only"> characters</span>
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id={`${id}-q`}
            type="text"
            value={question}
            maxLength={QUESTION_MAX}
            onChange={(e) => setQuestion(e.target.value.slice(0, QUESTION_MAX))}
            placeholder="Why is the grade low? Optional"
            aria-describedby={`${id}-count ${id}-help`}
            autoComplete="off"
            className="field-input min-w-0 flex-1"
          />
          <Button type="submit" loading={loading} loadingLabel="Generating…" icon={<BriefIcon name="sparkle" />} className="shrink-0">
            Generate SI narration
          </Button>
        </div>
        {hydrated && suggestions.length > 0 && (
          <div
            data-suggestions
            role="group"
            aria-label="Suggested questions"
            className={cx("mt-3 flex flex-wrap gap-2 transition-opacity duration-[var(--dur-fast)]", loading && "pointer-events-none opacity-50")}
          >
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                data-suggestion
                disabled={loading}
                onClick={() => {
                  setQuestion(q);
                  void ask(q);
                }}
                className="inline-flex min-h-8 items-center rounded-[var(--radius-pill)] border border-line bg-surface-2 px-3 py-1 text-left text-[0.8125rem] font-medium text-fg-2 transition-[background-color,border-color,color,scale] duration-[var(--dur-fast)] hover:border-accent-line hover:bg-accent-soft hover:text-fg active:scale-[0.97] disabled:cursor-default pointer-coarse:min-h-10"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <p id={`${id}-help`} className="type-caption mt-2.5 text-fg-3">
          HALO checks every number in the answer against this brief&rsquo;s facts before showing it. SI text carries an <SiChip /> chip.
        </p>
        {live && (
          <button
            type="button"
            onClick={() => {
              setState({ mode: "fallback", notice: false, open: true });
              // The answer it replaced is gone; put focus on the opened summary's toggle.
              requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[data-precomputed] > summary")?.focus());
            }}
            className="mt-2 text-[0.8125rem] font-medium text-accent underline-offset-4 hover:underline"
          >
            Show the precomputed narrative
          </button>
        )}
      </form>

      <div className="px-4 py-5 sm:px-6 sm:py-6" aria-busy={loading} data-narrative>
        {loading ? (
          <div className="flex flex-col gap-3" aria-hidden="true" data-skeleton>
            {[96, 88, 92, 70, 84, 52].map((w, i) => (
              <span
                key={i}
                className="block h-3.5 animate-pulse rounded-full bg-surface-2 motion-reduce:animate-none"
                style={{ width: `${w}%`, animationDelay: `${i * 90}ms` }}
              />
            ))}
          </div>
        ) : live ? (
          <Narrative text={state.text} live facts={facts} root={root} />
        ) : (
          <details className="group/pre" data-precomputed open={state.notice || state.open === true}>
            <summary className="flex w-fit cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-sm)] text-[0.9375rem] font-medium text-accent [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-[var(--dur-fast)] group-open/pre:rotate-90" aria-hidden="true">
                  <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Read the plain-words summary
              </span>
              <span className="type-label text-fg-3">Precomputed</span>
            </summary>
            <div className="pt-4">
              <Narrative text={fallback} live={false} facts={facts} root={root} />
            </div>
          </details>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {loading ? "Generating SI narration…" : live ? "SI narration ready." : ""}
      </p>

      {state.mode !== "live" && state.notice && (
        <div className="px-4 pb-5 sm:px-6" data-fallback-notice>
          <Callout tone="info" live="polite" title="Showing precomputed narrative">
            The live SI narration is unavailable right now, so this is the narrative built from the grade and flags.
          </Callout>
        </div>
      )}
    </div>
  );
}

function Narrative({
  text,
  live,
  facts,
  root,
}: {
  text: string;
  live: boolean;
  facts: Record<string, FactRef>;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex max-w-[68ch] flex-col gap-3.5 text-[1.0625rem] leading-[1.65] text-fg">
      {/* Every SI paragraph carries the badge; the disclosure is spoken once for the whole answer. */}
      {live && <p className="sr-only">The following narration is SI-generated from the cited facts; numbers come only from those facts.</p>}
      {splitParagraphs(text).map((para, pi) => (
        <p key={pi} className={cx("text-pretty", pi > 0 && "text-fg-2")}>
          {live && (
            <span aria-hidden="true" data-si-chip>
              <SiChip className="mr-1.5" />
            </span>
          )}
          {citationChips(para, facts).map((part, k) =>
            part.type === "text" ? <span key={k}>{part.value}</span> : <FactButton key={k} chip={part} root={root} />,
          )}
        </p>
      ))}
    </div>
  );
}

/** Find the first visible element showing this fact outside the panel, or its source entry. */
function targetFor(id: string, n: number | null, root: HTMLElement | null): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-fact="${id}"]`)) {
    if (root?.contains(el)) continue;
    if (el.getClientRects().length === 0) continue;
    return el;
  }
  return n ? document.getElementById(`cite-${n}`) : null;
}

/**
 * A compact citation. It prints the fact's value only when the prose does not
 * already state it, else just "[n]"; the label lives in the tooltip and the
 * spoken name. Clicking jumps to the fact in the brief and flashes it.
 */
function FactButton({ chip, root }: { chip: Extract<NarrativeChip, { type: "cite" }>; root: React.RefObject<HTMLDivElement | null> }) {
  const id = chip.ids[0];
  const label = chip.labels.join("; ");
  function go() {
    const el = targetFor(id, chip.n, root.current);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.classList.remove("fact-flash");
    void el.offsetWidth; // restart the flash
    el.classList.add("fact-flash");
    window.setTimeout(() => el.classList.remove("fact-flash"), 1700);
    if (!el.matches("a, button, [tabindex]")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
  const bare = chip.show === null;
  return (
    <button
      type="button"
      onClick={go}
      data-fact-chip={id}
      data-chip-kind={bare ? "cite" : "value"}
      title={`${label}: show it in the brief`}
      className={cx(
        "num inline-flex translate-y-[-0.08em] items-center whitespace-nowrap align-middle font-mono transition-[background-color,border-color,scale] duration-[var(--dur-fast)] active:scale-[0.97]",
        bare
          ? "rounded-[var(--radius-xs)] px-0.5 py-0.5 text-[0.78em] text-accent hover:bg-accent-soft"
          : "mx-0.5 h-[1.375rem] gap-1 rounded-[var(--radius-pill)] border border-accent-line bg-accent-soft px-2 text-[0.75rem] text-fg hover:border-accent",
      )}
    >
      <span className="sr-only">
        Show fact: {label}
        {chip.n ? `, source ${chip.n}` : ""}
      </span>
      {chip.show !== null && <span aria-hidden="true">{chip.show}</span>}
      {chip.n ? (
        <span aria-hidden="true" className={bare ? undefined : "text-fg-3"}>
          [{chip.n}]
        </span>
      ) : (
        bare && <BriefIcon name="jump" size={11} className="chip-jump shrink-0" />
      )}
    </button>
  );
}
