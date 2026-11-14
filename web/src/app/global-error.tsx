"use client";

import "./globals.css";

/**
 * Last-resort boundary for errors in the root layout. It replaces the whole
 * document, so it brings its own <html>/<body> and the global styles, and
 * uses only plain elements (the layout's nav, fonts and theme script are gone).
 * With no theme script it cannot read the stored choice, so it follows the OS
 * (color-scheme: light dark resolves every light-dark() token).
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-canvas-deep text-fg">
        <title>Something went wrong · HALO</title>
        <main className="container-wide flex flex-1 flex-col justify-center gap-6 py-24">
          <p className="type-label flex items-center gap-2 text-accent">
            <span aria-hidden="true" className="h-px w-4 bg-accent" />
            HALO{error.digest ? ` · ${error.digest.slice(0, 12)}` : ""}
          </p>
          <h1 className="type-display-l max-w-[16ch]">Something went wrong</h1>
          <p className="type-body-l max-w-[46ch] text-fg-2">
            HALO could not load. Nothing you entered was lost; try again, or reload the page.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex h-10 items-center rounded-[var(--radius-pill)] bg-accent-fill px-5 text-[0.9375rem] font-medium text-accent-ink"
            >
              Try again
            </button>
            {/* A full reload, since the client router may be the thing that failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="inline-flex h-10 items-center rounded-[var(--radius-pill)] border border-line px-5 text-[0.9375rem] font-medium text-fg">
              Go home
            </a>
          </div>
        </main>
        <footer className="container-wide py-8 text-sm text-fg-3">
          Not affiliated with or endorsed by NASA. Data: NASA Physical Sciences Informatics (CC0).
        </footer>
      </body>
    </html>
  );
}
