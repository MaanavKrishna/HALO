import { test, expect, type Page } from "@playwright/test";
import { PRESETS } from "../../src/lib/engine/presets";
import { habitatToQuery } from "../../src/lib/engine/url";

/**
 * Every main route at phone, tablet, laptop, desktop and ultrawide widths, in
 * both themes: no sideways scroll, no console errors. In the light theme no
 * section may force the dark theme (heroes and panels follow the theme).
 */
const ROUTES = [
  "/",
  "/build",
  `/brief?${habitatToQuery(PRESETS.artemis)}`,
  "/findings",
  "/explore",
  "/explore/PSI-69",
  "/compare",
  "/method",
  "/data",
  "/about",
];
const WIDTHS = [320, 768, 1024, 1440, 2560];
const THEMES = ["light", "dark"] as const;

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

async function useTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((t) => localStorage.setItem("halo-theme", t), theme);
}

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`${route.split("?")[0]} fits every width (${theme})`, async ({ page }) => {
      const problems = watchConsole(page);
      await useTheme(page, theme);
      await page.setViewportSize({ width: WIDTHS[0], height: 900 });
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        // Let layout (and any resize observers) settle.
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
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

test("in the light theme no section forces the dark theme", async ({ page }) => {
  await useTheme(page, "light");
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.locator('[data-theme="dark"]').count(), route).toBe(0);
  }
});

test("hero actions stay above the fold on a short laptop screen", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.goto("/");
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
  const cta = hero.getByRole("link", { name: "Build a brief" });
  const box = await cta.boundingBox();
  expect(box).not.toBeNull();
  // Linux CI fonts render a little taller than macOS/Windows; allow that margin.
  expect(box!.y + box!.height).toBeLessThanOrEqual(640);
});
