import { test, expect } from "@playwright/test";

test("design system page renders with a clean console", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));

  await page.goto("/design");
  await expect(page.getByRole("heading", { level: 1, name: "Built like an instrument." })).toBeVisible();
  for (const name of ["Colour", "Type", "Motion", "The halo"]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  // Legacy components keep their accessible names.
  await expect(page.getByRole("img", { name: /^Evidence grade A:/ }).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test("theme toggle sets data-theme on <html> and persists it", async ({ page }) => {
  await page.goto("/design");
  const html = page.locator("html");
  const group = page.getByRole("radiogroup", { name: "Colour theme" }).first();

  await group.getByRole("radio", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");

  await group.getByRole("radio", { name: "Dark" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");

  // Stored choice is applied before paint on the next load.
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.getByRole("radiogroup", { name: "Colour theme" }).first().getByRole("radio", { name: "System" }).click();
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
});

test("navbar collapses into a menu sheet on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design");
  const button = page.getByRole("button", { name: "Open menu" });
  await button.click();
  const sheet = page.locator("#site-menu");
  await expect(sheet.getByRole("link", { name: "Method" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  // Footer keeps the required disclaimer and links the design system.
  await expect(page.getByText("Not affiliated with or endorsed by NASA. Data: NASA Physical Sciences Informatics (CC0).")).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Design system" })).toBeVisible();
});
