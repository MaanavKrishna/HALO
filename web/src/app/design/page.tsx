import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Button,
  ButtonLink,
  Callout,
  Card,
  Chip,
  Divider,
  GradeBadge,
  GridLines,
  HaloOrb,
  Icon,
  IconButton,
  Kbd,
  PageHero,
  Panel,
  ProvenanceBadge,
  Reveal,
  RingsGraphic,
  SectionHeading,
  SiChip,
  Stat,
  StatGroup,
  StatusLight,
  TBody,
  THead,
  TableFrame,
  Td,
  Th,
  ThemeToggle,
  Tr,
  cx,
} from "@/components/ui";
import { PRESETS } from "@/lib/engine/presets";
import { HALO_DATA } from "@/lib/data/load";
import { FormDemo, LoadingDemo, MotionLab, NavigationDemo, Swatches } from "./Interactive";
import { COLOR_GROUPS, MOTION, RADII, SPACE, TYPE_SCALE } from "./tokens-data";

export const metadata: Metadata = {
  title: "Design system",
  alternates: { canonical: "/design" },
  description: "Tokens, type, motion and components of the HALO interface.",
};

const SECTIONS = [
  { id: "principles", label: "Principles" },
  { id: "colour", label: "Colour" },
  { id: "type", label: "Type" },
  { id: "space", label: "Space" },
  { id: "depth", label: "Depth" },
  { id: "motion", label: "Motion" },
  { id: "components", label: "Components" },
  { id: "forms", label: "Forms" },
  { id: "data", label: "Data" },
  { id: "signature", label: "Signature" },
] as const;

const fmt = new Intl.NumberFormat("en-US");

/**
 * Two rhythms so the page does not read as a template: "stack" (heading over
 * content) and "split" (sticky heading column beside the content).
 */
function Section({
  id,
  label,
  title,
  lede,
  layout = "stack",
  children,
}: {
  id: string;
  /** Data-carrying telemetry label (a count), never a category name. */
  label?: string;
  title: string;
  lede?: ReactNode;
  layout?: "stack" | "split";
  children: ReactNode;
}) {
  const heading = <SectionHeading id={`${id}-title`} eyebrow={label} title={title} lede={lede} />;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="section-y scroll-mt-[calc(var(--nav-h)+3.5rem)] border-t border-line first:border-t-0">
      {layout === "split" ? (
        <div className="container-wide grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+5rem)] lg:self-start">{heading}</div>
          <div className="flex min-w-0 flex-col gap-12">{children}</div>
        </div>
      ) : (
        <div className="container-wide flex flex-col gap-12">
          {heading}
          {children}
        </div>
      )}
    </section>
  );
}

function Specimen({ name, children, className }: { name: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <p className="type-label text-fg-3">{name}</p>
      {children}
    </div>
  );
}

/** The same sampler rendered in a forced theme: tokens resolve per element via light-dark(). */
function ThemeSample({ theme }: { theme: "dark" | "light" }) {
  return (
    <div data-theme={theme} className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line bg-canvas p-6 text-fg sm:p-8">
      <div className="relative flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="type-label text-fg-3">{theme === "dark" ? "Mission theater" : "Paper"}</span>
          <code className="font-mono text-[0.75rem] text-fg-3">data-theme=&quot;{theme}&quot;</code>
        </div>
        <p className="type-headline">Spread rate rises with oxygen.</p>
        <p className="text-fg-2">
          Nearest test: 34% O<sub>2</sub> at 8.2 psia. <ProvenanceBadge provenance="measured" /> <SiChip />
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Build a brief</Button>
          <Button size="sm" variant="secondary">
            Compare
          </Button>
          <Button size="sm" variant="ghost">
            Sources
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent">Selected</Chip>
          <Chip tone="ok">Covered</Chip>
          <Chip tone="warn">Extrapolated</Chip>
          <Chip tone="crit">Critical</Chip>
          <GradeBadge grade="B" size="sm" />
          <GradeBadge grade="D" size="sm" />
        </div>
        <Callout tone="warn" title="Outside the tested range">
          No NASA test sits within one step of this atmosphere.
        </Callout>
      </div>
    </div>
  );
}

