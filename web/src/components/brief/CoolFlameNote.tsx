import { Callout } from "@/components/ui/Callout";
import { briefContext } from "@/lib/brief/context";
import type { Brief } from "@/lib/engine/types";
import { CiteMark } from "./parts";

/** Only for habitats with liquid fuels: a flame can outlive its visible glow. */
export function CoolFlameNote({ brief }: { brief: Brief }) {
  const f = brief.coolFlame;
  if (!f) return null;
  const ctx = briefContext(brief);
  return (
    <aside aria-labelledby="cool-flame-title" className="brief-section border-t border-line py-10 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
      <h2 id="cool-flame-title" className="type-title mb-4 text-fg lg:mb-0">
        Cool flames after visible flame-out
      </h2>
      <Callout tone="info">
        <p className="text-fg">
          {String(f.value)}.
          <CiteMark n={ctx.cite(f.id)} />
        </p>
        <p className="mt-2">This is droplet-fuel evidence from FLEX; HALO has no cool-flame data for cabin solids.</p>
      </Callout>
    </aside>
  );
}
