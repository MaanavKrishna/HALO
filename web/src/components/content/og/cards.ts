import { HALO_DATA } from "@/lib/data/load";
import { renderOgImage } from "./render";

/** Text of each page's share card. */
export const OG_CARDS = {
  root: {
    eyebrow: "Fire evidence for habitats",
    title: "In microgravity, a flame becomes a halo.",
    lede: "HALO turns NASA's microgravity fire data into a one-page, cited fire brief for your habitat.",
    alt: "HALO: a halo-shaped microgravity flame beside the line “In microgravity, a flame becomes a halo.”",
  },
  findings: {
    eyebrow: "Findings",
    title: "What NASA's fire data does not cover yet",
    lede: "The headline gaps between tested microgravity fires and Moon and Mars habitat atmospheres, each one cited.",
    alt: "HALO Findings: what NASA's microgravity fire data does not cover yet.",
  },
  method: {
    eyebrow: "Method",
    title: "How HALO grades the evidence",
    lede: "Evidence distance, halo rings and grades, ranking, detector calibration and the droplet extinction model.",
    alt: "HALO Method: how HALO grades the evidence.",
  },
  data: {
    eyebrow: "Data",
    title: "Every number has a source",
    lede: "NASA Physical Sciences Informatics combustion records, cleaned in code, with provenance on every value.",
    alt: "HALO Data: every number has a source.",
  },
  about: {
    eyebrow: "About",
    title: "Built for Flame in Freefall",
    lede: "A NASA Space Apps 2026 project: open data, open method, and an honest account of what is untested.",
    alt: "About HALO, a NASA Space Apps 2026 Flame in Freefall project.",
  },
} as const;

export type OgCardKey = keyof typeof OG_CARDS;

export function ogFooter() {
  const n = HALO_DATA.investigations.length;
  return `NASA PSI combustion data · ${n} investigations · CC0`;
}

export function renderCard(key: OgCardKey) {
  const c = OG_CARDS[key];
  return renderOgImage({ eyebrow: c.eyebrow, title: c.title, lede: c.lede, footer: ogFooter() });
}
