import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/findings", h1: "What the fire evidence does not cover yet" },
  { path: "/method", h1: "How HALO grades the evidence" },
  { path: "/data", h1: "Every number has a source" },
  { path: "/about", h1: "Built for Flame in Freefall" },
];

for (const p of PAGES) {
  test(`${p.path} renders its heading and contents list`, async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(m.text());
    });
    page.on("pageerror", (e) => problems.push(String(e)));
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.h1);
    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc.filter({ visible: true }).getByRole("link").first()).toBeVisible();
    await expect(page).toHaveTitle(/· HALO$/);
    expect(problems).toEqual([]);
  });
}

test("sitemap lists investigations and preset briefs", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("/explore/PSI-69</loc>");
  expect(xml).toContain("/brief?o2=34&amp;p=8.2");
  expect(xml).not.toMatch(/&(?!amp;)/);
});

test("robots references the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  expect(await res.text()).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});

test("manifest is valid JSON with maskable icons that resolve", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.short_name).toBe("HALO");
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  for (const icon of m.icons) {
    const r = await request.get(icon.src);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toBe("image/png");
  }
});

test("icons and share images are PNGs", async ({ request }) => {
  for (const path of ["/icon", "/apple-icon", "/opengraph-image", "/twitter-image", "/findings/opengraph-image", "/method/opengraph-image", "/data/opengraph-image", "/about/opengraph-image"]) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
    expect(r.headers()["content-type"], path).toBe("image/png");
  }
});

test("data downloads serve JSON and reject unknown files", async ({ request }) => {
  const ok = await request.get("/data/files/manifest.json");
  expect(ok.status()).toBe(200);
  const manifest = await ok.json();
  expect(manifest.eligibleRows).toBeGreaterThan(0);
  // Served byte for byte: every file the manifest lists matches its recorded sha256.
  for (const [file, sha] of Object.entries(manifest.files as Record<string, string>)) {
    const body = await (await request.get(`/data/files/${file}`)).body();
    expect(createHash("sha256").update(body).digest("hex"), file).toBe(sha);
  }
  expect((await request.get("/data/files/secret.env")).status()).toBe(404);
});

test("a finding card opens a brief with a grade badge", async ({ page }) => {
  await page.goto("/findings");
  const card = page.locator("#solid-ceiling");
  await expect(card.getByRole("heading", { level: 2 })).toBeVisible();
  await card.getByRole("link", { name: /See it in the .* brief/ }).click();
  await expect(page).toHaveURL(/\/brief\?/);
  await expect(page.getByRole("img", { name: /Evidence grade/ }).first()).toBeVisible();
});

test("unknown page is a styled 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByRole("link", { name: "See the findings" })).toBeVisible();
});

/** Accessible name of an external link: its text plus the screen-reader "opens in a new tab" hint. */
const ext = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( \\(opens in a new tab\\))?$`);

test("about cites the fire history, the ScienceCast and the Glenn page, and names its reader", async ({ page }) => {
  await page.goto("/about");
  const main = page.getByRole("main");
  for (const name of ["Apollo 1", "Apollo 13", "the Mir fire"]) {
    await expect(main.getByRole("link", { name: ext(name) }).first()).toHaveAttribute("href", /nasa\.gov/);
  }
  await expect(main.getByRole("link", { name: /The Power of Studying Combustion on the ISS/ }).first()).toHaveAttribute("href", /youtube\.com\/watch\?v=W1oXykoz9zg/);
  await expect(main.getByRole("link", { name: /NASA Glenn.*Combustion Science/ }).first()).toHaveAttribute("href", /glenn/);
  await expect(main.getByRole("heading", { name: "Who it is for" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Why I built this" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Partner agency research" })).toBeVisible();
  await expect(main).toContainText("Ask HALO eval pass rate");
  await expect(main).not.toContainText("Explain eval");
  await expect(main).toContainText("Geist Mono");
});

test("method names the data HALO cannot use yet and the standards behind its claims", async ({ page }) => {
  await page.goto("/method");
  const limits = page.getByRole("main");
  for (const name of ["LUCI", "FM2", "SoFIE", "FLARE", "NASA-STD-6001B"]) {
    const link = limits.getByRole("link", { name: ext(name) });
    await expect(link).toHaveAttribute("href", /^https:\/\//);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(limits.getByRole("link", { name: /Researcher’s Guide/ })).toHaveAttribute("href", /a-researchers-guide-to-combustion-science/);
  await expect(limits.getByRole("link", { name: "NTRS 20150021491" })).toBeVisible();
  await expect(limits).toContainText("NASA-STD-3001");
});

test("data counts unique DOIs, marks HALO labels and cites partner research", async ({ page }) => {
  await page.goto("/data");
  const main = page.getByRole("main");
  await expect(main).toContainText(/\d+ unique publication DOIs/);
  await expect(main.getByText("HALO label").first()).toBeVisible();
  await expect(main.getByRole("link", { name: /PSI-179 ASE/ })).toHaveAttribute("href", "https://doi.org/10.60555/pdgr-c961");
  await expect(main.getByRole("heading", { name: "Partner agency research" })).toBeVisible();
  await expect(main.locator('a[href$="smoke-aerosol-measurement-experiment-same.pdf"]')).toHaveText(/SAME/);
});

test("landing explains why fire safety in space matters, with sources", async ({ page }) => {
  await page.goto("/");
  const why = page.locator("#why");
  await expect(why.getByRole("heading", { level: 2 })).toHaveText("Why fire safety in space matters.");
  for (const name of ["Apollo 1", "Apollo 13", "Mir"]) await expect(why.getByRole("heading", { level: 3, name, exact: true })).toBeVisible();
  await expect(why.getByRole("link")).toHaveCount(3);
});
