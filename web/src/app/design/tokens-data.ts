/** Token values shown on /design. Mirrors src/styles/tokens.css. */
export const COLOR_GROUPS: { title: string; note: string; tokens: { name: string; light: string; dark: string; use: string }[] }[] = [
  {
    title: "Canvas and surfaces",
    note: "Deep space ink, never pure black. Surfaces step up in lightness as they rise.",
    tokens: [
      { name: "--bg", light: "#f3f5f8", dark: "#05080f", use: "Page background" },
      { name: "--bg-deep", light: "#e9edf2", dark: "#020409", use: "Hero wells, footer" },
      { name: "--surface-1", light: "#ffffff", dark: "#0a101b", use: "Cards, inputs" },
      { name: "--surface-2", light: "#eaeef3", dark: "#101826", use: "Hover, tracks, wells" },
      { name: "--surface-3", light: "#dfe4eb", dark: "#172133", use: "Pressed, switch off" },
    ],
  },
  {
    title: "Text and lines",
    note: "text-2 clears 7:1 and text-3 clears 4.5:1 on every surface. border-strong clears 3:1 for control edges.",
    tokens: [
      { name: "--text-1", light: "#0a1220", dark: "#eef2f8", use: "Primary text" },
      { name: "--text-2", light: "#465269", dark: "#a3afc2", use: "Secondary text" },
      { name: "--text-3", light: "#5b6780", dark: "#7c89a0", use: "Labels, captions" },
      { name: "--border", light: "rgb(10 18 32 / .10)", dark: "rgb(160 185 230 / .12)", use: "Hairlines" },
      { name: "--border-strong", light: "#7a879b", dark: "#5b6c89", use: "Control edges" },
    ],
  },
  {
    title: "Flame blue",
    note: "The only brand colour. Links, selection, the primary action, good evidence, the halo.",
    tokens: [
      { name: "--accent", light: "#1f4fd6", dark: "#7ea6ff", use: "Accent text and fills" },
      { name: "--accent-ink", light: "#ffffff", dark: "#04101f", use: "Text on accent" },
      { name: "--accent-soft", light: "#e3eafc", dark: "rgb(126 166 255 / .13)", use: "Selected state" },
      { name: "--accent-glow", light: "rgb(31 79 214 / .22)", dark: "rgb(90 140 255 / .45)", use: "Light, never fill" },
      { name: "--focus", light: "#1f4fd6", dark: "#a9c4ff", use: "Focus ring" },
    ],
  },
  {
    title: "Status",
    note: "Amber and red-orange mean risk and nothing else. Green means covered or measured.",
    tokens: [
      { name: "--ok", light: "#0a7350", dark: "#4fd4a4", use: "Covered, measured" },
      { name: "--warn", light: "#8a5000", dark: "#f3b54d", use: "Caution, extrapolation" },
      { name: "--crit", light: "#b0321a", dark: "#ff7a5c", use: "Critical finding" },
      { name: "--idle", light: "#7a879b", dark: "#5b6c89", use: "No data" },
    ],
  },
];

export const TYPE_SCALE = [
  { cls: "type-display-xl", name: "display-xl", spec: "52 → 132px · 0.92 · −0.04em · Bricolage 600", sample: "Flame in freefall" },
  { cls: "type-display-l", name: "display-l", spec: "40 → 84px · 0.98 · −0.035em", sample: "A cited fire brief" },
  { cls: "type-display-m", name: "display-m", spec: "32 → 56px · 1.04 · −0.028em", sample: "Where the evidence runs out" },
  { cls: "type-headline", name: "headline", spec: "24 → 36px · 1.12 · −0.02em", sample: "Spread rate at 34% oxygen" },
  { cls: "type-title", name: "title", spec: "19 → 23px · 1.3 · Inter 600", sample: "Nearest NASA test" },
  { cls: "type-body-l", name: "body-l", spec: "17 → 20px · 1.55", sample: "In microgravity a flame has no buoyant plume, so it settles into a dim blue sphere." },
  { cls: "type-body", name: "body", spec: "16px · 1.6", sample: "Every number on the brief links to the test row it came from." },
  { cls: "type-body-s", name: "body-s", spec: "14px · 1.5", sample: "Ranges match the clamps applied when the brief parses the URL." },
  { cls: "type-caption", name: "caption", spec: "13px · 1.45", sample: "Source: NASA Physical Sciences Informatics, CC0." },
  { cls: "type-label", name: "label-caps", spec: "11px · mono 500 · +0.14em · uppercase", sample: "Atmosphere · O2 partial pressure" },
  { cls: "type-data", name: "mono-data", spec: "14px · Geist Mono · tabular, slashed zero", sample: "21.0 %  14.70 psia  10.0 cm/s" },
  { cls: "type-data-l", name: "mono-data-l", spec: "36 → 60px · tabular", sample: "34.0" },
] as const;

export const SPACE = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32] as const;
export const RADII = [
  { name: "xs", px: 4, use: "Kbd, code" },
  { name: "sm", px: 8, use: "Inputs, tooltips" },
  { name: "md", px: 12, use: "Callouts, icon buttons" },
  { name: "lg", px: 18, use: "Cards, panels, tables" },
  { name: "xl", px: 28, use: "Sheets, hero media" },
  { name: "pill", px: 999, use: "Buttons, chips, segmented" },
] as const;

export const MOTION = [
  { name: "--dur-instant", value: "100ms", use: "Press feedback" },
  { name: "--dur-fast", value: "160ms", use: "Hover, colour, toggles" },
  { name: "--dur-base", value: "240ms", use: "Menus, tooltips, tabs" },
  { name: "--dur-slow", value: "420ms", use: "Sheets, theme change" },
  { name: "--dur-reveal", value: "900ms", use: "Scroll reveal, hero" },
  { name: "--ease-out", value: "cubic-bezier(.23, 1, .32, 1)", use: "Enter, respond" },
  { name: "--ease-in-out", value: "cubic-bezier(.77, 0, .175, 1)", use: "Move on screen" },
  { name: "--spring", value: "linear(…) · damping 1.0", use: "Thumbs, indicators (400 / 600ms)" },
  { name: "--spring-bounce", value: "linear(…) · damping 0.8", use: "After a flick only (520ms)" },
] as const;
