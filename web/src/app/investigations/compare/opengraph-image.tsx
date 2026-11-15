import { ogFooter } from "@/components/content/og/cards";
import { OG_SIZE, renderOgImage } from "@/components/content/og/render";

export const alt = "HALO: compare NASA microgravity combustion investigations side by side.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Compare investigations",
    title: "What each investigation tested, side by side",
    lede: "Hardware, fuels, oxygen, pressure and flow ranges, what varied, hazards and sensors, with the differences marked.",
    footer: ogFooter(),
  });
}
