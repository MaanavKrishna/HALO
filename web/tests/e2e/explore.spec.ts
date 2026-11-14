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

test("unknown investigation is a 404", async ({ page }) => {
  const res = await page.goto("/explore/PSI-999");
  expect(res?.status()).toBe(404);
});

test("/compare shows two grade badges and the heading", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/compare");
  await expect(page.getByRole("img", { name: /Evidence grade/ })).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What changes when you move from ISS to Artemis Base");
  await expect(page.getByRole("heading", { name: "Summary of the change" })).toBeVisible();
  await page.getByRole("group", { name: "To" }).getByText("Moon", { exact: true }).click();
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
  await expect(page.getByRole("group", { name: "From" }).getByRole("radio", { name: "Custom" })).toBeChecked();
});
