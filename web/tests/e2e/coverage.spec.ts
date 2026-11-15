import { test, expect } from "@playwright/test";
import { LANDING_HEADINGS } from "../../src/components/landing/headings";

test("the evidence coverage map renders and its fuel-class toggle switches the view", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section#coverage");
  await expect(section.getByRole("heading", { level: 2, name: LANDING_HEADINGS.coverage })).toBeAttached();
  const map = section.locator("[data-coverage-map]");
  await map.scrollIntoViewIfNeeded();
  await expect(map.getByRole("img", { name: /^Evidence coverage map/ })).toBeVisible();

  // Real solids by default: Artemis Base grades F on real-solid tests alone.
  const solidPresets = map.getByRole("list", { name: "Preset grades from real-solid tests alone" });
  await expect(solidPresets).toBeVisible();
  await expect(solidPresets.getByRole("img", { name: /^Evidence grade F/ }).first()).toBeVisible();
  await expect(map.getByRole("list", { name: "Preset grades from droplet tests alone" })).toBeHidden();

  // The toggle is plain radio buttons, so it works before (and without) hydration.
  await map.getByText("Droplets", { exact: true }).click();
  await expect(map.getByRole("radio", { name: "Droplets" })).toBeChecked();
  await expect(map.getByRole("list", { name: "Preset grades from droplet tests alone" })).toBeVisible();
  await expect(solidPresets).toBeHidden();
  await expect(map.getByRole("link", { name: "evidence distance" }).first()).toHaveAttribute("href", "/method#distance");
});