export default function DesignPage() {
  const investigations = HALO_DATA.investigations.length;
  const rows = HALO_DATA.manifest.totalRows;
  return (
    <main>
      {/* ---------- Hero ---------- */}
      <PageHero
        size="cinematic"
        visual="orb"
        ringLabels={["A", "B", "C", "D", "F"]}
        titleId="ds-title"
        eyebrow="Design system, v1"
        title="Built like an instrument."
        lede="The tokens, type and parts behind HALO: a dark theme for exploring and a light paper theme for reading and print, with one flame-blue halo across both. The toggle offers System, Light and Dark."
        actions={
          <>
            <ThemeToggle showLabels />
            <ButtonLink href="#components" variant="secondary" size="sm" iconEnd={<Icon name="arrowRight" size={16} />}>
              Jump to components
            </ButtonLink>
          </>
        }
      />

      {/* ---------- Jump bar ---------- */}
      <nav aria-label="Design system sections" className="glass-chrome no-print sticky top-[var(--nav-h)] z-[var(--z-sticky)] border-b border-line">
        <ul className="container-wide flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block whitespace-nowrap rounded-[var(--radius-pill)] px-3 py-1.5 text-[0.8125rem] text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------- Principles ---------- */}
      <Section id="principles" title="Three influences, one instrument." lede="Each influence owns a layer, so they never compete.">
        <ol className="grid gap-px overflow-hidden rounded-[var(--radius-xl)] border border-line bg-line md:grid-cols-3">
          {[
            {
              k: "Theater",
              t: "The story is cinematic.",
              d: "Dark, immersive heroes; huge display type; light used as energy, once per view; narrative moments revealed on scroll.",
            },
            {
              k: "Material",
              t: "The surface is calm.",
              d: "Tight display tracking, generous body leading, frosted glass for floating chrome, soft depth, springs that can be interrupted.",
            },
            {
              k: "Instrument",
              t: "The data is exact.",
              d: "Tabular mono numerals, telemetry labels, grid lines and axis ticks, status lamps. Every number shows where it came from.",
            },
          ].map((p) => (
            <li key={p.k} className="flex flex-col gap-3 bg-surface-1 p-6 sm:p-8">
              <p className="type-label text-accent">{p.k}</p>
              <p className="type-title text-fg">{p.t}</p>
              <p className="text-fg-2">{p.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------- Colour ---------- */}
      <Section
        id="colour"
        label={`${COLOR_GROUPS.reduce((n, g) => n + g.tokens.length, 0)} colour tokens`}
        title="Colour"
        lede="Semantic tokens only; pages never use raw hex. Each is written once as light-dark(), so any element can take a theme with data-theme."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ThemeSample theme="dark" />
          <ThemeSample theme="light" />
        </div>
        <div className="grid gap-12 lg:grid-cols-2">
          {COLOR_GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-4">
              <div>
                <h3 className="type-title text-fg">{g.title}</h3>
                <p className="mt-1 text-sm text-fg-2">{g.note}</p>
              </div>
              <Swatches tokens={g.tokens} />
            </div>
          ))}
        </div>
        <Callout title="Risk colours are for risk">
          Amber (--warn) and red-orange (--crit) appear only on findings, grades D and F, and their callouts. Never on
          decoration, links, or brand moments. Green (--ok) only means covered or measured.
        </Callout>
      </Section>

      {/* ---------- Type ---------- */}
      <Section
        id="type"
        label={`${TYPE_SCALE.length} styles, 2 families`}
        layout="split"
        title="Type"
        lede="Inter for everything you read, with its optical-size axis cutting tighter at display sizes; Geist Mono for every number. Tracking tightens and leading closes as size grows."
      >
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {TYPE_SCALE.map((t) => (
            <li key={t.name} className="grid gap-3 py-6">
              <div className="flex flex-col gap-1">
                <code className="font-mono text-sm text-fg">{t.cls}</code>
                <span className="text-[0.8125rem] text-fg-3">{t.spec}</span>
              </div>
              <p className={cx(t.cls, "min-w-0 text-fg [overflow-wrap:anywhere]")}>{t.sample}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ---------- Space & radii ---------- */}
      <Section id="space" title="Space, grid and radii" lede="A 4-point scale. A 12-column grid from 1024px, 8 on tablets, 4 on a 390px phone. Nested radii step down one size.">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <Specimen name="Spacing (--space-n = n × 4px)">
            <ul className="flex flex-col gap-2">
              {SPACE.map((n) => (
                <li key={n} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
                  <code className="font-mono text-[0.8125rem] text-fg-2">space-{n}</code>
                  <span className="flex items-center gap-3">
                    <span className="h-2.5 max-w-[calc(100%-3rem)] shrink-0 rounded-[2px] bg-accent/70" style={{ width: `calc(var(--space-${n}) * 1.5)` }} />
                    <span className="font-mono text-[0.75rem] text-fg-3">{n * 4}px</span>
                  </span>
                </li>
              ))}
            </ul>
          </Specimen>
          <div className="flex flex-col gap-12">
            <Specimen name="Radii">
              <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                {RADII.map((r) => (
                  <li key={r.name} className="flex flex-col gap-2">
                    <span
                      className="aspect-square border border-line-strong bg-surface-2"
                      style={{ borderRadius: r.name === "pill" ? "999px" : `var(--radius-${r.name})` }}
                    />
                    <code className="font-mono text-[0.8125rem] text-fg">{r.name}</code>
                    <span className="text-[0.75rem] text-fg-3">{r.use}</span>
                  </li>
                ))}
              </ul>
            </Specimen>
            <Specimen name="Grid (grid-12)">
              <div className="grid-12 relative h-24 rounded-[var(--radius-md)] border border-line bg-surface-1 p-3">
                {Array.from({ length: 12 }, (_, i) => (
                  <span
                    key={i}
                    className={cx("rounded-[3px] bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)]", i >= 4 && "hidden md:block", i >= 8 && "md:hidden lg:block")}
                  />
                ))}
              </div>
            </Specimen>
            <Specimen name="Containers">
              <ul className="flex flex-col gap-1.5 font-mono text-[0.8125rem] text-fg-2">
                <li>container-narrow · 56rem · forms, articles with media</li>
                <li>container-page · 76rem · default pages</li>
                <li>container-wide · 90rem · heroes, nav, dashboards</li>
                <li>prose · 42rem (~68ch) · long-form text</li>
              </ul>
            </Specimen>
          </div>
        </div>
      </Section>

      {/* ---------- Depth ---------- */}
      <Section id="depth" title="Depth and materials" lede="Shadows always carry an offset and a soft blur. Glow is light from the flame, kept for the accent. Glass is only for chrome that floats over content.">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex aspect-[4/3] flex-col justify-end rounded-[var(--radius-lg)] bg-surface-1 p-4" style={{ boxShadow: `var(--elev-${n})` }}>
              <code className="font-mono text-sm text-fg">--elev-{n}</code>
              <span className="text-[0.8125rem] text-fg-3">{["Inputs, chips", "Cards, segmented thumb", "Popovers, toasts", "Sheets, dialogs"][n - 1]}</span>
            </div>
          ))}
        </div>
        <div className="theater-well relative isolate grid min-h-[22rem] place-items-center overflow-hidden rounded-[var(--radius-xl)] border border-line p-6 text-fg [--well-x:50%] [--well-y:50%]">
          <GridLines axes />
          <HaloOrb size={320} className="absolute" />
          <div className="relative grid w-full max-w-3xl gap-4 sm:grid-cols-2">
            <Card variant="glass">
              <p className="type-label text-fg-3">glass</p>
              <p className="mt-2 text-fg">blur 20px, saturate 170%, hairline border, inner highlight, elev-2.</p>
            </Card>
            <Card variant="solid" className="shadow-[var(--glow-2)]">
              <p className="type-label text-accent">--glow-2</p>
              <p className="mt-2 text-fg">An accent ring and soft light. For focus of attention, never for every card.</p>
            </Card>
          </div>
        </div>
      </Section>

      {/* ---------- Motion ---------- */}
      <Section id="motion" label={`${MOTION.length} motion tokens`} layout="split" title="Motion" lede="Purposeful and interruptible. UI motion stays under 300ms; springs are critically damped unless a gesture carried momentum. Everything stops under prefers-reduced-motion.">
        <div className="flex flex-col gap-12">
          <TableFrame caption="Motion tokens" className="max-w-full self-start">
            <THead>
              <tr>
                <Th>Token</Th>
                <Th>Value</Th>
                <Th>Use</Th>
              </tr>
            </THead>
            <TBody>
              {MOTION.map((m) => (
                <Tr key={m.name}>
                  <Td className="font-mono text-fg">{m.name}</Td>
                  <Td className="font-mono text-[0.8125rem]">{m.value}</Td>
                  <Td>{m.use}</Td>
                </Tr>
              ))}
            </TBody>
          </TableFrame>
          <MotionLab />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {["Reveal on scroll", "Rises 24px, sharpens from blur", "Once, 900ms, 60ms stagger"].map((t, i) => (
            <Reveal key={t} delay={i * 60}>
              <Card variant="outline">
                <p className="type-label text-fg-3">Reveal · {i + 1}</p>
                <p className="mt-2 text-fg">{t}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------- Components ---------- */}
      <Section id="components" title="Actions and surfaces">
        <div className="grid gap-12 lg:grid-cols-2">
          <Specimen name="Button: primary, secondary, ghost">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">Build a brief</Button>
              <Button variant="secondary" size="lg">
                Compare habitats
              </Button>
              <Button variant="ghost" size="lg">
                Cancel
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary" icon={<Icon name="copy" size={16} />}>
                Copy link
              </Button>
              <Button variant="ghost" iconEnd={<Icon name="arrowRight" size={16} />}>
                Read the method
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="sm" variant="secondary">
                Small
              </Button>
              <Button disabled>Disabled</Button>
              <LoadingDemo />
            </div>
          </Specimen>
          <Specimen name="IconButton, Kbd">
            <div className="flex flex-wrap items-center gap-3">
              <IconButton label="Show sections" variant="secondary">
                <Icon name="menu" />
              </IconButton>
              <IconButton label="Copy link" variant="secondary">
                <Icon name="copy" />
              </IconButton>
              <IconButton label="Close" size="sm">
                <Icon name="close" size={16} />
              </IconButton>
              <span className="ml-2 text-sm text-fg-2">
                Print the brief with <Kbd>⌘</Kbd> <Kbd>P</Kbd>
              </span>
            </div>
            <Specimen name="Chip, StatusLight">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>Neutral</Chip>
                <Chip tone="accent">Flame blue</Chip>
                <Chip tone="ok">Covered</Chip>
                <Chip tone="warn">Extrapolated</Chip>
                <Chip tone="crit">Critical</Chip>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <StatusLight status="ok" pulse />
                <StatusLight status="warn" />
                <StatusLight status="crit" />
                <StatusLight status="idle" />
              </div>
            </Specimen>
          </Specimen>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <p className="type-label text-fg-3">Card · solid</p>
            <p className="type-title mt-3 text-fg">One idea per card.</p>
            <p className="mt-2 text-fg-2">Never nest cards; divide inside with a hairline instead.</p>
          </Card>
          <Card variant="outline">
            <p className="type-label text-fg-3">Card · outline</p>
            <p className="type-title mt-3 text-fg">Quiet grouping.</p>
            <p className="mt-2 text-fg-2">For secondary content that should not compete.</p>
          </Card>
          <Card interactive>
            <p className="type-label text-fg-3">Card · interactive</p>
            <p className="type-title mt-3 text-fg">
              <a href="#signature">Signature visuals</a>
            </p>
            <p className="mt-2 text-fg-2">The whole card is the link target; it lifts and glows on hover.</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Panel label="Atmosphere" meta="Sample">
            <StatGroup>
              <Stat label="Oxygen" value={PRESETS.artemis.o2Pct.toFixed(1)} unit="%" provenance={<ProvenanceBadge provenance="measured" />} />
              <Stat label="Pressure" value={PRESETS.artemis.pressurePsia.toFixed(1)} unit="psia" provenance={<ProvenanceBadge provenance="assumed" />} />
              <Stat label="Flow" value={PRESETS.artemis.flowCmS.toFixed(1)} unit="cm/s" provenance={<ProvenanceBadge provenance="inferred" />} />
            </StatGroup>
            <p className="mt-4 text-[0.8125rem] text-fg-3">Sample: the Artemis Base preset. Provenance labels here are illustrative.</p>
          </Panel>
          <div className="flex flex-col gap-4">
            <Callout title="How to read the grade">The ring closes as the nearest NASA test gets closer to your habitat.</Callout>
            <Callout tone="warn" title="Extrapolated">
              The nearest test is far from these conditions.
            </Callout>
            <Callout tone="crit" title="Critical finding">
              Reserved for findings that change what a crew should do.
            </Callout>
          </div>
        </div>
      </Section>

      <Section id="forms" title="Forms and navigation" lede="Native inputs underneath every control, so keyboard, screen readers and autofill behave.">
        <FormDemo />
        <Divider label="Navigation" />
        <NavigationDemo />
      </Section>

      <Section id="data" layout="split" title="Data and provenance" lede="Numbers are mono and tabular, right-aligned in tables, and always carry where they came from.">
        <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <TableFrame caption="Reference atmospheres" maxHeight="22rem" className="self-start">
            <THead>
              <tr>
                <Th>Preset</Th>
                <Th numeric>
                  O<sub>2</sub> %
                </Th>
                <Th numeric>psia</Th>
                <Th numeric>cm/s</Th>
                <Th>Source</Th>
              </tr>
            </THead>
            <TBody>
              {Object.values(PRESETS).map((p) => (
                <Tr key={p.name}>
                  <Td className="text-fg">{p.name}</Td>
                  <Td numeric>{p.o2Pct.toFixed(1)}</Td>
                  <Td numeric>{p.pressurePsia.toFixed(1)}</Td>
                  <Td numeric>{p.flowCmS.toFixed(1)}</Td>
                  <Td>
                    <ProvenanceBadge provenance="literature" />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </TableFrame>
          <div className="flex flex-col gap-8">
            <Specimen name="ProvenanceBadge">
              <ul className="flex flex-col gap-2.5">
                {(["measured", "inferred", "assumed", "literature", "computed", "model", "si"] as const).map((p) => (
                  <li key={p}>
                    <ProvenanceBadge provenance={p} />
                  </li>
                ))}
              </ul>
            </Specimen>
            <Specimen name="GradeBadge (sm, md, lg)">
              <div className="flex flex-wrap items-center gap-4">
                {(["A", "B", "C", "D", "F"] as const).map((g) => (
                  <GradeBadge key={g} grade={g} />
                ))}
                <GradeBadge grade="A" size="lg" />
                <GradeBadge grade="C" size="sm" />
              </div>
            </Specimen>
            <Specimen name="SiChip inline">
              <p className="text-fg-2">
                Ignition is more likely here than on the ISS. <SiChip />
              </p>
            </Specimen>
          </div>
        </div>
        <Divider ticks />
        <p className="font-mono text-sm text-fg-3">
          {investigations} investigations · {fmt.format(rows)} test rows · live from the build data
        </p>
      </Section>

      <Section id="signature" title="The halo" lede="A flame in microgravity has no plume: it settles into a dim blue sphere, brightest at its rim. The orb is that flame; concentric rings are its graphic echo and the shape of the evidence chart.">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="theater-well relative isolate grid min-h-[26rem] place-items-center overflow-hidden rounded-[var(--radius-xl)] border border-line [--well-x:50%] [--well-y:50%]">
            <GridLines axes corners />
            <div className="grid w-[min(28rem,90%)] place-items-center">
              <RingsGraphic rings={6} active={3} labels={["0.5", "1", "2", "4", "8", "16"]} className="col-start-1 row-start-1" title="Concentric evidence rings, the fourth highlighted" />
              <HaloOrb size={170} fuel className="col-start-1 row-start-1" />
            </div>
          </div>
          <div className="flex flex-col justify-between gap-8 rounded-[var(--radius-xl)] border border-line bg-surface-1 p-6">
            <Specimen name="HaloOrb sizes: sm, md, lg">
              <div className="flex flex-wrap items-center gap-8">
                <HaloOrb size="sm" />
                <HaloOrb size="md" fuel />
              </div>
            </Specimen>
            <ul className="flex flex-col gap-2 text-sm text-fg-2">
              <li>Decorative only. Never encodes data.</li>
              <li>One orb per view. It is the light source of the page.</li>
              <li>Ignites once; breathing stops under reduced motion.</li>
              <li>Rings may encode data (the evidence chart) when titled.</li>
            </ul>
          </div>
        </div>
      </Section>
    </main>
  );
}
