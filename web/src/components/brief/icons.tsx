import type { SVGProps } from "react";

/**
 * Brief-only icons, drawn on the kit's 20px grid with the same 1.5px round
 * stroke as components/ui/Icon. Decorative: the control carries the name.
 */
const PATHS = {
  print: "M6 7.5V3.5h8v4M6 14.5H4a1.5 1.5 0 01-1.5-1.5V9A1.5 1.5 0 014 7.5h12A1.5 1.5 0 0117.5 9v4a1.5 1.5 0 01-1.5 1.5h-2M6 11.5h8v5H6z",
  link: "M8.5 11.5l3-3M9 5.5l1.4-1.4a3 3 0 014.3 4.3L13.3 9.8M11 14.5l-1.4 1.4a3 3 0 01-4.3-4.3L6.7 10.2",
  download: "M10 3.5v9m0 0l-3.5-3.5M10 12.5l3.5-3.5M4 16h12",
  arrowLeft: "M16 10H4m5-5l-5 5 5 5",
  sparkle: "M10 3v3.5M10 13.5V17M3 10h3.5M13.5 10H17M5.5 5.5l2 2M12.5 12.5l2 2M14.5 5.5l-2 2M7.5 12.5l-2 2",
  external: "M8 4.5H4.5v11h11V12M11.5 4.5h4v4M15.5 4.5L9 11",
  jump: "M10 4v12M5 11l5 5 5-5",
} as const;

export type BriefIconName = keyof typeof PATHS;

export function BriefIcon({ name, size = 18, ...rest }: { name: BriefIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
