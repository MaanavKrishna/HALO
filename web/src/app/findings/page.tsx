import { Fragment } from "react";
import { CoverageMap } from "@/components/views/CoverageMap";
import { FindingCard } from "@/components/content/FindingCard";
import { computeFindings } from "@/components/content/findings";
import { Article, ButtonLink, Icon, PageHero, Stat, StatGroup } from "@/components/ui";
import { HALO_DATA } from "@/lib/data/load";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Findings",
  description:
    "What NASA's microgravity fire data does and does not cover for Moon and Mars habitats: the headline evidence gaps, each computed from the data and cited.",
  path: "/findings",
});

const fmt = new Intl.NumberFormat("en-US");

export default function FindingsPage() {
  const findings = computeFindings();
  const { investigations, manifest } = HALO_DATA;
  const ceiling = findings.find((f) => f.id === "solid-ceiling");
  const win = findings.find((f) => f.id === "moon-window");
  return (
    <main>
      <PageHero
        titleId="findings-title"
        eyebrow={`${findings.length} findings · every number cited`}
        title="What the fire evidence does not cover yet"
        lede="HALO measured how close NASA's microgravity fire tests come to the atmospheres planned for lunar habitats. These are the gaps that matter most, each computed from the data and linked to its source."
        visual="rings"
        actions={
          <>
            <ButtonLink href="#solid-ceiling" iconEnd={<Icon name="arrowRight" size={16} />}>
              Read the findings
            </ButtonLink>
            <ButtonLink href="/method" variant="secondary" className="max-sm:hidden">
              How it is measured
            </ButtonLink>
          </>
        }
        meta={
          <StatGroup className="max-w-4xl">
            <Stat label="PSI investigations" value={investigations.length} />
            <Stat label="Eligible test rows" value={fmt.format(manifest.eligibleRows)} />
            {ceiling && <Stat label="Highest O2 any real material was burned at (PSI rows)" value={ceiling.stat.value} unit="%" />}
            {win && <Stat label="Real solids, Moon window" value={win.stat.value} />}
          </StatGroup>
        }
      />
      <Article
        className="content-wide py-6! sm:py-10! lg:py-14!"
        toc={findings.map((f) => ({ id: f.id, label: f.topic }))}
      >
        <div className="content-block flex flex-col gap-8 sm:gap-10">
          {findings.map((f) => (
            <Fragment key={f.id}>
              <FindingCard finding={f} />
              {f.id === "solid-ceiling" && (
                <section aria-labelledby="coverage-map-title" className="flex flex-col gap-4">
                  <h2 id="coverage-map-title" className="type-title text-fg">
                    Where the tests stop
                  </h2>
                  <CoverageMap id="findings-cov" compact />
                </section>
              )}
            </Fragment>
          ))}
        </div>
        <p className="type-body-s mt-10 text-fg-3">
          Grades and distances describe how close tested evidence comes to a habitat atmosphere. They are not a safety
          certification. See the <a href="/method">method</a> for every formula and the <a href="/data#sources">data
          sources</a> for every DOI.
        </p>
      </Article>
    </main>
  );
}
