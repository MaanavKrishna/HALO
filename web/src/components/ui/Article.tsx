"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { cx } from "./cx";

export interface TocItem {
  id: string;
  label: string;
}

/** Highlights the section currently under the reading line. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join("|");
  useEffect(() => {
    const ids = key.split("|");
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
  return active;
}

function TocList({ items, active }: { items: readonly TocItem[]; active?: string }) {
  return (
    <ol className="flex flex-col border-l border-line">
      {items.map((t) => {
        const on = t.id === active;
        return (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              aria-current={on ? "location" : undefined}
              className={cx(
                "-ml-px block border-l py-1.5 pl-4 text-sm transition-colors duration-[var(--dur-fast)]",
                on ? "border-accent text-fg" : "border-transparent text-fg-2 hover:text-fg",
              )}
            >
              {t.label}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Long-form layout (Method, Data, About): a sticky "On this page" table of
 * contents beside a prose column of ~68ch. On phones the contents collapse
 * into a disclosure above the text. Section headings inside `children` must
 * carry the ids listed in `toc`.
 */
export function Article({ toc, children, className }: { toc: readonly TocItem[]; children: ReactNode; className?: string }) {
  const ids = useMemo(() => toc.map((t) => t.id), [toc]);
  const active = useActiveSection(ids);
  return (
    <div className={cx("container-page grid gap-10 py-16 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 lg:py-24", className)}>
      <aside className="no-print">
        <details className="group rounded-[var(--radius-md)] border border-line bg-surface-1 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
            On this page
            <Icon name="plus" size={16} className="text-fg-3 transition-transform duration-[var(--dur-fast)] group-open:rotate-45" />
          </summary>
          <nav aria-label="On this page" className="px-4 pb-4">
            <TocList items={toc} active={active} />
          </nav>
        </details>
        <nav aria-label="On this page" className="sticky top-[calc(var(--nav-h)+2rem)] hidden lg:block">
          <p className="type-label mb-4 text-fg-3">On this page</p>
          <TocList items={toc} active={active} />
        </nav>
      </aside>
      <article className="prose-halo min-w-0">{children}</article>
    </div>
  );
}

/** Prose column alone, for long-form text without a contents list. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("prose-halo", className)}>{children}</div>;
}
