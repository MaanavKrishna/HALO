"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MATERIALS } from "@/lib/engine/materials";
import { PRESETS } from "@/lib/engine/presets";
import { habitatToQuery } from "@/lib/engine/url";
import type { DetectorId, Habitat, MaterialId } from "@/lib/engine/types";
import { PresetBar, type PresetId } from "./PresetBar";

// Accepted ranges; they match the clamps applied when /brief parses the URL.
const LIMITS = {
  o2: { min: 0, max: 100, step: 0.1, label: "O2", unit: "%" },
  p: { min: 0.5, max: 20, step: 0.1, label: "Pressure", unit: "psia" },
  f: { min: 0, max: 50, step: 0.5, label: "Flow", unit: "cm/s" },
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

  function edit(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
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
    router.push(`/brief?${habitatToQuery(habitat)}`);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-label="Habitat" className="flex flex-col gap-8">
      <PresetBar active={preset} onSelect={selectPreset} />
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      <div className="grid gap-x-12 gap-y-8 border-t border-rule pt-8 lg:grid-cols-[1.1fr_1fr]">
        <fieldset className="flex flex-col gap-6">
          <legend className="wide mb-5 text-lg font-bold">Atmosphere</legend>

          <NumberField
            k="o2"
            label={
              <>
                Oxygen, O<sub>2</sub>
              </>
            }
            draft={draft}
            error={showErr("o2")}
            onChange={(v) => edit({ o2: v })}
            withRange
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField k="p" label="Total pressure" draft={draft} error={showErr("p")} onChange={(v) => edit({ p: v })} />
            <NumberField k="f" label="Cabin air flow" draft={draft} error={showErr("f")} onChange={(v) => edit({ f: v })} />
          </div>
          <Field label="Habitat name" htmlFor="habitat-name" hint="Printed at the top of the brief.">
            <input
              id="habitat-name"
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
        </fieldset>

        <div className="flex flex-col gap-8">
          <fieldset aria-describedby={showErr("materials") ? "materials-error" : "materials-hint"}>
            <legend className="wide mb-1 text-lg font-bold">Cabin materials</legend>
            <p id="materials-hint" className="mb-4 text-sm text-muted">
              What could burn or smoke in the cabin.
            </p>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_IDS.map((id, i) => (
                <label key={id} className="chip text-sm">
                  <input
                    type="checkbox"
                    data-field={i === 0 ? "materials" : undefined}
                    checked={draft.materials.includes(id)}
                    onChange={(e) => toggleMaterial(id, e.target.checked)}
                  />
                  <span aria-hidden="true" className="chip-dot" />
                  {MATERIALS[id].label}
                </label>
              ))}
            </div>
            {showErr("materials") && (
              <p id="materials-error" className="mt-2 text-sm text-amber">
                {showErr("materials")}
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="wide mb-4 text-lg font-bold">Smoke detectors</legend>
            <div className="flex flex-col gap-3 text-[15px]">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked disabled aria-describedby="scatter-hint" className="mt-1 size-4" />
                <span>
                  ISS-style photoelectric
                  <span id="scatter-hint" className="block text-sm text-muted">
                    Always on; the reference detector.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={draft.ionization}
                  onChange={(e) => edit({ ionization: e.target.checked })}
                  className="mt-1 size-4"
                />
                <span>Ionization</span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="sr-only">Liquid fuels</legend>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-rule bg-surface px-4 py-3">
              <span className="text-[15px]">
                Liquid fuels on board
                <span className="block text-sm text-muted">Adds the droplet extinction evidence.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={draft.liquids}
                onChange={(e) => edit({ liquids: e.target.checked })}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-6 w-10 shrink-0 rounded-full border border-rule-strong bg-paper transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-[18px] after:rounded-full after:bg-muted after:transition-transform after:duration-200 peer-checked:border-flame peer-checked:bg-flame peer-checked:after:translate-x-4 peer-checked:after:bg-flame-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]"
              />
            </label>
          </fieldset>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:py-4 sm:px-8">
        <p className="num hidden font-mono text-sm text-muted sm:block" aria-hidden="true">
          {draft.o2 || "–"}% O<sub>2</sub> · {draft.p || "–"} psia · {draft.f || "–"} cm/s · {draft.materials.length}{" "}
          {draft.materials.length === 1 ? "material" : "materials"}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-flame px-5 py-2.5 sm:w-auto font-semibold text-flame-ink transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
        >
          {pending ? "Generating brief…" : "Generate brief"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, hint, error, children }: { label: ReactNode; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[15px] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-amber">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function NumberField({
  k,
  label,
  draft,
  error,
  onChange,
  withRange = false,
}: {
  k: NumKey;
  label: ReactNode;
  draft: Draft;
  error?: string;
  onChange: (v: string) => void;
  withRange?: boolean;
}) {
  const id = `${useId()}-${k}`;
  const { min, max, step, unit } = LIMITS[k];
  const value = draft[k];
  const numeric = Number(value);
  const rangeValue = Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : min;
  return (
    <Field label={label} htmlFor={id} error={error} hint={withRange ? undefined : `${min}–${max} ${unit}`}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <input
            id={id}
            data-field={k}
            className="field-input num pr-14 font-mono text-lg"
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : withRange ? undefined : `${id}-hint`}
            onChange={(e) => onChange(e.target.value)}
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {unit}
          </span>
        </div>
        {withRange && (
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="num font-mono text-xs text-muted">
              {min}
            </span>
            <input
              type="range"
              aria-label="O2 percent slider"
              min={min}
              max={max}
              step={1}
              value={rangeValue}
              onChange={(e) => onChange(e.target.value)}
              className="h-6 flex-1"
            />
            <span aria-hidden="true" className="num font-mono text-xs text-muted">
              {max}
            </span>
          </div>
        )}
      </div>
    </Field>
  );
}
