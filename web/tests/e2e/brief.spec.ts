import { test, expect, type Page } from "@playwright/test";
import { PRESETS } from "../../src/lib/engine/presets";
import { habitatToQuery } from "../../src/lib/engine/url";

const briefUrl = (id: keyof typeof PRESETS) => `/brief?${habitatToQuery(PRESETS[id])}`;

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

test("Artemis brief: grade D in the hero, a detector miss, no console problems", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(briefUrl("artemis"));
  await expect(page.getByRole("heading", { level: 1, name: "Artemis Base" })).toBeVisible();
  await expect(page.locator('[data-grade="D"]')).toBeVisible();
  await expect(page.getByRole("img", { name: /^Evidence grade D/ })).toBeVisible();
  await expect(page.getByText("would likely miss").first()).toBeVisible();
  // The grade reason names the test plainly (no "an SAME" / "an FLEX" article guesses).
  await expect(page.locator(".grade-panel")).not.toContainText(/\ban? [A-Z]{2,}/);
  // Flags are callouts with cited fact chips.
  const crit = page.locator('[data-flags] [data-severity="critical"]').first();
  await expect(crit.locator("a.fact-chip").first()).toHaveAttribute("href", /^#cite-\d+$/);
  expect(problems).toEqual([]);
});

test("the halo chart is keyboard-inspectable", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const chart = page.getByRole("group", { name: /Evidence halo/ });
  await chart.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".halo-chart [aria-live]")).toContainText("Evidence distance");
});

const LIVE = {
  text: "Artemis Base sits far from tested solids [cov-solid-distance]. Scatter detectors missed Kapton smoke in SAME [det-kapton-scatter-low].",
  factIds: ["cov-solid-distance", "det-kapton-scatter-low"],
  source: "live",
};

test("Ask HALO shows live SI text with clickable fact chips", async ({ page }) => {
  let body: unknown = null;
  await page.route("**/api/explain", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIVE) });
  });
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  // The precomputed narrative is there before any request.
  await expect(panel).toContainText("Evidence grade D.");
  await panel.getByLabel("Ask about this brief").fill("Why is the grade low?");
  await expect(panel).toContainText("21/300");
  await panel.getByRole("button", { name: "Generate SI narration" }).click();
  await expect(panel).toHaveAttribute("data-state", "live");
  await expect(panel).toContainText("Artemis Base sits far from tested solids");
  expect(body).toEqual({ query: habitatToQuery(PRESETS.artemis), question: "Why is the grade low?" });
  // Every SI sentence carries an SI chip; citations are chips, not bracket text.
  await expect(panel.locator("[data-narrative]").getByText("SI", { exact: true })).toHaveCount(2);
  await expect(panel).not.toContainText("[cov-solid-distance]");
  const chip = panel.locator('[data-fact-chip="det-kapton-scatter-low"]');
  await chip.click();
  // The cited fact elsewhere on the page flashes.
  await expect(page.locator(".fact-flash")).toHaveCount(1);
});

test("Ask HALO keeps the precomputed narrative on a 503", async ({ page }) => {
  await page.route("**/api/explain", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ text: "x", factIds: [], source: "fallback" }) }),
  );
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  await panel.getByRole("button", { name: "Generate SI narration" }).click();
  await expect(panel.getByText("Showing precomputed narrative")).toBeVisible();
  await expect(panel).toHaveAttribute("data-state", "fallback");
  await expect(panel).toContainText("Evidence grade D.");
});

test("Ask HALO keeps the precomputed narrative when the request fails", async ({ page }) => {
  await page.route("**/api/explain", (route) => route.abort("failed"));
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  await panel.getByRole("button", { name: "Generate SI narration" }).click();
  await expect(panel.getByText("Showing precomputed narrative")).toBeVisible();
  await expect(panel).toContainText("Evidence grade D.");
});

test("print media hides the nav, the sticky bar and the precomputed Ask HALO panel", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await expect(page.locator("[data-brief-bar]")).toBeHidden();
  // The precomputed narrative repeats the flags, so it is left off paper.
  await expect(page.locator("#explain")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Artemis Base" })).toBeVisible();
});

test("print keeps a live SI narration with its fact chips as plain citations", async ({ page }) => {
  await page.route("**/api/explain", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIVE) }),
  );
  await page.goto(briefUrl("artemis"));
  await page.locator("[data-ask]").getByRole("button", { name: "Generate SI narration" }).click();
  await expect(page.locator("[data-ask]")).toHaveAttribute("data-state", "live");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-ask] [data-narrative]")).toBeVisible();
  await expect(page.locator("[data-ask] form")).toBeHidden();
  const chip = page.locator('[data-fact-chip="cov-solid-distance"]');
  await expect(chip).toBeVisible();
  await expect(chip.locator(".chip-jump")).toBeHidden();
});

test("citation marks read as [n], never as superscripts", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const marks = page.locator('#detection a[aria-label^="source "]');
  await expect(marks.first()).toHaveText(/^\[\d+\]$/);
  expect(await page.locator("#main sup").count()).toBe(0);
});

test("the sticky brief bar appears once the hero scrolls away", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const bar = page.locator("[data-brief-bar]");
  await expect(bar).toHaveAttribute("data-visible", "false");
  await page.locator("#evidence").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("data-visible", "true");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Print" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toHaveAttribute("data-visible", "false");
});

test("focus inside the sticky bar moves to the hero action when the bar hides", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const bar = page.locator("[data-brief-bar]");
  await page.locator("#evidence").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("data-visible", "true");
  await bar.getByRole("button", { name: "Print" }).focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toHaveAttribute("data-visible", "false");
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeFocused();
});

test("EVA suit brief renders with its off-axis habitat column", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(briefUrl("suit"));
  await expect(page.locator('[data-grade="F"]')).toBeVisible();
  await expect(page.getByRole("img", { name: /Evidence halo for EVA Suit/ })).toBeVisible();
  expect(problems).toEqual([]);
});
