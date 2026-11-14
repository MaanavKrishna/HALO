"use client";

import Link from "next/link";

export default function BriefError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <h1 className="wide text-2xl font-bold">This brief could not be computed</h1>
      <p className="mt-2 text-muted">Check the habitat values and try again.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={() => retry()} className="rounded-md bg-flame px-4 py-2 font-semibold text-flame-ink">
          Try again
        </button>
        <Link href="/" className="rounded-md border border-rule-strong px-4 py-2">
          Build a habitat
        </Link>
      </div>
    </main>
  );
}
