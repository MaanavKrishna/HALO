"use client";

import { useState } from "react";
import {
  Button,
  Callout,
  NumberField,
  Segmented,
  SliderField,
  Switch,
  Tabs,
  ToggleChip,
  Tooltip,
  Icon,
  Kbd,
} from "@/components/ui";

const CURVES = [
  { id: "ease-out", label: "ease-out", timing: "var(--ease-out)", dur: "var(--dur-slow)" },
  { id: "ease-in-out", label: "ease-in-out", timing: "var(--ease-in-out)", dur: "var(--dur-slow)" },
  { id: "spring", label: "spring", timing: "var(--spring)", dur: "var(--spring-dur-smooth)" },
  { id: "bounce", label: "spring-bounce", timing: "var(--spring-bounce)", dur: "var(--spring-dur-bounce)" },
] as const;

/** Plays each easing on a track. Transitions, so a second press reverses mid-flight. */
export function MotionLab() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-1 p-5">
        {CURVES.map((c) => (
          <div key={c.id} className="grid grid-cols-[7.5rem_1fr] items-center gap-4">
            <span className="type-label text-fg-3">{c.label}</span>
            <div className="relative h-6 rounded-full bg-surface-2 [container-type:inline-size]">
              <span
                className="absolute left-0.5 top-0.5 size-5 rounded-full bg-accent shadow-[0_0_12px_var(--accent-glow)]"
                style={{
                  transform: on ? "translateX(calc(100cqw - 1.5rem))" : "translateX(0)",
                  transition: `transform ${c.dur} ${c.timing}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setOn((v) => !v)}>
          {on ? "Return" : "Play"}
        </Button>
        <span className="text-sm text-fg-2">Press again mid-flight: transitions retarget from the current position.</span>
      </div>
    </div>
  );
}

/** Form controls wired the way pages should wire them. */
export function FormDemo() {
  const [o2, setO2] = useState("34");
  const [flow, setFlow] = useState(10);
  const [liquids, setLiquids] = useState(false);
  const [mats, setMats] = useState<string[]>(["Kapton", "Teflon"]);
  const o2Num = Number(o2);
  const o2Err = o2.trim() === "" ? "Enter an O2 level." : o2Num < 0 || o2Num > 100 ? "O2 must be between 0 and 100%." : undefined;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <NumberField
          label={
            <>
              Oxygen, O<sub>2</sub>
            </>
          }
          unit="%"
          min={0}
          max={100}
          step={0.1}
          value={o2}
          onChange={(e) => setO2(e.target.value)}
          hint="0–100 %. Try 140 to see the error state."
          error={o2Err}
        />
        <SliderField label="Cabin air flow" unit="cm/s" min={0} max={50} step={0.5} value={flow} onChange={(e) => setFlow(Number(e.target.value))} format={(v) => v.toFixed(1)} />
        <NumberField label="Total pressure" unit="psia" defaultValue="8.2" hint="0.5–20 psia" disabled />
      </div>
      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="mb-3 text-[0.9375rem] font-medium text-fg">Cabin materials</legend>
          <div className="flex flex-wrap gap-2">
            {["Kapton", "Teflon", "Silicone", "Cotton (lampwick)", "Nomex"].map((m) => (
              <ToggleChip
                key={m}
                checked={mats.includes(m)}
                onChange={(e) => setMats((s) => (e.target.checked ? [...s, m] : s.filter((x) => x !== m)))}
              >
                {m}
              </ToggleChip>
            ))}
            <ToggleChip disabled>PMMA</ToggleChip>
          </div>
        </fieldset>
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface-1 px-4 py-3.5">
          <Switch
            label="Liquid fuels on board"
            description="Adds the droplet extinction evidence."
            checked={liquids}
            onChange={(e) => setLiquids(e.target.checked)}
          />
        </div>
        <p className="text-sm text-fg-2">
          Evidence grade{" "}
          <Tooltip content="How close the nearest NASA test sits to your habitat. It grades evidence, not the habitat.">
            what is this?
          </Tooltip>{" "}
          <span className="mx-1 text-fg-3">/</span> Icon trigger{" "}
          <Tooltip label="About provenance" align="end" content="Measured, inferred, assumed, literature, model or SI-generated.">
            <Icon name="info" size={16} />
          </Tooltip>
        </p>
      </div>
    </div>
  );
}

export function NavigationDemo() {
  const [view, setView] = useState<"brief" | "evidence" | "sources">("brief");
  const [units, setUnits] = useState<"psia" | "kpa">("psia");
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-6">
        <Segmented
          label="Brief view"
          value={view}
          onChange={setView}
          options={[
            { value: "brief", label: "Brief" },
            { value: "evidence", label: "Evidence" },
            { value: "sources", label: "Sources" },
          ]}
        />
        <Segmented
          label="Pressure unit"
          size="sm"
          value={units}
          onChange={setUnits}
          options={[
            { value: "psia", label: "psia" },
            { value: "kpa", label: "kPa" },
          ]}
        />
        <span className="text-sm text-fg-2">
          Arrow keys move the selection; <Kbd>Tab</Kbd> leaves the group.
        </span>
      </div>
      <Tabs
        label="Hazards"
        items={[
          {
            id: "spread",
            label: "Flame spread",
            content: <p className="max-w-[60ch] text-fg-2">Tab panels hold content that belongs to one option. Left and Right move between tabs; Home and End jump.</p>,
          },
          {
            id: "detect",
            label: "Smoke detection",
            content: <Callout title="Panel two">Only the selected tab sits in the tab order.</Callout>,
          },
          { id: "extinction", label: "Extinction", content: <p className="text-fg-2">The underline grows on a critically damped spring.</p> },
        ]}
      />
    </div>
  );
}

export function LoadingDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      loading={busy}
      loadingLabel="Generating brief…"
      onClick={() => {
        setBusy(true);
        window.setTimeout(() => setBusy(false), 1800);
      }}
    >
      Generate brief
    </Button>
  );
}
