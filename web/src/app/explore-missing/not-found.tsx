import { ButtonLink, Icon, PageHero } from "@/components/ui";

export default function NotFound() {
  return (
    <main>
      <PageHero
        titleId="nf-title"
        eyebrow="404"
        title="Investigation not found"
        lede="HALO has no investigation with that id. Ids look like PSI-69."
        actions={
          <ButtonLink href="/explore" variant="primary" icon={<Icon name="arrowRight" size={16} className="rotate-180" />}>
            See all investigations
          </ButtonLink>
        }
      />
    </main>
  );
}
