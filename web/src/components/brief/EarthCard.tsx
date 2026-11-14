import { briefContext } from "@/lib/brief/context";
import { safeUrl } from "@/lib/brief/citations";
import type { Brief } from "@/lib/engine/types";
import { CiteMark, Section } from "./parts";

/** Three NASA Spinoff technologies from fire research that reached Earth. */
export function EarthCard({ brief }: { brief: Brief }) {
  const ctx = briefContext(brief);
  return (
    <Section id="earth" index={9} title="Back on Earth" kicker="Space fire research already protects people on the ground.">
      <ul className="grid gap-3 md:grid-cols-3">
        {brief.earth.map((f) => {
          const url = safeUrl(f.source.url);
          return (
            <li key={f.id} className="flex flex-col rounded-lg border border-rule bg-surface p-5">
              <h3 className="font-semibold">{f.label}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                {String(f.value)}
                <CiteMark n={ctx.cite(f.id)} />
              </p>
              {url && (
                <a href={url} rel="noreferrer" className="mt-3 text-xs text-flame underline-offset-2 hover:underline">
                  {f.source.note ?? "NASA Spinoff"}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
