import type { SVGProps } from "react";

/**
 * Authored icon set: 20px grid, 1.5px stroke, round caps. Decorative by
 * default (aria-hidden); the control that holds an icon carries the name.
 */
const PATHS = {
  menu: "M3.5 7h13M3.5 13h13",
  close: "M5 5l10 10M15 5L5 15",
  arrowRight: "M4 10h12M11 5l5 5-5 5",
  external: "M8 4.5H4.5v11h11V12M11.5 4.5h4v4M15.5 4.5L9 11",
  sun: "M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5.05 5.05l1.06 1.06M13.89 13.89l1.06 1.06M5.05 14.95l1.06-1.06M13.89 6.11l1.06-1.06M13 10a3 3 0 11-6 0 3 3 0 016 0z",
  moon: "M15.5 12.2A6 6 0 017.8 4.5a6 6 0 107.7 7.7z",
  system: "M3.5 4.5h13v9h-13zM7.5 16.5h5M10 13.5v3",
  info: "M10 9v5M10 6.25v.01M17 10a7 7 0 11-14 0 7 7 0 0114 0z",
  warn: "M10 7.5v3.5M10 13.75v.01M8.7 3.6L2.6 14.3a1.5 1.5 0 001.3 2.2h12.2a1.5 1.5 0 001.3-2.2L11.3 3.6a1.5 1.5 0 00-2.6 0z",
  crit: "M10 6.5v4.5M10 13.75v.01M7.1 2.5h5.8l4.6 4.6v5.8l-4.6 4.6H7.1l-4.6-4.6V7.1z",
  check: "M4.5 10.5l3.5 3.5 7.5-8",
  github: "",
  plus: "M10 4v12M4 10h12",
  minus: "M4 10h12",
  copy: "M7 7h9v9H7zM4 13V4h9",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  if (name === "github") {
    return (
      <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" fill="currentColor" {...rest}>
        <path d="M10 1.8a8.2 8.2 0 00-2.6 16c.4.07.56-.18.56-.4v-1.4c-2.28.5-2.76-1.1-2.76-1.1-.37-.95-.91-1.2-.91-1.2-.75-.51.06-.5.06-.5.82.06 1.26.85 1.26.85.73 1.26 1.92.9 2.39.68.07-.53.29-.9.52-1.1-1.82-.21-3.74-.91-3.74-4.05 0-.9.32-1.63.85-2.2-.09-.21-.37-1.05.08-2.18 0 0 .69-.22 2.25.84a7.8 7.8 0 014.1 0c1.56-1.06 2.25-.84 2.25-.84.45 1.13.17 1.97.08 2.18.53.57.85 1.3.85 2.2 0 3.15-1.92 3.84-3.75 4.04.3.25.56.75.56 1.51v2.24c0 .22.15.48.57.4A8.2 8.2 0 0010 1.8z" />
      </svg>
    );
  }
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
