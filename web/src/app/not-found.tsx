import type { Metadata } from "next";
import { ButtonLink, Icon, PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Styled 404. Unknown routes (and unknown /explore ids, via the config rewrite) answer with a real 404 status. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHero
        titleId="not-found-title"
        eyebrow="404 · no signal at this address"
        title="Page not found"
        lede="Nothing burns here. The page may have moved, or the address may be mistyped. The evidence is still where you left it."
        visual="rings"
        className="flex-1"
        actions={
          <>
            <ButtonLink href="/findings" iconEnd={<Icon name="arrowRight" size={16} />}>
              See the findings
            </ButtonLink>
            <ButtonLink href="/explore" variant="secondary">
              Explore investigations
            </ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Home
            </ButtonLink>
          </>
        }
      />
    </main>
  );
}
