import { ImageResponse } from "next/og";
import { HaloMark } from "@/components/content/og/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon: full-bleed tile (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(<HaloMark size={180} maskable />, size);
}
