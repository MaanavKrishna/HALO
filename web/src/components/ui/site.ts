/** Information architecture shared by Navbar and Footer. Routes may not exist yet. */
export const NAV_LINKS = [
  { href: "/findings", label: "Findings" },
  { href: "/explore", label: "Explore" },
  { href: "/compare", label: "Compare" },
  { href: "/method", label: "Method" },
  { href: "/data", label: "Data" },
  { href: "/about", label: "About" },
] as const;

/** Tool views reached from the footer and from Explore, kept out of the top bar so it stays at six links. */
export const TOOL_LINKS = [
  { href: "/investigations/compare", label: "Compare investigations" },
  { href: "/materials", label: "Material screener" },
  { href: "/gravity", label: "Partial-gravity bounds" },
] as const;

export const BUILD_HREF = "/build";
export const CHALLENGE_URL = "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/";
export const REPO_URL = "https://github.com/MaanavKrishna/HALO-Habitat-Assessment-from-Low-Gravity-Observations";

export type FooterLink = { href: string; label: string; external?: boolean };

export const FOOTER_GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: BUILD_HREF, label: "Build a brief" },
      { href: "/findings", label: "Findings" },
      { href: "/explore", label: "Explore" },
      { href: "/compare", label: "Compare habitats" },
      { href: "/investigations/compare", label: "Compare investigations" },
      { href: "/materials", label: "Material screener" },
    ],
  },
  {
    title: "Science",
    links: [
      { href: "/method", label: "Method" },
      { href: "/data", label: "Data" },
      { href: "/gravity", label: "Partial-gravity bounds" },
      { href: "/data#sources", label: "Sources and DOIs" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: CHALLENGE_URL, label: "NASA Space Apps 2026 challenge", external: true },
      { href: REPO_URL, label: "GitHub repository", external: true },
      { href: "/design", label: "Design system" },
    ],
  },
];

export const DISCLAIMER = "Not affiliated with or endorsed by NASA. Data: NASA Physical Sciences Informatics (CC0).";
