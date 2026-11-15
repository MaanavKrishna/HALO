# HALO design system

The living reference is the `/design` route. This document is the rulebook behind it. Pages consume the system; they never invent colours, sizes or motion of their own.

## Direction

HALO is a mission theater for fire evidence. Three influences each own one layer, so they never compete:

| Influence | Owns | Shows up as |
|---|---|---|
| **Theater** (showcase demo) | The story | Immersive "theater well" heroes; huge display type; light used as energy, once per view; one narrative reveal per section, on scroll. |
| **Material** (Apple product UI) | The surface | Optical-size type with tight display tracking and generous body leading; lots of space; frosted glass for floating chrome only; soft offset shadows; rounded geometry; critically damped springs that can be interrupted. |
| **Instrument** (mission control) | The data | Tabular mono numerals; telemetry labels; grid lines, axes and tick marks; status lamps; every number carries its provenance. |

**Signature: the halo.** A flame in microgravity has no buoyant plume. It settles into a dim blue sphere whose flame sheet is a shell, so it is brightest at the rim. `HaloOrb` draws exactly that (with an optional fuel droplet at the core). Concentric rings (`RingsGraphic`) are its graphic echo and the shape of the brief's evidence chart. One orb per view; it is the page's light source.

**Not this:** gradient-blob SaaS, purple, gradient text, emoji, cards as the default container, glass as decoration, NASA logos or insignia.

## Themes

Dark-first "mission theater" for the app; a light "archival paper" theme (a warm neutral, not stock cool grey) for print/PDF and for anyone who prefers light. The toggle offers System / Light / Dark; System is the default, and the browser's `theme-color` follows a forced theme.

**Every section follows the theme.** Nothing scopes `data-theme="dark"` on a page any more: heroes, the landing's orb and evidence panels, the closing call to action, loading and error states all render in the reader's theme. (`/design` keeps its side-by-side theme samples, which exist to show both.)

**The theater well** (`theater-well` utility; `PageHero`, `BriefHeader`, the landing panels) is the hero ground in both themes:

- Dark: flat `--bg-deep` deep space, exactly as before.
- Light: an instrument-bone well (`--bg-deep`), lit from the orb side by a soft paper glow (`--well-glow`) and a faint flame-blue tint (`--well-tint`); place the light with `--well-x` / `--well-y`. The fine instrument grid stays at ink 4%.
- The orb on paper: a deep flame-blue shell, a white-hot inner rim and a soft blue bloom. Additive blending (`plus-lighter`) glows on ink but washes out on white, so `--halo-blend` switches the orb's bloom and rim to normal compositing in light (it follows the same theme resolution as `light-dark()`: OS, then forced or scoped theme). Rings, ticks and axes are ink (`--border-strong`) at low alpha.
- Risk marks inside a well keep >= 3:1 non-text contrast on the light ground (e.g. the detector blind-spot grid: `--crit` mark on `--crit-soft`, `--border-strong` cell edges).

- Every colour token is written once as `light-dark(light, dark)` in `web/src/styles/tokens.css`. `color-scheme` picks the branch.
- `html[data-theme="light" | "dark"]` forces a theme; no attribute follows the OS. The choice is stored in `localStorage["halo-theme"]` and applied by a tiny static inline script in `<head>` before first paint, so there is no flash.
- `data-theme` works on any element to scope a theme (the `/design` page shows both side by side). The token block is declared on `:root` and on `[data-theme]` because the build polyfills `light-dark()` with custom properties that resolve where they are declared.
- `prefers-reduced-transparency` makes glass solid; `prefers-contrast: more` firms lines and tertiary text.

## Colour tokens

