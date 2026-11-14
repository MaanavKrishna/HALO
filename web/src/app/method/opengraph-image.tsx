import { OG_CARDS, renderCard } from "@/components/content/og/cards";
import { OG_SIZE } from "@/components/content/og/render";

export const alt = OG_CARDS.method.alt;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderCard("method");
}
