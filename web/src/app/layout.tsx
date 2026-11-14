import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { NavLinks } from "@/components/ui/NavLinks";
import "./globals.css";

// Self-hosted at build time by next/font: no external font requests at runtime.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "HALO",
  description:
    "Habitat Assessment from Low-gravity Observations: a cited fire brief from NASA microgravity combustion data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-paper text-ink">
        <a
          href="#main"
          className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="no-print border-b border-rule">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
            <Link href="/" className="wide flex items-center gap-2.5 text-[15px] font-bold tracking-wide">
              <span aria-hidden="true" className="relative inline-block size-4">
                <span className="absolute inset-0 rounded-full border border-flame/40" />
                <span className="absolute inset-[4px] rounded-full bg-flame/80" />
              </span>
              HALO
            </Link>
            <NavLinks />
          </div>
        </header>
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted sm:px-8">
            Not affiliated with or endorsed by NASA. Data: NASA Physical Sciences Informatics (CC0).
          </div>
        </footer>
      </body>
    </html>
  );
}
