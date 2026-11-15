import { test, expect, type Page } from "@playwright/test";

/** The three tool views: compare investigations, material screener, partial-gravity bounds. */

const ROUTES = [
  { path: "/investigations/compare", h1: "BASS-II, SAFFIRE-II, FLEX and ACME BRE" },
  { path: "/materials", h1: /PMMA \(acrylic\)\s*at Artemis Base/ },
  { path: "/gravity", h1: "Bounds, not predictions" },
] as const;

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

for (const theme of ["light", "dark"] as const) {
  for (const r of ROUTES) {
    test(`${r.path} renders and fits 320 and 1440 (${theme})`, async ({ page }) => {
      const problems = watchConsole(page);
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => localStorage.setItem("halo-theme", t), theme);
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(r.path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(r.h1);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(clientWidth);
      }
      expect(problems).toEqual([]);
    });
  }
}

test("metadata: canonical and Open Graph image on every view", async ({ page, request }) => {
  for (const r of ROUTES) {
    await page.goto(r.path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${r.path.replace(/\//g, "\\/")}$`));
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(og).toBeTruthy();
    const res = await request.get(new URL(og!).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
});

test("sitemap lists the views and /design", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/investigations/compare", "/materials", "/gravity", "/design"]) expect(xml).toContain(`${p}</loc>`);
});

test("compare: chips add and remove investigations; ids come from the URL", async ({ page }) => {
  await page.goto("/investigations/compare?ids=PSI-26,PSI-22");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("BASS and ACME E-FIELD Flames");
  await page.getByRole("link", { name: /Add SAFFIRE-II \(PSI-99\)/ }).click();
  await expect(page).toHaveURL(/ids=PSI-26,PSI-22,PSI-99$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("BASS, ACME E-FIELD Flames and SAFFIRE-II");
  await page.getByRole("link", { name: /Remove BASS \(PSI-26\)/ }).click();
  await expect(page).toHaveURL(/ids=PSI-22,PSI-99$/);
  await expect(page.getByRole("region", { name: /Comparison matrix/ })).toContainText("Differs");
});

test("compare: bad ids fall back with a notice", async ({ page }) => {
  await page.goto("/investigations/compare?ids=PSI-9999");
  await expect(page.getByRole("note", { name: "Notices" })).toContainText("PSI-9999");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("BASS-II, SAFFIRE-II, FLEX and ACME BRE");
});

test("views work without JavaScript: links and the GET form drive the selection", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();

  await page.goto("/investigations/compare");
  await page.getByRole("link", { name: /Remove FLEX \(PSI-69\)/ }).click();
  await expect(page).toHaveURL(/ids=PSI-25,PSI-99,PSI-20$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("BASS-II, SAFFIRE-II and ACME BRE");

  await page.goto("/materials");
  await page.getByRole("link", { name: /^Nomex,/ }).click();
  await expect(page).toHaveURL(/m=nomex/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nomex");
  const form = page.getByRole("form", { name: "Custom atmosphere" });
  await form.getByLabel("O₂").fill("30");
  await form.getByLabel("Pressure").fill("10.2");
  await form.getByRole("button", { name: "Screen" }).click();
  await expect(page).toHaveURL(/m=nomex&o2=30&p=10\.2/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Moon Envelope");

  await page.goto("/gravity");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bounds, not predictions");
  await ctx.close();
});

test("materials: evidence sections and the brief link carry the choice", async ({ page }) => {
  await page.goto("/materials?m=kapton&at=iss");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kapton");
  await expect(page.getByText("SAME ran at ISS air (21% O₂, 1 atm); smoke behavior at habitat atmosphere is untested.")).toBeVisible();
  const href = await page.getByRole("link", { name: "Build a brief with this material" }).first().getAttribute("href");
  expect(href).toMatch(/^\/brief\?/);
  expect(href).toContain("m=kapton");
  expect(href).toContain("o2=21");
});

test("gravity: Saffire-II pairs, E-FIELD and the lunar missions are cited", async ({ page }) => {
  await page.goto("/gravity");
  await expect(page.getByRole("region", { name: /Saffire-II microgravity and 1 g burns/ }).locator("tbody tr")).toHaveCount(9);
  await expect(page.getByRole("heading", { name: /E-FIELD/ })).toBeVisible();
  await expect(page.locator('a[href*="ntrs.nasa.gov/citations/20250010653"]')).toHaveCount(1);
  await expect(page.locator('a[href*="flammability-of-materials-on-the-moon-fm2"]')).toHaveCount(1);
});
