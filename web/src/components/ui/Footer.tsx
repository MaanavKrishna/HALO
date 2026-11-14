import Link from "next/link";
import { BrandMark } from "./Brand";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { DISCLAIMER, FOOTER_GROUPS } from "./site";

/** Site footer: grouped links, theme choice, the NASA disclaimer, and a large quiet wordmark. */
export function Footer() {
  return (
    <footer className="no-print relative mt-auto overflow-hidden border-t border-line bg-canvas-deep">
      <div className="container-wide grid gap-12 pb-10 pt-16 md:grid-cols-[1.2fr_2fr] md:gap-8">
        <div className="flex flex-col gap-5">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-fg">
            <BrandMark size={20} />
            HALO
          </p>
          <p className="max-w-[30ch] text-sm leading-relaxed text-fg-2">
            Habitat Assessment from Low-gravity Observations. A cited fire brief for Moon and Mars habitats, built from NASA
            microgravity combustion data.
          </p>
          <ThemeToggle showLabels className="self-start" />
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {FOOTER_GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-4">
              <h2 className="type-label text-fg-3">{g.title}</h2>
              <ul className="flex flex-col gap-2.5 text-sm">
                {g.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a
                        href={l.href}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-fg-2 transition-colors hover:text-fg"
                      >
                        {l.label}
                        <Icon name="external" size={14} className="opacity-60" />
                        <span className="sr-only"> (external site)</span>
                      </a>
                    ) : (
                      <Link href={l.href} prefetch={false} className="text-fg-2 transition-colors hover:text-fg">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="container-wide flex flex-col gap-2 border-t border-line py-6 text-[0.8125rem] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{DISCLAIMER}</p>
        <p className="font-mono">NASA Space Apps 2026 · Flame in Freefall</p>
      </div>
    </footer>
  );
}
