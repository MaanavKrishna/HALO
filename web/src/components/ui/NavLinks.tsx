"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Brief", match: (p: string) => p === "/" || p.startsWith("/brief") },
  { href: "/explore", label: "Explore", match: (p: string) => p.startsWith("/explore") },
  { href: "/compare", label: "Compare", match: (p: string) => p.startsWith("/compare") },
  { href: "/about", label: "About", match: (p: string) => p.startsWith("/about") },
] as const;

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Main">
      <ul className="flex items-center gap-0.5 text-sm sm:gap-1">
        {LINKS.map((l) => {
          const current = l.match(pathname);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                prefetch={false}
                aria-current={current ? "page" : undefined}
                className={`block rounded-sm px-2.5 py-1.5 transition-colors sm:px-3 ${
                  current ? "bg-flame-soft font-semibold text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
