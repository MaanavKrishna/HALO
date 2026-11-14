"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Chip";
import { Field, describedBy } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { Switch } from "@/components/ui/Switch";
import { cx } from "@/components/ui/cx";
import { MATERIALS } from "@/lib/engine/materials";
import { PRESETS } from "@/lib/engine/presets";
import { habitatToQuery } from "@/lib/engine/url";
import type { DetectorId, Habitat, MaterialId } from "@/lib/engine/types";
import { PresetBar, type PresetId } from "./PresetBar";

// Accepted ranges; they match the clamps applied when /brief parses the URL.
const LIMITS = {
  o2: { min: 0, max: 100, step: 0.1, slider: 1, label: "O2", unit: "%" },
  p: { min: 0.5, max: 20, step: 0.1, slider: 0.1, label: "Pressure", unit: "psia" },
  f: { min: 0, max: 50, step: 0.5, slider: 0.5, label: "Flow", unit: "cm/s" },
} as const;
type NumKey = keyof typeof LIMITS;

interface Draft {
  name: string;
  o2: string;
  p: string;
  f: string;
  materials: MaterialId[];
  ionization: boolean;
  liquids: boolean;
}

const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];
const INITIAL: PresetId = "artemis";
const PRESET_NAMES = new Set(Object.values(PRESETS).map((p) => p.name));

/** O2 partial pressure (O2 fraction × total pressure), as the brief computes it. */
const ppO2 = (o2: number, p: number) => Number(((o2 / 100) * p).toFixed(2));
const ISS_PPO2 = ppO2(PRESETS.iss.o2Pct, PRESETS.iss.pressurePsia);

/** Changing any value of a loaded preset marks the name as modified. */
function applyEdit(d: Draft, patch: Partial<Draft>): Draft {
  const next = { ...d, ...patch };
  if (!("name" in patch) && PRESET_NAMES.has(d.name.trim())) next.name = `${d.name.trim()} (modified)`;
  return next;
}

function fromHabitat(h: Habitat): Draft {
  return {
    name: h.name,
    o2: String(h.o2Pct),
    p: String(h.pressurePsia),
    f: String(h.flowCmS),
    materials: [...h.materials],
    ionization: h.detectors.includes("ionization"),
    liquids: h.liquids,
  };
}

function checkNumber(key: NumKey, raw: string): string | null {
  const { min, max, label, unit } = LIMITS[key];
  if (raw.trim() === "") return `Enter ${label === "O2" ? "an O2 level" : `a ${label.toLowerCase()}`}.`;
  const v = Number(raw);
  if (!Number.isFinite(v)) return `${label} must be a number.`;
  if (v < min || v > max) return `${label} must be between ${min} and ${max}${unit === "%" ? "" : " "}${unit}.`;
  return null;
}

const asNumber = (raw: string) => {
  const v = Number(raw);
  return raw.trim() !== "" && Number.isFinite(v) ? v : null;
};

