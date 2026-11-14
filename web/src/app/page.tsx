import { HabitatForm } from "@/components/builder/HabitatForm";
import { HALO_DATA } from "@/lib/data/load";

const fmt = new Intl.NumberFormat("en-US");

export default function Home() {
  const investigations = HALO_DATA.investigations.length;
  const rows = HALO_DATA.manifest.totalRows;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <section aria-labelledby="wordmark" className="grid gap-8 pb-12 pt-14 sm:pt-20 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16 lg:pb-16">
        <div>
          <h1 id="wordmark" aria-label="HALO" className="wordmark isolate text-[clamp(4.5rem,19vw,10rem)] text-ink">
            HAL<span className="wordmark-o">O</span>
          </h1>
          <p className="mt-5 max-w-[22rem] text-[15px] leading-snug text-muted">
            Habitat Assessment from Low-gravity Observations
          </p>
        </div>
        <div className="max-w-[36rem] lg:pb-2">
          <p className="text-[clamp(1.25rem,2.2vw,1.6rem)] leading-[1.3] tracking-[-0.005em] text-balance">
            In microgravity, a flame becomes a halo. HALO turns NASA&apos;s microgravity fire data into a one-page fire
            brief for your habitat.
          </p>
          <p className="num mt-5 text-sm text-muted">
            {investigations} NASA microgravity combustion investigations · {fmt.format(rows)} test rows · every number
            cited
          </p>
        </div>
      </section>

      <section aria-label="Habitat builder" className="border-t-2 border-ink pt-8 pb-0">
        <HabitatForm />
      </section>
    </main>
  );
}
