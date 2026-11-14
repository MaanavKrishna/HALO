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
  // Focus stays inside the menu: Tab through more items than it holds.
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const a = document.activeElement;
      return !!a && (!!a.closest("#site-menu") || a.getAttribute("aria-controls") === "site-menu");
    });
    expect(inside).toBe(true);
  }
  await expect(page.locator("#main")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  await expect(page.locator("#main")).not.toHaveAttribute("inert", "");
  // Footer keeps the required disclaimer and links the design system.
  await expect(page.getByText("Not affiliated with or endorsed by NASA. Data: NASA Physical Sciences Informatics (CC0).")).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Design system" })).toBeVisible();
});

test("tooltip opens on click and stays open; Escape closes it", async ({ page }) => {
  await page.goto("/design");
  const trigger = page.getByRole("button", { name: "what is this?" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const tip = page.getByRole("tooltip").filter({ hasText: "It grades evidence" });
  await expect(tip).toBeVisible();
  await page.waitForTimeout(400);
  await expect(tip).toBeVisible();
  // Hovering the tip itself keeps it open (WCAG 1.4.13).
  await tip.hover();
  await page.waitForTimeout(300);
  await expect(tip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
});

test("tooltip opens on tap without closing again", async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/design");
  const trigger = page.getByRole("button", { name: "what is this?" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.tap();
  await expect(page.getByRole("tooltip").filter({ hasText: "It grades evidence" })).toBeVisible();
  await ctx.close();
});