export function HabitatForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => fromHabitat(PRESETS[INITIAL]));
  const [preset, setPreset] = useState<PresetId | null>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const errors: Partial<Record<NumKey | "materials", string>> = {};
  for (const k of Object.keys(LIMITS) as NumKey[]) {
    const e = checkNumber(k, draft[k]);
    if (e) errors[k] = e;
  }
  if (draft.materials.length === 0) errors.materials = "Pick at least one cabin material.";
  const showErr = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);

  // Back/forward cache restores the page with the button still locked.
  useEffect(() => {
    const reset = () => setPending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  function edit(patch: Partial<Draft>) {
    setDraft((d) => applyEdit(d, patch));
    setPreset(null);
  }

  function selectPreset(id: PresetId) {
    setDraft(fromHabitat(PRESETS[id]));
    setPreset(id);
    setSubmitted(false);
    setAnnounce(`${PRESETS[id].name} loaded. Review the values, then generate the brief.`);
  }

  function toggleMaterial(id: MaterialId, on: boolean) {
    const next = on ? [...draft.materials, id] : draft.materials.filter((m) => m !== id);
    // Keep the canonical order so equal habitats give equal URLs.
    edit({ materials: MATERIAL_IDS.filter((m) => next.includes(m)) });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const first = Object.keys(errors)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    const detectors: DetectorId[] = draft.ionization ? ["scatter", "ionization"] : ["scatter"];
    const habitat: Habitat = {
      name: draft.name.trim() || "Custom habitat",
      o2Pct: Number(draft.o2),
      pressurePsia: Number(draft.p),
      flowCmS: Number(draft.f),
      materials: draft.materials,
      detectors,
      liquids: draft.liquids,
    };
    setPending(true);
    // Unlock if navigation never completes (offline, route error).
    window.setTimeout(() => setPending(false), 8000);
    router.push(`/brief?${habitatToQuery(habitat)}`);
  }

  const o2 = asNumber(draft.o2);
  const p = asNumber(draft.p);
  const pp = o2 !== null && p !== null ? ppO2(o2, p) : null;
  const ppPct = pp !== null ? Math.min(100, (pp / Math.max(pp, ISS_PPO2 * 2)) * 100) : 0;
  const issPct = (ISS_PPO2 / Math.max(pp ?? 0, ISS_PPO2 * 2)) * 100;
  const nMat = draft.materials.length;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-label="Habitat" className="flex flex-col gap-10">
      <PresetBar active={preset} onSelect={selectPreset} />
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <Module legend="Atmosphere" className="lg:col-span-7">
          <div className="flex flex-col gap-8">
            <Channel
              k="o2"
              label={
                <>
                  Oxygen, O<sub>2</sub>
                </>
              }
              sliderLabel="O2 percent slider"
              draft={draft}
              error={showErr("o2")}
              onChange={(v) => edit({ o2: v })}
            />
            <Channel k="p" label="Total pressure" sliderLabel="Pressure slider" draft={draft} error={showErr("p")} onChange={(v) => edit({ p: v })} />
            <Channel k="f" label="Cabin air flow" sliderLabel="Flow slider" draft={draft} error={showErr("f")} onChange={(v) => edit({ f: v })} />

            {/* Derived readout: what the flame actually breathes. */}
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="type-label text-fg-3">
                  O<sub>2</sub> partial pressure
                </p>
                <ProvenanceBadge provenance="model" />
              </div>
              <p className="mt-2 flex items-baseline gap-1.5 text-fg">
                <output aria-live="off" className="font-mono text-[1.75rem] leading-none tracking-[-0.04em]">
                  {pp ?? "–"}
                </output>
                <span className="font-mono text-sm text-fg-2">psia</span>
              </p>
              <div aria-hidden="true" className="relative mt-4 h-1.5 rounded-full bg-surface-3">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-[var(--dur-base)] ease-out"
                  style={{ width: `${ppPct}%` }}
                />
                <span className="absolute -top-1 bottom-[-4px] w-px bg-fg-2" style={{ left: `${issPct}%` }} />
              </div>
              <p className="type-caption mt-2 text-fg-2">
                O<sub>2</sub> fraction × total pressure. Tick: ISS air, <span className="font-mono">{ISS_PPO2} psia</span>.
              </p>
            </div>
          </div>
        </Module>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5 lg:gap-6">
          <Module
            legend="Cabin materials"
            meta={`${nMat} selected`}
            describedById={showErr("materials") ? "materials-error" : "materials-hint"}
          >
            <p id="materials-hint" className="type-body-s mb-4 text-fg-2">
              What could burn or smoke in the cabin.
            </p>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_IDS.map((id, i) => (
                <ToggleChip
                  key={id}
                  data-field={i === 0 ? "materials" : undefined}
                  checked={draft.materials.includes(id)}
                  onChange={(e) => toggleMaterial(id, e.target.checked)}
                >
                  {MATERIALS[id].label}
                </ToggleChip>
              ))}
            </div>
            {showErr("materials") && (
              <p id="materials-error" className="mt-3 flex items-start gap-1.5 text-sm text-invalid">
                <Icon name="invalid" size={16} className="mt-[2px] shrink-0" />
                {showErr("materials")}
              </p>
            )}
          </Module>

          <Module legend="Smoke detectors">
            <div className="flex flex-col divide-y divide-[var(--border)]">
              <Switch
                className="pb-4"
                label="ISS-style photoelectric"
                description="Always on; the reference detector."
                checked
                readOnly
                disabled
              />
              <Switch
                className="pt-4"
                label="Ionization"
                description="Adds a second channel to the what-if."
                checked={draft.ionization}
                onChange={(e) => edit({ ionization: e.target.checked })}
              />
            </div>
          </Module>

          <Module legend="Liquid fuels">
            <Switch
              label="Liquid fuels on board"
              description="Adds the droplet extinction evidence."
              checked={draft.liquids}
              onChange={(e) => edit({ liquids: e.target.checked })}
            />
          </Module>

          <Module legend="Brief label">
            <Field label="Habitat name" htmlFor="habitat-name" hint="Printed at the top of the brief.">
              <input
                id="habitat-name"
                aria-describedby="habitat-name-hint"
                data-field="name"
                className="field-input"
                type="text"
                maxLength={60}
                autoComplete="off"
                placeholder="Custom habitat"
                value={draft.name}
                onChange={(e) => edit({ name: e.target.value })}
              />
            </Field>
          </Module>
        </div>
      </div>

      <div
        data-sticky-action=""
        className="glass-chrome sticky bottom-0 z-[2] -mx-[var(--gutter)] border-t border-line px-[var(--gutter)] py-3 sm:py-4"
      >
        <div className="flex items-center justify-between gap-4">
          <dl aria-label="Habitat summary" className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[0.75rem] tabular-nums sm:text-[0.8125rem]">
            <Readout label={<>O<sub>2</sub></>} value={draft.o2 ? `${draft.o2}%` : "–"} />
            <Readout label="P" value={draft.p ? `${draft.p} psia` : "–"} />
            <Readout label={<>ppO<sub>2</sub></>} value={pp !== null ? `${pp} psia` : "–"} accent />
            <Readout
              label="Cabin"
              value={`${nMat} ${nMat === 1 ? "material" : "materials"}`}
              className="hidden sm:flex"
            />
          </dl>
          <Button type="submit" size="lg" loading={pending} loadingLabel="Generating brief…" className="shrink-0 max-sm:h-11 max-sm:px-5">
            Generate brief
          </Button>
        </div>
      </div>
    </form>
  );
}