Use the semantic names only. Raw hex in a page or component is a bug. Tailwind names are in brackets.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` (`canvas`) | #f4f3ef | #05080f | Page background. Deep space ink, never pure black; warm archival paper in light. |
| `--bg-deep` (`canvas-deep`) | #ebe9e3 | #020409 | Theater wells (instrument bone / deep space), footer. |
| `--surface-1` | #fcfbf8 | #0c1320 | Cards, inputs, tables. |
| `--surface-2` | #ebe9e3 | #141d2d | Hover, tracks, wells. |
| `--surface-3` | #e0ddd5 | #1e293c | Pressed, switch off. Each dark step is clearly lighter. |
| `--glass-bg` / `--glass-bg-strong` | paper 70% / 84% | ink 60% / 78% | Floating chrome only. |
| `--border` (`line`) | ink 12% | blue-grey 15% | Hairlines, dividers. |
| `--border-strong` (`line-strong`) | #757983 | #62738f | Control edges, switch tracks, selected thumbs (>= 3:1 on every surface). |
| `--grid-line` | ink 4% | blue 3.5% | Instrument grid (heroes and instrument panels only). |
| `--text-1` (`fg`) | #14161c | #eef2f8 | Primary text. |
| `--text-2` (`fg-2`) | #4a4e58 | #a3afc2 | Secondary text (>= 6:1). |
| `--text-3` (`fg-3`) | #585c66 | #8794aa | Labels, captions (>= 4.5:1 on every surface incl. surface-3). |
| `--accent` | #1f4fd6 | #7ea6ff | Flame blue text, links, selection marks. |
| `--accent-fill` | #2f5ff0 | #3a66ff | Primary button fill: saturated and luminous, with a soft glow. |
| `--accent-fill-hover` | #2a57e6 | #3360f8 | Primary hover. |
| `--accent-ink` | #ffffff | #ffffff | Text on accent fill (5.2:1 / 4.6:1). |
| `--accent-soft` / `--accent-line` | tint | tint | Selected backgrounds / accent hairlines. |
| `--accent-glow` | blue 24% | blue 50% | Light from the flame. Never a fill. |
| `--ok` | #0a7350 | #4fd4a4 | Covered / measured. |
| `--warn` | #8a5000 | #f3b54d | Caution, extrapolation, grades D and F. |
| `--crit` | #b0321a | #ff7a5c | Critical findings. |
| `--idle` | #757983 | #62738f | No data. |
| `--invalid` | #b4235f | #ff8fb8 | Form validation only (rose). |
| `--focus` | #1f4fd6 | #a9c4ff | Focus ring. |
| `--thumb`, `--fill-highlight` | white | near-white | Switch/slider thumbs; top edge of solid fills. |

The `/design` swatches read these values live from the CSS, so the page cannot drift from `tokens.css`.

Each semantic colour also has `-soft` (background) and `-line` (border) variants. Legacy names (`--paper`, `--surface`, `--ink`, `--muted`, `--rule`, `--rule-strong`, `--flame`, `--flame-ink`, `--flame-soft`, `--amber`, `--amber-soft`) are aliases kept for pages written before this system; new code uses the semantic names.

### Colour rules

1. **Flame blue is the only brand colour.** One accent family, used for action, selection and good evidence.
2. **Risk colours are for risk.** `--warn` and `--crit` appear only on risk findings, grades D/F and their callouts. Never on links, decoration, brand moments or "attention" UI.
3. **Green means covered or measured,** nothing else (not "success" confetti, not "go").
4. **Rose (`--invalid`) means invalid input,** nothing else. Form errors never borrow the risk colours; they pair rose with an icon and text that names the fix.
5. **Colour is never the only signal.** Status lamps have a shape per state and a label; provenance markers have a shape per source; callouts have an icon and a screen-reader prefix.
6. **Copy never says "safe" or "unsafe".** Grades describe evidence, not habitats.

## Type

Two self-hosted families via `next/font/google` (downloaded at build; the CSP needs no font origin), two variable files in total:

- **Inter** (`font-display`, `font-sans`): everything you read. Its optical-size axis (14–32) gives an SF-like split: display sizes use `opsz 32` (tighter, crisper), body uses the text cut automatically (`font-optical-sizing: auto`). No width squeeze.
- **Geist Mono** (`font-mono`): every number, unit, code and telemetry label. Tabular by construction; `type-data` adds slashed zero.

Fluid sizes run from a 320px phone to a 1440px desktop (`clamp()` with a `vw` slope). Display sizes are also capped by viewport height (`svh`), so a short laptop screen (1366×600) keeps the hero's actions above the fold. Past ~1920px the root size itself grows (16px → 18.75px at 2560px), so type, space and containers scale together on ultrawide screens. Tracking tightens and leading closes as size grows.

| Utility | Size | Leading | Tracking | Face |
|---|---|---|---|---|
| `type-display-xl` | 44 → 132px (≤ 15svh) | 0.95 | −0.022em | Inter 650, opsz 32 |
| `type-display-l` | 36 → 84px (≤ 12svh) | 1.0 | −0.018em | Inter 650, opsz 32 |
| `type-display-m` | 32 → 56px | 1.06 | −0.012em | Inter 600, opsz 32 |
| `type-headline` | 24 → 36px | 1.12 | −0.01em | Inter 600, opsz 28 |
| `type-title` | 19 → 23px | 1.3 | −0.012em | Inter 600 |
| `type-body-l` | 17 → 20px | 1.55 | −0.006em | Inter |
| `type-body` | 16px | 1.6 | 0 | Inter |
| `type-body-s` | 14px | 1.5 | 0 | Inter |
| `type-caption` | 13px | 1.45 | +0.004em | Inter |
| `type-label` (label-caps) | 11px | 1.3 | +0.14em, uppercase | Geist Mono 500 |
| `type-data` (mono-data) | 14px | 1.4 | −0.01em | Geist Mono, tabular, slashed zero |
| `type-data-l` | 36 → 60px | 1 | −0.045em | Geist Mono, tabular |

Rules: one `display-xl` per page at most (landing hero). Headings balance (`text-wrap: balance`), paragraphs use `pretty`. Body measure 60–70ch; `.prose-halo` caps at 42rem. Telemetry labels are captions for data (a unit, a code, a status, a count); do not put one above every heading.

## Space, layout, radii

- **Spacing:** 4-point base. `--space-1 … --space-32` (4 → 128px); Tailwind's default spacing scale is the same 4px step. `--section-y` (64 → 144px) separates page sections; `--gutter` (20 → 40px) is the page side padding.
- **Containers:** `container-narrow` 56rem, `container-page` 76rem, `container-wide` 90rem (nav, heroes, dashboards), prose 42rem.
- **Grid:** `grid-12`: 4 columns on phones, 8 from 768px, 12 from 1024px.
- **Breakpoints:** Tailwind defaults (sm 640, md 768, lg 1024, xl 1280). 390px is a first-class target: design it first, never let it scroll sideways.
- **Responsive rules** (checked by `tests/e2e/responsive.spec.ts` at 320, 768, 1024, 1440 and 2560px in both themes):
  - No horizontal scroll at any width from 320px up. Grids use `minmax(0, 1fr)` tracks; long tokens (`PSI-20`, dates) never wrap mid-token.
  - Tablets (768–1023px) get real two-column layouts; card rows of five go 1 → 2 → 3 → 5 columns.
  - `Stat` readouts scale with their cell (container units), so a long value fits a narrow cell; `StatGroup` puts three or four readouts in one row from sm, never a 3 + 1 orphan.
  - Segmented controls with four or more options fold into a 3-column tray below 30rem; the preset picker does the same below 640px.
  - Hero visuals sit behind the text, dimmed, below 1024px; side by side from 1024px; on ultrawide they anchor to the content column rather than the window edge.
  - Touch targets are at least 40px on coarse pointers (`pointer-coarse:` on small buttons, segmented options, chips).
- **Radii:** `xs` 4 (kbd, code), `sm` 8 (inputs, tooltips), `md` 12 (callouts, icon buttons), `lg` 18 (cards, panels, tables), `xl` 28 (sheets, hero media), `pill` (buttons, chips, segmented). A nested surface uses the next size down.

## Depth and materials

- **Elevation:** `--elev-1` (inputs, chips) … `--elev-4` (sheets). Always an offset plus soft blur; stronger in dark mode.
- **Glow:** `--glow-1/2` (accent ring + soft light) for the one thing that should draw the eye; `--glow-3` for the orb's ambient light. Never on every card.
- **Glass recipe (`glass`, `glass-strong`):** translucent surface + `backdrop-filter: blur(20px) saturate(170%)` + `--hairline` border + inner top highlight + elevation. For chrome that floats over content (nav, menu sheet, tooltips, cards over the orb). Never stack glass on glass.
- **Grid (`bg-grid`, `GridLines`):** 64px instrument grid at very low contrast, masked to fade at the edges. Only in heroes and instrument panels (orb, charts); never as page wallpaper or behind reading text.
- **Glass chrome (`glass-chrome`):** the bar recipe without border/shadow for nav, sticky sub-bars and table heads. All glass respects `prefers-reduced-transparency`.

## Motion

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 100ms | Press feedback (`scale(0.97)` on `:active`). |
| `--dur-fast` | 160ms | Hover, colour, small toggles. |
| `--dur-base` | 240ms | Menus, tooltips, tabs. |
| `--dur-slow` | 420ms | Sheets, theme change. |
| `--dur-reveal` | 900ms | Scroll reveals, hero entrance. |
| `--ease-out` | cubic-bezier(.23, 1, .32, 1) | Enter, respond. Default. |
| `--ease-in-out` | cubic-bezier(.77, 0, .175, 1) | Move on screen. |
| `--ease-drawer` | cubic-bezier(.32, .72, 0, 1) | Sheets. |
| `--spring` + `--spring-dur-snappy/smooth` | `linear()` sample of damping 1.0, response 0.3 / 0.45 | Thumbs, indicators, anything that tracks state. 400 / 600ms. |
| `--spring-bounce` + `--spring-dur-bounce` | damping 0.8, response 0.4 | Only after a gesture that carried momentum. 520ms. |

Rules:

1. Every animation has a reason: feedback, state change, spatial continuity, or the one narrative moment of a section.
2. UI motion stays under 300ms. Never animate keyboard-initiated repetitive actions.
3. Use transitions (interruptible) for UI state; keyframes only for one-off entrances and ambient loops.
4. Animate `transform`, `opacity`, `filter`, `clip-path`. Never layout properties.
5. Popovers grow from their trigger (`transform-origin`); the mobile menu grows from the top-right button.
6. Hover effects only matter on fine pointers; press feedback works everywhere.
7. `Reveal` (IntersectionObserver, once): rise 24px + un-blur, 900ms, 40–80ms stagger. Use for narrative moments, not every block. **Never wrap above-the-fold or hero content in Reveal.** A CSS failsafe shows unrevealed content after 2.5s.
8. **Hero choreography (once):** the orb ignites (0–1.6s), the rings draw in (from 0.5s, innermost first), then eyebrow, headline, lede and actions settle (0.6–1s). Nothing else on the page auto-animates.
9. Ambient motion: the orb flickers slowly and asymmetrically and its turbulence veil turns (48s); the ring dial turns (140s) on its own composited layer and pauses off-screen. `will-change` is set only while these run.
10. **Reduced motion:** all transitions and animations collapse to 0ms; reveals and hero text render visible; the orb is static; the rings neither draw nor turn. The hidden reveal state only exists when `(scripting: enabled) and (prefers-reduced-motion: no-preference)`.

## Components

All in `web/src/components/ui/`, exported from `@/components/ui`. Typed props, native elements underneath.

| Component | Use | Don't |
|---|---|---|
| `Button` (`primary`/`secondary`/`ghost`, `sm`/`md`/`lg`, `loading`, `icon`, `iconEnd`) | One primary per view; secondary for alternatives; ghost for low emphasis. `loadingLabel` names the pending state ("Generating brief…"). | Two primaries side by side; colour buttons with risk tones. |
| `ButtonLink` | Navigation that looks like an action ("Build a brief"). | Wrapping a `Button` in a link. |
| `IconButton` (`label` required) | Toolbar actions; 40px hit area. | Icon-only actions without a label. |
| `Card` (`solid`/`glass`/`outline`, `interactive`) | One idea per card. `interactive` makes the first link cover the card, adds lift + glow, and shows a `--focus` outline on the card when its link has keyboard focus. | Nesting cards; cards as the default page structure. |
| `SectionHeading`, `Eyebrow`, `Panel` | Section opener with optional telemetry label, title, lede, actions. `Panel` is a console module with a labelled header strip. | An eyebrow that repeats the heading. |
| `Stat`, `StatGroup` | Instrument readouts (label, mono value, unit, provenance slot). `Stat` must sit inside `StatGroup` (a `<dl>`). | Decorative "big number" heroes without a source. |
| `StatusLight` (`ok`/`warn`/`crit`/`idle`, `pulse`) | Coverage and risk status. Shape + label per state. At most one pulsing lamp per view. | Status colour for non-status meaning. |
| `Chip` (tones) / `ToggleChip` | Static tags / multi-select filters (real checkboxes). | Risk tones on non-risk tags. |
| `Segmented` | 2–5 mutually exclusive views of the same thing; native radios, sliding thumb. | When each option owns a panel (use `Tabs`). |
| `Tabs` | ARIA tabs, arrow/Home/End keys, roving tabindex. | Page navigation. |
| `NumberField`, `SliderField`, `Switch`, `Field` | Labelled inputs with unit suffix, live `<output>` and `aria-valuetext` with unit, hint/error wiring (`describedBy`). Errors use `--invalid` + icon and name the fix. | Placeholder as label; error by colour alone. |
| `Callout` (`info`/`warn`/`crit`, `live`) | Inline context or risk finding; icon shape + SR prefix carry the tone. | Warn/crit for anything that is not risk. |
| `Tooltip` | Supplementary help; own trigger button; hover (350ms delay), focus, click/tap opens (never toggles shut); the tip is hoverable and stays open over trigger or tip (WCAG 1.4.13); Escape or outside tap closes; text is the trigger's description. `align="end"` near the right edge. | Required information. |
| `TableFrame`, `THead`, `TBody`, `Tr`, `Th`, `Td` | Data tables with sticky glass header, horizontal scroll on phones, `numeric` cells right-aligned mono. | Layout. |
| `Kbd`, `Divider` (`label`, `ticks`), `GridLines` (`axes`, `corners`) | Keys; hairline separators; instrument backdrop. | Ticks/grids as wallpaper. |
| `HaloOrb` (`sm`/`md`/`lg`/`xl` or px, `fuel`, `animate`) | The signature visual; decorative, `aria-hidden`. | More than one per view; encoding data. |
| `RingsGraphic` (`rings`, `active`, `labels`, `spin`, `drawIn`, `maskInner`, `title`) | Concentric ring language; becomes an `img` with `title`. | Implying measured data without a title and source. |
| `Reveal` (`delay`, `as`) | Scroll reveal wrapper. | Wrapping every block. |
| `PageHero` (`eyebrow`, `title`, `lede`, `actions`, `visual` orb/rings, `ringLabels`, `size` cinematic/page, `meta`) | Page opener; a theater well in the reader's theme, with the choreographed entrance. `cinematic` for the landing page and the styleguide only. | Stacking a second hero. |
| `Article` (`toc`) / `Prose` | Long-form pages (Method, Data, About): sticky "On this page" list on desktop, disclosure on phones, `prose-halo` column. Headings inside need the `toc` ids. | Dense data tables inside prose without `TableFrame`. |
| `Navbar` | Sticky glass bar: Findings, Explore, Compare, Method, Data, About, plus the "Build a brief" CTA (`/build`). Below 1024px a glass sheet (modal: rest of page inert, Tab cycles inside, Escape closes, focus returns to the button) with theme toggle. | Adding links without updating `site.ts`. |
| `Footer` | Product / Science / Project columns, theme toggle, the required NASA disclaimer. No decorative wordmark. | Removing the disclaimer. |
| `ThemeToggle`, `setTheme` | System / Light / Dark radio group (arrow keys, 40px targets, selected thumb outlined >= 3:1). | Reading `localStorage` elsewhere. |
| `ProvenanceBadge({ provenance })` | Measured (green filled dot), inferred (half), assumed (hollow), literature (square), model (dashed diamond), computed (solid-border diamond), `si` renders `SiChip`. Help text in the accessible name. | Colour without the label. |
| `SiChip()` | Dashed "SI" chip on every SI-written sentence; accessible name "SI-generated from the cited facts; …". | Omitting it from any SI sentence. |
| `GradeBadge({ grade, size })` | Grade letter in a ring whose closure shrinks A → F; A/B flame blue with glow, C neutral, D/F warn. | Calling a grade a safety verdict. |

Navigation data (links, footer groups, external URLs, disclaimer) lives in `components/ui/site.ts`.

## Accessibility

- Text meets WCAG AA in both themes (most pairs exceed AAA); control edges ≥ 3:1. Checked for every text token on every surface.
- Every input has a visible label; groups use `fieldset`/`legend`; hints and errors are linked with `aria-describedby`; focus moves to the first invalid field on submit.
- Toggle chips are checkboxes, switches are `role="switch"` checkboxes, segmented controls are native radios, the theme toggle is a radiogroup with arrow keys, tabs follow the ARIA tabs pattern.
- A 2px `--focus` outline on `:focus-visible` everywhere; inputs add a soft accent ring. Skip link precedes the nav.
- The mobile menu is modal: the page behind is `inert` and does not scroll, Tab stays inside, and Escape, outside tap, route change or a link closes it and returns focus to its button.
- Pages with a sticky bottom action bar mark it `data-sticky-action`; `scroll-padding-bottom` (from `--sticky-action-h`) keeps focused fields clear of it (WCAG 2.4.11).
- Non-text contrast: switch tracks, segmented and theme-toggle thumbs, and control edges reach 3:1 against what surrounds them.
- Hit areas are at least 40px for icon buttons, nav controls, small buttons, segmented options and chips on touch (coarse pointers).
- Decorative visuals (`HaloOrb`, untitled `RingsGraphic`, `GridLines`) are `aria-hidden`.
- Reduced motion, reduced transparency and increased contrast preferences are honoured (see Motion and Themes).
- Browser surfaces are themed: selection, caret, scrollbars, accent-color, tabular numerals.

## Print

The Fire Brief prints on white with the light tokens, whatever the screen theme:

- `@media print` forces `color-scheme: light` and pure white/black text tokens; removes elevation and glow; flattens glass to white; hides `.no-print` (nav, footer, TOC); renders reveals visible; hides the orb's bloom.
- Figures, tables and cards (`[data-print-keep]`) avoid page breaks inside; long sections may break. A4 with 14mm margins; 10.5pt base.
- `--bg-deep`, `--surface-2/3` print as white; glows and accent light are removed.
- Provenance markers and status lamps are shape-coded, so they read in greyscale.

## Fidelity

Everything ships sharp on retina and beyond.

- **Vector first.** Icons (`Icon`, an authored 20px-grid SVG set), the logo mark, `HaloOrb` (CSS gradients), `RingsGraphic` and charts are SVG/CSS. No raster icons or logos.
- **Raster only when it must exist** (photos): `next/image` with explicit `sizes`, AVIF/WebP, 2x/3x sources, never upscaled; keep each image under ~200 KB at 2x and the page's image budget under ~1 MB.
- **Hairlines:** `--hairline` is 1px, and 0.5px on 2x+ screens, for dividers and glass edges, so rules render as one device pixel.
- **Type:** font smoothing on, `font-optical-sizing: auto`, tabular numerals for data. No fractional translates on text at rest; animated text settles to `translate: 0`.
- **Compositing:** `will-change` only on elements that are actually animating (ring dial, orb turbulence).
- **Verification:** screenshots are taken at deviceScaleFactor 2 (390px and 1440px, light and dark, plus reduced motion). Tall pages are captured in viewport tiles and stitched, because Chrome cannot capture more than ~16k device pixels in one shot.
