import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_EXPANSION, SITE_NAME, THEME_DARK } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: ${SITE_EXPANSION}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_DARK,
    theme_color: THEME_DARK,
    categories: ["education", "science"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/192-maskable", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
