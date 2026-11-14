import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompareColumn } from "@/components/compare/CompareColumn";
import { DEFAULT_A, DEFAULT_B, changes, compareHref, habitatFromParam } from "@/lib/compare";
import { HALO_DATA } from "@/lib/data/load";
import { buildBrief } from "@/lib/engine/brief";
import { PRESETS } from "@/lib/engine/presets";
import type { Habitat } from "@/lib/engine/types";

export const metadata: Metadata = {
  title: "Compare habitats | HALO",
  description: "Two habitat atmospheres side by side: evidence grade, flags and smoke detection.",
};

const PRESET_LIST = Object.values(PRESETS);

function Picker({ side, current, a, b }: { side: "a" | "b"; current: Habitat; a: Habitat; b: Habitat }) {
  return (
    <div>
      <p id={`pick-${side}`} className="text-sm font-semibold">{side === "a" ? "From" : "To"}</p>
      <ul aria-labelledby={`pick-${side}`} className="mt-2 flex flex-wrap gap-2">
        {PRESET_LIST.map((p) => {
          const on = p.name === current.name;
          const href = side === "a" ? compareHref(p, b) : compareHref(a, p);
          return (
            <li key={p.name}>
              <Link
                href={href}
                prefetch={false}
                aria-current={on ? "true" : undefined}
                className={`inline-block rounded-full border px-3 py-1.5 text-sm ${on ? "border-flame bg-flame-soft font-semibold" : "border-rule-strong bg-surface hover:border-muted"}`}
              >
                {p.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

async function Comparison({ searchParams }: { searchParams: PageProps<"/compare">["searchParams"] }) {
  const sp = await searchParams;
  const a = habitatFromParam(sp.a, DEFAULT_A);
  const b = habitatFromParam(sp.b, DEFAULT_B);
  const briefA = buildBrief(a, HALO_DATA);
  const briefB = buildBrief(b, HALO_DATA);
  const diff = changes(briefA, briefB);

  return (
    <>
      <h1 className="wide text-[clamp(1.6rem,3.6vw,2.4rem)] font-extrabold leading-tight text-balance">
        What changes when you move from {a.name} to {b.name}
      </h1>
      <p className="mt-3 max-w-[44rem] text-[17px] leading-snug text-muted">
        Same materials, same evidence rules. Evidence grades describe how close the nearest NASA test is, not the habitat itself.
      </p>

      <section aria-label="Choose habitats" className="mt-6 grid gap-5 sm:grid-cols-2">
        <Picker side="a" current={a} a={a} b={b} />
        <Picker side="b" current={b} a={a} b={b} />
      </section>

      <section aria-labelledby="changes" className="mt-8 border-t-2 border-ink pt-5">
        <h2 id="changes" className="wide text-lg font-bold">Summary of the change</h2>
        <ul className="mt-3 max-w-[46rem] list-disc space-y-1.5 pl-5 leading-snug marker:text-muted">
          <li>
            Atmosphere:{" "}
            <span className="num">{a.o2Pct}% O<sub>2</sub> at {a.pressurePsia} psia</span> to{" "}
            <span className="num">{b.o2Pct}% O<sub>2</sub> at {b.pressurePsia} psia</span>.
          </li>
          <li>
            Evidence grade:{" "}
            {diff.gradeChanged ? (
              <>{briefA.grade.grade} to {briefB.grade.grade}.</>
            ) : (
              <>unchanged at {briefA.grade.grade}.</>
            )}
          </li>
          {diff.added.map((f) => (
            <li key={`add-${f.id}`}>New in {b.name}: {f.title}.</li>
          ))}
          {diff.removed.map((f) => (
            <li key={`rem-${f.id}`}>No longer flagged in {b.name}: {f.title}.</li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <CompareColumn brief={briefA} heading="col-a" />
        <CompareColumn brief={briefB} heading="col-b" />
      </div>
    </>
  );
}

export default function ComparePage(props: PageProps<"/compare">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <Suspense fallback={<p className="text-muted">Loading comparison…</p>}>
        <Comparison searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
