import { test, expect } from "@playwright/test";

test("the habitat probe follows the O2 slider and snaps to presets", async ({ page }) => {
  await page.goto("/");
  const map = page.locator("section#coverage [data-coverage-map]");
  await map.scrollIntoViewIfNeeded();
  const readout = map.locator("[data-probe-readout]");
  await expect(readout).toBeVisible();
  await expect(readout).toHaveAttribute("aria-live", "polite");
  await expect(readout).toContainText("34% O₂ · 8.2 psia");
  const before = await readout.innerText();

  const o2 = map.getByRole("slider", { name: "Your habitat: oxygen" });
  await o2.focus();
  for (let i = 0; i < 20; i++) await o2.press("ArrowLeft");
  await expect(readout).toContainText("24% O₂");
  expect(await readout.innerText()).not.toBe(before);

  const solid = map.getByRole("list", { name: "Preset grades from real-solid tests alone" });
  await solid.getByRole("button", { name: /ISS/ }).click();
  await expect(readout).toContainText("21% O₂ · 14.7 psia");
  await expect(solid.getByRole("button", { name: /ISS/ })).toHaveAttribute("aria-pressed", "true");
  await expect(map.getByRole("link", { name: /Open the full brief/ })).toHaveAttribute("href", /^\/brief\?o2=21&p=14\.7/);
});
