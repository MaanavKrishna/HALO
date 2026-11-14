import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Investigation not found", robots: { index: false } };

/**
 * Target of the next.config rewrite for /explore/<unknown id>. It always calls
 * notFound() at build time, so the prerendered response is this segment's
 * not-found UI with a real 404 status, and the client hydrates the same tree.
 */
export default function ExploreMissing() {
  notFound();
}
