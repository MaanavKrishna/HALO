import { briefContext } from "@/lib/brief/context";
import type { Brief } from "@/lib/engine/types";
import { CiteMark } from "./parts";

/** Only for habitats with liquid fuels: a flame can outlive its visible glow. */
export function CoolFlameNote({ brief }: { brief: Brief }) {
  const f = brief.coolFlame;
  if (!f) return null;
  const ctx = briefContext(brief);
  return (
    <aside aria-labelledby="cool-flame-title" className="brief-section border-t border-rule py-8">
      <div className="lg:ml-[calc(15rem+3rem)]">
        <div className="rounded-lg border border-dashed border-flame bg-flame-soft/60 p-5">
          <h2 id="cool-flame-title" className="text-sm font-semibold">
            Cool flames after visible flame-out
          </h2>
          <p className="mt-1.5 max-w-prose text-[15px] leading-relaxed">
            {String(f.value)}.
            <CiteMark n={ctx.cite(f.id)} />
          </p>
          <p className="mt-2 text-sm text-muted">
            This is droplet-fuel evidence from FLEX; HALO has no cool-flame data for cabin solids.
          </p>
        </div>
      </div>
    </aside>
  );
}
