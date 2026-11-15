import { test, expect } from "@playwright/test";
import { LANDING_HEADINGS } from "../../src/components/landing/headings";
import { PRESETS } from "../../src/lib/engine/presets";
import { habitatToQuery } from "../../src/lib/engine/url";

function watchConsole(page: import("@playwright/test").Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

test("hero CTA opens the builder", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
  await expect(page.getByRole("heading", { level: 1, name: "Where the evidence runs out." })).toBeVisible();
  await hero.getByRole("link", { name: "Build a brief" }).click();
  await page.waitForURL((u) => u.pathname === "/build");
  await expect(page.getByRole("spinbutton", { name: /Oxygen/ })).toHaveValue(String(PRESETS.artemis.o2Pct));
});

test("the Artemis mini-brief shows grade D and links to the real brief", async ({ page }) => {
  await page.goto("/");
  const mini = page.locator("[data-mini-brief]");
  await mini.scrollIntoViewIfNeeded();
  await expect(mini.getByRole("img", { name: /^Evidence grade D/ })).toBeVisible();
  await expect(mini).toContainText("No real cabin material in the PSI data tested at this atmosphere");
  await expect(mini.getByRole("link", { name: "Open the full brief" })).toHaveAttribute(
    "href",
    `/brief?${habitatToQuery(PRESETS.artemis)}`,
  );
});

test("every landing section heading is present, in order", async ({ page }) => {
  await page.goto("/");
  const names = await page.getByRole("heading", { level: 2 }).allTextContents();
  const expected = Object.values(LANDING_HEADINGS);
  expect(names.filter((n) => (expected as readonly string[]).includes(n))).toEqual(expected);
});

test("the landing page loads without console errors", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/");
  // Scroll through so every reveal and prefetch fires.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(500);
  expect(problems).toEqual([]);
});

test("the landing page does not scroll sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(390);
});

test("the mini-brief speaks plainly: no ppO2, no bare d, no grade-cap jargon", async ({ page }) => {
  await page.goto("/");
  const mini = page.locator("[data-mini-brief]");
  await mini.scrollIntoViewIfNeeded();
  await expect(mini).not.toContainText("ppO");
  await expect(mini).not.toContainText(/capped/);
  await expect(mini).not.toContainText(/\bd \d/);
  await expect(mini).toContainText("psia of it oxygen");
  await expect(mini.locator("svg text").filter({ hasText: /away$/ })).toHaveCount(1);
  await mini.getByRole("button", { name: "What “away” means" }).click();
  await expect(mini.getByRole("tooltip").filter({ hasText: "Evidence distance" })).toBeVisible();
});

test("the hero states the gap from the data, and the top nav reaches Materials and Gravity", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
  await expect(hero).toContainText(`${PRESETS.artemis.o2Pct}% O2 at ${PRESETS.artemis.pressurePsia} psia`);
  await expect(hero).toContainText("HALO shows what that gap means for your habitat.");
  await expect(page.getByText("one-page")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Materials" })).toHaveAttribute("href", "/materials");
  await expect(nav.getByRole("link", { name: "Gravity" })).toHaveAttribute("href", "/gravity");
  const pillars = page.locator("section", { has: page.getByRole("heading", { name: LANDING_HEADINGS.pillars }) });
  await expect(pillars.getByRole("link", { name: /Material screener/ })).toHaveAttribute("href", "/materials");
  await expect(pillars.getByRole("link", { name: /Partial-gravity bounds/ })).toHaveAttribute("href", "/gravity");
});

test("/investigations redirects to /explore, and a brief is titled with its habitat", async ({ page, request }) => {
  const res = await request.get("/investigations", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/explore");
  await page.goto(`/brief?${habitatToQuery(PRESETS.artemis)}`);
  await expect(page).toHaveTitle(`${PRESETS.artemis.name} Fire Brief · HALO`);
});
