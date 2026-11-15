import { ogFooter } from "@/components/content/og/cards";
import { OG_SIZE, renderOgImage } from "@/components/content/og/render";

export const alt = "HALO partial-gravity bounds: microgravity and Earth-gravity evidence around the untested Moon and Mars band.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Partial gravity",
    title: "Bounds, not predictions",
    lede: "What NASA tested in microgravity and at Earth gravity, and the Moon and Mars band in between that no PSI test reached.",
    footer: ogFooter(),
  });
}
