import { test, expect } from "@playwright/test";

test("/explore lists all 24 investigations and filters", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(String(e)));
  await page.goto("/explore");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(24);
  await page.getByLabel("Hazard").selectOption("smoke_detection");
  await expect(rows).toHaveCount(4);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(rows).toHaveCount(24);
  await page.getByRole("button", { name: /Rows/ }).click();
  await expect(rows.first()).toContainText("PSI-107");
  expect(problems).toEqual([]);
});

test("/explore/PSI-69 shows FLEX with DOI links", async ({ page }) => {
  await page.goto("/explore/PSI-69");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("FLEX");
  const link = page.getByRole("link", { name: /Open in PSI/ });
  await expect(link).toHaveAttribute("href", "https://psi.nasa.gov/physci/repo/");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(page.getByRole("img", { name: /tested atmospheres/ })).toBeVisible();
});

test("unknown investigation is a 404", async ({ page }) => {
  const res = await page.goto("/explore/PSI-999");
  expect(res?.status()).toBe(404);
});

test("/compare shows two grade badges and the heading", async ({ page }) => {
  await page.goto("/compare");
  await expect(page.getByRole("img", { name: /Evidence grade/ })).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What changes when you move from ISS to Artemis Base");
  await page.getByRole("link", { name: "Moon Envelope" }).last().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("to Moon Envelope");
});
