import { briefContext } from "@/lib/brief/context";
import { safeUrl } from "@/lib/brief/citations";
import { EARTH_TIES } from "@/lib/engine/facts";
import { MATERIALS } from "@/lib/engine/materials";
import type { Brief } from "@/lib/engine/types";
import { BriefIcon } from "./icons";
import { CiteMark, Num, Section } from "./parts";

/** What each aftermath technology does about the finding. */
const AFTERMATH_POINT: Record<string, string> = {
  "earth-air-tanks": "firefighters, like crews, need their own clean breathing air.",
  "earth-fire-attire": "protective gear has to guard against smoke and gas as well as heat.",
  "earth-water-mist": "an extinguisher that adds no CO₂ matters as much as putting the fire out.",
};
const AFTERMATH_DEFAULT = "clean air after a fire matters as much as putting it out.";

/** The brief finding an Earth technology answers. The Saffire VI CO and CO2 sentence is written once, on the first aftermath tie. */
function Tie({ brief, kind, id, first }: { brief: Brief; kind: "smoke" | "aftermath"; id: string; first: boolean }) {
  const ctx = briefContext(brief);
  if (kind === "smoke") {
    const miss = brief.flags.find((f) => f.id.startsWith("detector-miss-"));
    const m = miss ? (miss.id.replace("detector-miss-", "") as keyof typeof MATERIALS) : null;
    const low = miss?.factIds[0];
    const runs = miss?.factIds[1];
    return (
      <p className="text-[0.8125rem] leading-snug text-fg-2">
        <a href="#detection" className="font-medium text-accent underline-offset-4 hover:underline">
          This brief
        </a>
        {": "}
        {miss && m && low && runs ? (
          <>
            your detector setup stayed below its alarm level in <Num brief={brief} id={low} /> of <Num brief={brief} id={runs} cite={false} /> SAME {MATERIALS[m].label} runs. Telling
            fine smoke from dust takes more than one kind of sensor, in a habitat or a building.
          </>
        ) : (
          <>SAME measured how well smoke from cabin materials is seen; telling smoke from dust is the same job on Earth.</>
        )}
      </p>
    );
  }
  const toxic = ctx.fact("aftermath-toxic-oxygen");
  return (
    <p className="text-[0.8125rem] leading-snug text-fg-2">
      <a href="#aftermath" className="font-medium text-accent underline-offset-4 hover:underline">
        This brief
      </a>
      {": "}
      {toxic && first ? (
        <>
          in the Saffire VI burn at about <Num brief={brief} id="aftermath-toxic-oxygen" unit={false} cite={false} />% O<sub>2</sub>
          <CiteMark n={ctx.cite("aftermath-toxic-oxygen")} />, CO exceeded the 24-hour crew limit but stayed below the 1-hour limit, and CO<sub>2</sub> exceeded its
          1-hour limit, so{" "}
          {AFTERMATH_POINT[id] ?? AFTERMATH_DEFAULT}
        </>
      ) : toxic ? (
        <>the same burn&rsquo;s gases mean {AFTERMATH_POINT[id] ?? AFTERMATH_DEFAULT}</>
      ) : (
        <>a fire leaves smoke and toxic gas behind, so {AFTERMATH_POINT[id] ?? AFTERMATH_DEFAULT}</>
      )}
    </p>
  );
}

/** NASA Spinoff technologies from space fire research, each tied to the finding in this brief it answers. */
export function EarthCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  const firstAftermath = brief.earth.find((f) => EARTH_TIES[f.id] === "aftermath")?.id;
  return (
    <Section
      id="earth"
      title="Back on Earth"
      kicker="Space fire research already protects people on the ground. Each technology below answers a finding in this brief."
    >
      <ul className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line grid-cols-1 md:grid-cols-2" data-earth>
        {brief.earth.map((f) => {
          const url = safeUrl(f.source.url);
          const tie = EARTH_TIES[f.id];
          return (
            <li key={f.id} className="flex flex-col gap-2 bg-surface-1 p-5 sm:p-6" data-earth-item={f.id}>
              <h3 className="font-semibold text-fg">{f.label}</h3>
              <p className="flex-1 text-[0.9375rem] leading-relaxed text-fg-2">
                {String(f.value)}
                <CiteMark n={ctx.cite(f.id)} />
              </p>
              {tie && (
                <div className="mt-1 border-t border-line pt-3">
                  <Tie brief={brief} kind={tie} id={f.id} first={f.id === firstAftermath} />
                </div>
              )}
              {url && (
                <a
                  href={url}
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 self-start text-[0.8125rem] font-medium text-accent underline-offset-4 hover:underline"
                >
                  {f.source.note ?? "NASA Spinoff"}
                  <BriefIcon name="external" size={13} />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
