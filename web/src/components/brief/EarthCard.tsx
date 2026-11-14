import { briefContext } from "@/lib/brief/context";
import { safeUrl } from "@/lib/brief/citations";
import type { Brief } from "@/lib/engine/types";
import { BriefIcon } from "./icons";
import { CiteMark, Section } from "./parts";

/** Three NASA Spinoff technologies from fire research that reached Earth. */
export function EarthCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  return (
    <Section id="earth" title="Back on Earth" kicker="Space fire research already protects people on the ground.">
      <ul className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line grid-cols-1 md:grid-cols-3" data-print-keep="">
        {brief.earth.map((f) => {
          const url = safeUrl(f.source.url);
          return (
            <li key={f.id} className="flex flex-col gap-2 bg-surface-1 p-5 sm:p-6">
              <h3 className="font-semibold text-fg">{f.label}</h3>
              <p className="flex-1 text-[0.9375rem] leading-relaxed text-fg-2">
                {String(f.value)}
                <CiteMark n={ctx.cite(f.id)} />
              </p>
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
