import type { MetadataRoute } from "next";
import { HALO_DATA } from "@/lib/data/load";
import { PRESETS } from "@/lib/engine/presets";
import { habitatToQuery } from "@/lib/engine/url";
import { STATIC_ROUTES, absoluteUrl } from "@/lib/site";

/** Every indexable route: the static pages, all investigations and the five preset briefs. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(HALO_DATA.manifest.builtAt);
  const pages = STATIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));
  const investigations = HALO_DATA.investigations.map((inv) => ({
    url: absoluteUrl(`/explore/${inv.psiId}`),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const briefs = Object.values(PRESETS).map((h) => ({
    // Next writes <loc> verbatim, so the query's "&" must be escaped for valid XML.
    url: absoluteUrl(`/brief?${habitatToQuery(h)}`).replace(/&/g, "&amp;"),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [...pages, ...investigations, ...briefs];
}