function Readout({ label, value, accent, className }: { label: ReactNode; value: string; accent?: boolean; className?: string }) {
  return (
    <div className={cx("flex items-baseline gap-1.5", className)}>
      <dt className="text-fg-3">{label}</dt>
      <dd className={accent ? "text-accent" : "text-fg"}>{value}</dd>
    </div>
  );
}

/** Console module: a fieldset whose legend is the panel's header strip. */
function Module({
  legend,
  meta,
  describedById,
  className,
  children,
}: {
  legend: string;
  meta?: ReactNode;
  describedById?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      aria-describedby={describedById}
      className={cx(
        "min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface-1 shadow-[var(--inner-highlight),var(--elev-1)]",
        className,
      )}
    >
      <legend className="float-left flex w-full items-center justify-between gap-4 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="type-label text-fg-2">{legend}</span>
        {meta && (
          <span aria-hidden="true" className="type-label text-fg-3">
            {meta}
          </span>
        )}
      </legend>
      <div className="clear-both p-4 sm:p-5">{children}</div>
    </fieldset>
  );
}

/** One atmosphere channel: a slider for feel, a number field for precision, both bound to the same value. */
function Channel({
  k,
  label,
  sliderLabel,
  draft,
  error,
  onChange,
}: {
  k: NumKey;
  label: ReactNode;
  sliderLabel: string;
  draft: Draft;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `${useId()}-${k}`;
  const { min, max, step, slider, unit } = LIMITS[k];
  const value = draft[k];
  const numeric = asNumber(value);
  // An empty or non-numeric entry leaves the slider where it was, dimmed and disabled, instead of snapping to the minimum.
  const valid = numeric !== null && numeric >= min && numeric <= max;
  const last = useRef<number>(numeric !== null ? Math.min(max, Math.max(min, numeric)) : min);
  if (valid) last.current = numeric;
  const rangeValue = last.current;
  const pct = ((rangeValue - min) / (max - min)) * 100;
  const hint = `${min}–${max} ${unit}`;
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            type="range"
            aria-label={sliderLabel}
            aria-valuetext={valid ? `${rangeValue} ${unit}` : "Enter a valid value in the number field"}
            disabled={!valid}
            min={min}
            max={max}
            step={slider}
            value={rangeValue}
            onChange={(e) => onChange(e.target.value)}
            className="range transition-opacity duration-[var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ ["--pct" as string]: `${pct}%` }}
          />
        </div>
        <div className="relative w-[7.5rem] shrink-0 sm:w-[8.5rem]">
          <input
            id={id}
            data-field={k}
            className={cx("field-input num font-mono text-lg", unit.length > 2 ? "pr-14" : "pr-9")}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, { error, hint })}
            onChange={(e) => onChange(e.target.value)}
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-fg-3">
            {unit}
          </span>
        </div>
      </div>
    </Field>
  );
}
