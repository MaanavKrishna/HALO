import { test, expect, type Page } from "@playwright/test";

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

test.describe("explore table (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("/explore lists all 24 investigations, filters and sorts", async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto("/explore");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("24 investigations. Every one cited.");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(24);
    const status = page.getByRole("status").filter({ hasText: "Showing" });
    await expect(status).toHaveText("Showing 24 of 24 investigations");

    await page.getByRole("checkbox", { name: "Smoke detection" }).check();
    await expect(rows).toHaveCount(4);
    await expect(status).toHaveText("Showing 4 of 24 investigations");
    // A second hazard widens the match (any selected hazard).
    await page.getByRole("checkbox", { name: "Toxicity" }).check();
    await expect(rows).toHaveCount(6);
    // Fuel class narrows it.
    await page.getByRole("group", { name: "Fuel class" }).getByText("Gas", { exact: true }).click();
    await expect(rows).toHaveCount(2);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(rows).toHaveCount(24);

    const rowsHeader = page.getByRole("columnheader", { name: /Rows/ });
    await expect(rowsHeader).toHaveAttribute("aria-sort", "none");
    await page.getByRole("button", { name: /Rows/ }).click();
    await expect(rowsHeader).toHaveAttribute("aria-sort", "descending");
    await expect(rows.first()).toContainText("PSI-107");
    expect(problems).toEqual([]);
  });

  test("/explore patch view shows every investigation", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("group", { name: "View" }).getByText("Patches").click();
    await expect(page.getByRole("list", { name: "Investigations" }).locator(":scope > li")).toHaveCount(24);
  });
});

test("/explore shows cards on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explore");
  await expect(page.getByRole("list", { name: "Investigations" }).locator(":scope > li")).toHaveCount(24);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("/explore/PSI-69 shows FLEX with DOI links", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/explore/PSI-69");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("FLEX");
  const link = page.getByRole("link", { name: /Open in PSI/ });
  await expect(link).toHaveAttribute("href", "https://psi.nasa.gov/physci/repo/");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(page.getByRole("img", { name: /tested atmospheres/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^10\./ }).first()).toHaveAttribute("href", /^https:\/\/doi\.org\//);
  expect(problems).toEqual([]);
});

test("/explore/PSI-21 shows the assumed air conditions, PSI-102 none", async ({ page }) => {
  await page.goto("/explore/PSI-21");
  const spec = page.getByRole("complementary", { name: "Spec sheet" });
  await expect(spec).toContainText("Assumed");
  await expect(spec).not.toContainText("No test conditions in PSI");
  await page.goto("/explore/PSI-102");
  await expect(page.getByRole("complementary", { name: "Spec sheet" }).first()).toContainText("No test conditions in PSI");
  await page.goto("/explore");
  const cld = page.locator("tbody tr", { hasText: "ACME CLD Flame" });
  await expect(cld).toContainText("21%");
  await expect(cld).toContainText("Assumed");
});

test("prev/next navigation walks investigations in PSI order", async ({ page }) => {
  await page.goto("/explore/PSI-69");
  const nav = page.getByRole("navigation", { name: "Other investigations" });
  await nav.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/\/explore\/PSI-98$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SAFFIRE-I");
  await page.getByRole("navigation", { name: "Other investigations" }).getByRole("link", { name: /Previous/ }).click();
  await expect(page).toHaveURL(/\/explore\/PSI-69$/);
  // The first investigation has no previous link.
  await page.goto("/explore/PSI-10");
  await expect(page.getByRole("navigation", { name: "Other investigations" }).getByRole("link", { name: /Previous/ })).toHaveCount(0);
});

test("unknown investigation is a styled 404 that hydrates cleanly", async ({ page }) => {
  const problems = watchConsole(page);
  const res = await page.goto("/explore/PSI-999");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Investigation not found");
  await page.waitForTimeout(1500);
  // The browser always logs the document's own 404 status; anything else (a hydration error) fails.
  expect(problems.filter((m) => !/Failed to load resource: the server responded with a status of 404/.test(m))).toEqual([]);
});

test("/compare shows two grade badges and the heading", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/compare");
  await expect(page.getByRole("img", { name: /Evidence grade/ })).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What changes when you move from ISS to Artemis Base");
  await expect(page.getByRole("heading", { name: "Summary of the change" })).toBeVisible();
  const to = page.getByRole("group", { name: "To" });
  await expect(to.getByRole("link", { name: "Artemis" })).toHaveAttribute("aria-current", "page");
  await to.getByRole("link", { name: "Moon", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("to Moon Envelope");
  await expect(page).toHaveURL(/b=/);
  expect(problems).toEqual([]);
});

test("/compare with unreadable params shows notices and the default heading", async ({ page }) => {
  await page.goto("/compare?a=garbage&b=garbage");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What changes when you move from ISS to Artemis Base");
  const notes = page.getByRole("note", { name: "Notices" });
  await expect(notes).toContainText('Could not read habitat "a"');
  await expect(notes).toContainText('Could not read habitat "b"');
  await expect(page.getByRole("img", { name: /Evidence grade/ })).toHaveCount(2);
});

test("/compare surfaces out-of-range value notices", async ({ page }) => {
  await page.goto("/compare?a=" + encodeURIComponent("o2=250&p=14.7&n=Test"));
  await expect(page.getByRole("note", { name: "Notices" })).toContainText("outside");
  // A custom habitat gets its own picker option.
  await expect(page.getByRole("group", { name: "From" }).getByRole("link", { name: "Custom" })).toHaveAttribute("aria-current", "page");
});

test("/compare pickers are plain links: real hrefs in the HTML, no navigation on arrow keys", async ({ page, request }) => {
  // No-JS: the server HTML carries ordinary <a href> links for every preset (no client handler needed).
  const html = await (await request.get("/compare")).text();
  expect(html).toMatch(/<a[^>]+href="\/compare\?a=[^"]+"[^>]*>Rover<\/a>/);
  expect(html).toMatch(/aria-current="page"/);
  // With JS: arrow keys move focus only; they never change the comparison (WCAG 3.2.2).
  await page.goto("/compare");
  const from = page.getByRole("group", { name: "From" });
  await from.getByRole("link", { name: "ISS", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/\/compare$/);
  await from.getByRole("link", { name: "Rover", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What changes when you move from Pressurized Rover to Artemis Base");
});

test("FLEX-2 marks its design-matrix ranges as inferred", async ({ page }) => {
  await page.goto("/explore/PSI-68");
  await expect(page.getByRole("complementary", { name: "Spec sheet" })).toContainText("design matrix");
  await expect(page.getByRole("complementary", { name: "Spec sheet" })).toContainText("Inferred");
});

test("/compare works without JavaScript: clicking a picker navigates", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/compare");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What changes when you move from ISS to Artemis Base");
  await page.getByRole("group", { name: "From" }).getByRole("link", { name: "Rover", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What changes when you move from Pressurized Rover to Artemis Base");
  await expect(page.getByRole("img", { name: /Evidence grade/ })).toHaveCount(2);
  await ctx.close();
});
