import { ogFooter } from "@/components/content/og/cards";
import { OG_SIZE, renderOgImage } from "@/components/content/og/render";

export const alt = "HALO material screener: every NASA test of one material, measured against your habitat atmosphere.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Material screener",
    title: "Every test of one material, at your atmosphere",
    lede: "PSI test rows, Saffire flight results, smoke-detector runs and the distance to the nearest evidence.",
    footer: ogFooter(),
  });
}
