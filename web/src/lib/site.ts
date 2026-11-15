import type { Metadata } from "next";
import { BUILD_HREF, CHALLENGE_URL, DISCLAIMER, NAV_LINKS, REPO_URL, TOOL_LINKS } from "@/components/ui/site";

export { BUILD_HREF, CHALLENGE_URL, DISCLAIMER, NAV_LINKS, REPO_URL, TOOL_LINKS };

/** Production URL; a deployment can override it with NEXT_PUBLIC_SITE_URL. */
const DEFAULT_SITE_URL = "https://halo-fire-brief-maanavkrishnas-projects.vercel.app";

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" || u.protocol === "http:") return u.origin;
    } catch {
      // fall through to the default
    }
  }
  return DEFAULT_SITE_URL;
}

export const SITE_URL = siteUrl();
export const SITE_NAME = "HALO";
export const SITE_EXPANSION = "Habitat Assessment from Low-gravity Observations";
export const TAGLINE =
  "In microgravity, a flame becomes a halo. HALO turns NASA's microgravity fire data into a one-page fire brief for your habitat.";
export const SITE_DESCRIPTION =
  "Habitat Assessment from Low-gravity Observations: a cited fire-safety evidence brief for Moon and Mars habitats, built from NASA microgravity combustion data.";

/** Theme colours for the browser chrome and the web app manifest (the --bg-deep / --bg token values). */
export const THEME_DARK = "#05080f";
export const THEME_LIGHT = "#f4f3ef";

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

/** Static, indexable routes (dynamic ones are added by the sitemap). */
export const STATIC_ROUTES = [
  "/",
  BUILD_HREF,
  "/brief",
  ...NAV_LINKS.map((l) => l.href),
  ...TOOL_LINKS.map((l) => l.href),
  "/design",
] as const;

/**
 * Per-page metadata: title (the root template adds " · HALO"), description,
 * canonical URL and Open Graph / Twitter text. A colocated
 * opengraph-image file supplies the image.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: `${title} · ${SITE_NAME}`,
      description,
      url: path,
    },
    twitter: { card: "summary_large_image", title: `${title} · ${SITE_NAME}`, description },
  };
}
