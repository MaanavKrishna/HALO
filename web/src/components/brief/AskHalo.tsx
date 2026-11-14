"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SiChip } from "@/components/ui/SiChip";
import { cx } from "@/components/ui/cx";
import { QUESTION_MAX, requestExplain, splitCitations, splitSentences } from "@/lib/brief/explain";
import { BriefIcon } from "./icons";

export interface FactRef {
  label: string;
  /** Numeric value with its unit; null for text facts (the chip shows the label). */
  value: string | null;
  /** Source number in the citation list. */
  n: number | null;
}

type State =
  | { mode: "fallback"; notice: boolean }
  | { mode: "loading"; notice: boolean }
  | { mode: "live"; text: string };

/**
 * Ask HALO. The precomputed narrative renders immediately; "Generate SI
 * narration" asks /api/explain and swaps in the live text only when the
 * route answers 200 with source "live". Any other answer, a network error or
 * a timeout keeps the precomputed text and says so. Text is rendered as text
 * (split on [fact-id] citations into chips), never as HTML.
 */
export function AskHalo({ fallback, query, facts }: { fallback: string; query: string; facts: Record<string, FactRef> }) {
  const [state, setState] = useState<State>({ mode: "fallback", notice: false });
  const [question, setQuestion] = useState("");
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const loading = state.mode === "loading";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setState((s) => ({ mode: "loading", notice: s.mode !== "live" && s.notice }));
    const out = await requestExplain(query, question);
    setState(out.kind === "live" ? { mode: "live", text: out.text } : { mode: "fallback", notice: true });
  }

  const live = state.mode === "live";
  const text = live ? state.text : fallback;

  return (
    <div
      ref={root}
      data-ask
      data-state={state.mode}
      className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 sm:px-6">
        <span className="type-label text-fg-3">Ask HALO</span>
        <span className="type-label inline-flex items-center gap-2 text-fg-3">
          {live ? (
            <>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent-glow)]" />
              SI narration
            </>
          ) : (
            "Precomputed"
          )}
        </span>
      </div>

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
        ) : (
          <Narrative text={text} live={live} facts={facts} root={root} />
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

      <form onSubmit={submit} className="no-print border-t border-line bg-surface-2/40 px-4 py-5 sm:px-6" aria-describedby={`${id}-help`}>
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
        <p id={`${id}-help`} className="type-caption mt-2.5 text-fg-3">
          HALO checks every number in the answer against this brief&rsquo;s facts before showing it. SI text carries an <SiChip /> chip.
        </p>
        {live && (
          <button
            type="button"
            onClick={() => setState({ mode: "fallback", notice: false })}
            className="mt-2 text-[0.8125rem] font-medium text-accent underline-offset-4 hover:underline"
          >
            Show the precomputed narrative
          </button>
        )}
      </form>
    </div>
  );
}

/** Paragraphs break after a sentence that ends in citations (one flag per paragraph). */
function paragraphs(text: string): string[][] {
  const out: string[][] = [[]];
  for (const s of splitSentences(text)) {
    out[out.length - 1].push(s);
    if (/\]\s*$/.test(s)) out.push([]);
  }
  return out.filter((p) => p.length);
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
  const known = (id: string) => Object.hasOwn(facts, id);
  return (
    <div className="flex max-w-[68ch] flex-col gap-3.5 text-[1.0625rem] leading-[1.65] text-fg">
      {/* One spoken disclosure for the whole SI narration; the per-sentence chips are visual. */}
      {live && <p className="sr-only">The following narration is SI-generated from the cited facts; numbers come only from those facts.</p>}
      {paragraphs(text).map((sentences, pi) => (
        <p key={pi} className={cx("text-pretty", pi > 0 && "text-fg-2")}>
          {sentences.map((s, si) => {
            const parts = splitCitations(s, known);
            const prose = parts.map((p) => (p.type === "text" ? p.value : "")).join("");
            return (
              <span key={si}>
                {live && (
                  <span aria-hidden="true" data-si-chip>
                    <SiChip className="mr-1" />
                  </span>
                )}
                {parts.map((part, k) =>
                  part.type === "text" ? (
                    <span key={k}>{part.value}</span>
                  ) : (
                    <FactButton
                      key={k}
                      id={part.id}
                      fact={facts[part.id]}
                      root={root}
                      // The value is already in the sentence: the chip shows only its source number.
                      compact={facts[part.id].value !== null && valueInText(prose, facts[part.id].value as string)}
                    />
                  ),
                )}{" "}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

/** Whether a fact's value (number, with or without its unit) already appears in the sentence. */
function valueInText(text: string, value: string): boolean {
  const num = value.match(/^-?[\d.]+/)?.[0];
  if (!num) return false;
  const re = new RegExp(`(^|[^\\d.])${num.replace(/\./g, "\\.")}(?![\\d])`);
  return re.test(text);
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

function FactButton({
  id,
  fact,
  root,
  compact = false,
}: {
  id: string;
  fact: FactRef;
  root: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
}) {
  function go() {
    const el = targetFor(id, fact.n, root.current);
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
  return (
    <button
      type="button"
      onClick={go}
      data-fact-chip={id}
      title={`${fact.label}: show it in the brief`}
      className="mx-0.5 inline-flex h-6 max-w-[16rem] translate-y-[-0.1em] items-center gap-1 whitespace-nowrap rounded-[var(--radius-pill)] border border-accent-line bg-accent-soft px-2 align-middle font-mono text-[0.75rem] text-fg transition-[background-color,border-color,scale] duration-[var(--dur-fast)] hover:border-accent active:scale-[0.97]"
    >
      <span className="sr-only">Show fact: {fact.label}, </span>
      {!compact && (
        <span aria-hidden="true" className="fact-chip-value truncate">
          {fact.value ?? fact.label}
        </span>
      )}
      {fact.n && (
        <span aria-hidden="true" className={compact ? "text-accent" : "text-fg-3"}>
          [{fact.n}]
        </span>
      )}
      <BriefIcon name="jump" size={11} className="chip-jump shrink-0 text-accent" />
    </button>
  );
}
