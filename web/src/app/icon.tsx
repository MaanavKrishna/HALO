import { ImageResponse } from "next/og";
import { HaloMark } from "@/components/content/og/mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: the halo mark on a deep-ink tile, drawn as a vector at native size. */
export default function Icon() {
  return new ImageResponse(<HaloMark size={32} />, size);
}
