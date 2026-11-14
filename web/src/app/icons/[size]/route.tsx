import { ImageResponse } from "next/og";
import { HaloMark } from "@/components/content/og/mark";

/** Web app manifest icons: 192 and 512, each as "any" (rounded tile) and "maskable" (full bleed, safe-zone mark). */
const VARIANTS = {
  "192": { px: 192, maskable: false },
  "512": { px: 512, maskable: false },
  "192-maskable": { px: 192, maskable: true },
  "512-maskable": { px: 512, maskable: true },
} as const;

type Variant = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  if (!Object.hasOwn(VARIANTS, size)) return new Response("Not found", { status: 404 });
  const v = VARIANTS[size as Variant];
  return new ImageResponse(<HaloMark size={v.px} maskable={v.maskable} />, { width: v.px, height: v.px });
}
