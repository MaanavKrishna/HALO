/**
 * Generated images (Open Graph cards and app icons) cannot read CSS custom
 * properties, so the dark-theme token values they need are mirrored here,
 * once. Keep in step with web/src/styles/tokens.css (dark branch).
 */
export const INK = {
  bgDeep: "#020409",
  bg: "#05080f",
  surface: "#0c1320",
  text1: "#eef2f8",
  text2: "#a3afc2",
  text3: "#8794aa",
  lineStrong: "#62738f",
  accent: "#7ea6ff",
  accentFill: "#3a66ff",
} as const;

/**
 * The HALO mark as an SVG: a limb-brightened ring (the microgravity flame
 * sheet) with a faint fuel droplet at its core, on a deep-ink tile.
 * `maskable` fills the square and keeps the mark inside the 80% safe zone.
 */
export function HaloMark({ size, maskable = false, tile = true }: { size: number; maskable?: boolean; tile?: boolean }) {
  // Small sizes get a firmer ring so the mark stays crisp at 32px.
  const small = size <= 48;
  const r = maskable ? 25 : 30;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={INK.accentFill} stopOpacity="0.32" />
          <stop offset="60%" stopColor={INK.accentFill} stopOpacity="0.1" />
          <stop offset="100%" stopColor={INK.accentFill} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ring" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={INK.accent} stopOpacity="0" />
          <stop offset="78%" stopColor={INK.accent} stopOpacity="1" />
          <stop offset="88%" stopColor={INK.text1} stopOpacity="0.9" />
          <stop offset="100%" stopColor={INK.accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={INK.text1} stopOpacity="0.95" />
          <stop offset="100%" stopColor={INK.text1} stopOpacity="0" />
        </radialGradient>
      </defs>
      {tile && <rect x="0" y="0" width="100" height="100" rx={maskable ? 0 : 22} fill={INK.bgDeep} />}
      <circle cx="50" cy="50" r={r * 1.6} fill="url(#glow)" />
      <circle cx="50" cy="50" r={r * 1.18} fill="url(#ring)" />
      <circle
        cx="50"
        cy="50"
        r={r * 0.94}
        fill="none"
        stroke={INK.accent}
        strokeWidth={small ? 7 : 3.2}
        strokeOpacity={small ? 1 : 0.95}
      />
      <circle cx="50" cy="50" r={small ? 7 : 5.5} fill="url(#core)" />
    </svg>
  );
}

