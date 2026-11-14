import { ImageResponse } from "next/og";
import { OG_FONTS } from "./fonts";
import { HaloMark, INK } from "./mark";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Concentric evidence rings, tick dial and the halo orb, drawn for the OG card's right side. */
function OrbArt({ size }: { size: number }) {
  const C = 300;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const rings = [118, 160, 202, 244];
  return (
    <svg width={size} height={size} viewBox="0 0 600 600">
      <defs>
        <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={INK.accentFill} stopOpacity="0.42" />
          <stop offset="45%" stopColor={INK.accentFill} stopOpacity="0.14" />
          <stop offset="100%" stopColor={INK.accentFill} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="shell" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0b1634" stopOpacity="0.9" />
          <stop offset="62%" stopColor="#14306f" stopOpacity="0.55" />
          <stop offset="84%" stopColor={INK.accentFill} stopOpacity="0.85" />
          <stop offset="93%" stopColor={INK.accent} stopOpacity="1" />
          <stop offset="97%" stopColor="#d9e5ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={INK.accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="drop" cx="45%" cy="42%" r="55%">
          <stop offset="0%" stopColor={INK.text1} stopOpacity="1" />
          <stop offset="70%" stopColor={INK.text2} stopOpacity="0.6" />
          <stop offset="100%" stopColor={INK.text2} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r="300" fill="url(#bloom)" />
      <line x1={C} y1="10" x2={C} y2="590" stroke={INK.lineStrong} strokeOpacity="0.5" strokeDasharray="2 7" />
      <line x1="10" y1={C} x2="590" y2={C} stroke={INK.lineStrong} strokeOpacity="0.5" strokeDasharray="2 7" />
      {ticks.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const major = deg % 30 === 0;
        const r1 = 272;
        const r2 = major ? 286 : 280;
        return (
          <line
            key={deg}
            x1={C + r1 * Math.cos(a)}
            y1={C + r1 * Math.sin(a)}
            x2={C + r2 * Math.cos(a)}
            y2={C + r2 * Math.sin(a)}
            stroke={INK.lineStrong}
            strokeOpacity={major ? 0.9 : 0.45}
            strokeWidth="1.5"
          />
        );
      })}
      {rings.map((r, i) => (
        <circle
          key={r}
          cx={C}
          cy={C}
          r={r}
          fill="none"
          stroke={i === 0 ? INK.accent : INK.lineStrong}
          strokeOpacity={i === 0 ? 0.9 : 0.75 - i * 0.14}
          strokeWidth={i === 0 ? 2 : 1.5}
        />
      ))}
      <circle cx={C} cy={C} r="96" fill="url(#shell)" />
      <circle cx={C} cy={C} r="9" fill="url(#drop)" />
    </svg>
  );
}

/** The instrument grid: 64px cells, faint, fading toward the edges via an overlay. */
function Grid() {
  const lines = [];
  for (let x = 64; x < OG_SIZE.width; x += 64) lines.push(<line key={`v${x}`} x1={x} y1="0" x2={x} y2={OG_SIZE.height} />);
  for (let y = 64; y < OG_SIZE.height; y += 64) lines.push(<line key={`h${y}`} x1="0" y1={y} x2={OG_SIZE.width} y2={y} />);
  return (
    <svg width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", left: 0, top: 0 }}>
      <g stroke={INK.accent} strokeOpacity="0.06" strokeWidth="1">
        {lines}
      </g>
    </svg>
  );
}

/**
 * The branded 1200x630 card: dark theater well, instrument grid, the halo
 * orb on the right, eyebrow, title and lede on the left, and a footer line.
 */
export function renderOgImage({ eyebrow, title, lede, footer }: { eyebrow: string; title: string; lede: string; footer: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK.bgDeep,
          fontFamily: "Inter",
          color: INK.text1,
          overflow: "hidden",
        }}
      >
        <Grid />
        <div style={{ position: "absolute", right: -150, top: -10, display: "flex" }}>
          <OrbArt size={650} />
        </div>
        {/* Edge vignette so the grid fades, as in the site's heroes. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: `linear-gradient(90deg, ${INK.bgDeep} 0%, rgba(2,4,9,0.85) 38%, rgba(2,4,9,0) 62%)`,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px 56px",
            width: 760,
            height: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, color: INK.accent, fontSize: 20, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
              <div style={{ width: 28, height: 2, background: INK.accent, display: "flex" }} />
              {eyebrow}
            </div>
            <div style={{ marginTop: 34, fontSize: title.length > 34 ? 66 : 80, fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.035em", display: "flex" }}>
              {title}
            </div>
            <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.4, color: INK.text2, letterSpacing: "-0.005em", display: "flex", maxWidth: 640 }}>
              {lede}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <HaloMark size={44} tile={false} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: "0.04em" }}>HALO</div>
            <div style={{ display: "flex", width: 1, height: 26, background: INK.lineStrong, marginLeft: 6, marginRight: 6 }} />
            <div style={{ display: "flex", fontSize: 19, color: INK.text3, letterSpacing: "0.01em" }}>{footer}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
