"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./Brand";
import { ButtonLink } from "./Button";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { cx } from "./cx";
import { BUILD_HREF, NAV_LINKS } from "./site";

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Global navigation: a sticky glass bar. Content scrolls under it; a hairline
 * appears only once something is beneath it. Below lg the links collapse into
 * a glass sheet anchored to the menu button (Escape, outside tap or a link
 * closes it; focus returns to the button).
 */
export function Navbar() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // While the sheet is open it behaves as a modal: the rest of the page is inert,
  // Tab cycles between the close button and the sheet, Escape closes and
  // focus returns to the button.
  useEffect(() => {
    if (!open) return;
    sheet.current?.querySelector<HTMLElement>("a")?.focus();
    const outside = [document.getElementById("main"), document.querySelector("body > footer"), document.querySelector("a[href='#main']")].filter(
      (el): el is HTMLElement => !!el,
    );
    outside.forEach((el) => (el.inert = true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [button.current, ...Array.from(sheet.current?.querySelectorAll<HTMLElement>("a[href], button") ?? [])].filter(
        (el): el is HTMLElement => !!el && el.tabIndex !== -1,
      );
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1;
      e.preventDefault();
      items[next]?.focus();
    };
    const mq = window.matchMedia("(width >= 64rem)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    document.documentElement.style.overflow = "hidden";
    return () => {
      outside.forEach((el) => (el.inert = false));
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="no-print sticky top-0 z-[var(--z-nav)]">
      <div
        className={cx(
          "relative border-b transition-[border-color,background-color] duration-[var(--dur-base)]",
          "glass-chrome",
          scrolled || open ? "border-line" : "border-transparent",
        )}
      >
        <div className="container-wide flex h-[var(--nav-h)] items-center justify-between gap-6">
          <Brand />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((l) => {
                const current = isCurrent(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      prefetch={false}
                      aria-current={current ? "page" : undefined}
                      className={cx(
                        "relative block rounded-[var(--radius-pill)] px-3 py-1.5 text-[0.875rem] transition-colors duration-[var(--dur-fast)]",
                        current ? "text-fg" : "text-fg-2 hover:text-fg",
                        current &&
                          "after:absolute after:bottom-[-0.6rem] after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-accent after:shadow-[0_0_8px_var(--accent-glow)]",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <ButtonLink href={BUILD_HREF} prefetch={false} size="sm" aria-current={isCurrent(pathname, BUILD_HREF) ? "page" : undefined}>
              Build a brief
            </ButtonLink>
            <button
              ref={button}
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-fg transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-surface-2 active:scale-95 lg:hidden"
            >
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cx(
          "fixed inset-0 top-[var(--nav-h)] bg-[var(--scrim)] transition-opacity duration-[var(--dur-base)] lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        ref={sheet}
        hidden={!open}
        className="glass-strong absolute right-[var(--gutter)] top-[calc(var(--nav-h)+0.5rem)] w-[min(22rem,calc(100vw-2*var(--gutter)))] origin-top-right rounded-[var(--radius-xl)] p-2 transition-[opacity,scale,filter,display] transition-discrete duration-[var(--dur-base)] ease-out starting:scale-95 starting:opacity-0 starting:blur-[4px] lg:hidden"
      >
        <nav aria-label="Main">
          <ul className="flex flex-col">
            {NAV_LINKS.map((l) => {
              const current = isCurrent(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    prefetch={false}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cx(
                      "flex items-center justify-between rounded-[var(--radius-lg)] px-4 py-3 font-display text-[1.375rem] font-semibold tracking-[-0.012em] transition-colors",
                      current ? "bg-accent-soft text-fg" : "text-fg hover:bg-surface-2",
                    )}
                  >
                    {l.label}
                    {current && <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-2 flex flex-col gap-3 border-t border-line p-3 pt-4">
          <ButtonLink href={BUILD_HREF} prefetch={false} size="lg" className="w-full" onClick={() => setOpen(false)}>
            Build a brief
          </ButtonLink>
          <div className="flex items-center justify-between">
            <span className="type-label text-fg-3">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
