import Link from "next/link";
import { Icon, Reveal } from "@/components/ui";
import { LANDING_HEADINGS } from "./headings";
import { band } from "./data";

const fmt = new Intl.NumberFormat("en-US");

type Tile = { href: string; numeral: string; label: string };

/** "HALO in 60 seconds": the four numbers a reader should leave with, each a link to its proof. */
export function ProofBand() {
  const tiles: Tile[] = [
    {
      href: band.moon.href,
      numeral: `${band.moon.solids} of ${band.moon.tests}`,
      label: "PSI test rows in the Moon window that are a real cabin solid",
    },
    {
      href: band.kapton.href,
      numeral: `${band.kapton.missed} of ${band.kapton.runs}`,
      label: "Kapton smoke runs below an ISS-style detector's alarm proxy",
    },
    ...(band.nextTest
      ? [
          {
            href: band.nextTest.href,
            numeral: `${band.nextTest.before} → ${band.nextTest.after}`,
            label: `Artemis Base evidence distance before and after one suggested test at ${band.nextTest.o2}% O₂, ${band.nextTest.p} psia`,
          },
        ]
      : []),
    {
      href: band.data.href,
      numeral: String(band.data.investigations),
      label: `investigations, ${fmt.format(band.data.eligibleRows)} eligible rows: every number cited`,
    },
  ];
  return (
    <section id="sixty" aria-labelledby="sixty-title" className="border-b border-line py-10 sm:py-12">
      <div className="container-wide">
        <Reveal>
          <h2 id="sixty-title" className="type-label text-fg-3">
            {LANDING_HEADINGS.sixty}
          </h2>
          <ul className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.href} className="bg-surface-1">
                <Link href={t.href} className="group flex h-full flex-col gap-3 p-5 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 sm:p-6">
                  <span className="font-display text-[clamp(2rem,3.4vw,2.75rem)] font-semibold leading-none tracking-[-0.03em] text-fg tabular-nums">
                    {t.numeral}
                  </span>
                  <span className="type-body-s text-fg-2">{t.label}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-accent">
                    See the evidence
                    <Icon name="arrowRight" size={14} className="transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="type-caption mt-4 max-w-[70ch] text-fg-3">
            Built for the challenge&apos;s three goals: find the investigations that matter, give modelers data they can cite, and
            point next-generation equipment.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
