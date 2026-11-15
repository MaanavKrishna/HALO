import { test, expect, type Page } from "@playwright/test";

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

test("tests.csv: header row and one line per eligible row", async ({ request }) => {
  const manifest = await (await request.get("/data/files/manifest.json")).json();
  const r = await request.get("/data/files/tests.csv");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toMatch(/^text\/csv/);
  const lines = (await r.text()).trim().split("\n");
  expect(lines[0]).toBe("id,psiId,acronym,fuelClass,fuel,geometry,o2Pct,o2Src,pressurePsia,pSrc,flowCmS,flowSrc,outcome,diluent,datasetDoi");
  expect(lines.length - 1).toBe(manifest.eligibleRows);
  expect("tests.csv" in manifest.files).toBe(true);
});

test("per-investigation CSV from the spec sheet", async ({ page, request }) => {
  await page.goto("/explore/PSI-159");
  const link = page.getByRole("link", { name: /Download \d+ rows \(CSV\)/ });
  await expect(link).toBeVisible();
  const n = Number((await link.textContent())!.match(/\d+/)![0]);
  const href = await link.getAttribute("href");
  expect(href).toBe("/data/files/tests-PSI-159.csv");
  const lines = (await (await request.get(href!)).text()).trim().split("\n");
  expect(lines.length - 1).toBe(n);
  expect(lines.slice(1).every((l) => l.startsWith("PSI-159:"))).toBe(true);
  expect((await request.get("/data/files/tests-PSI-999.csv")).status()).toBe(404);
});

test("suppression finding card with its figure, sources and brief link", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/findings");
  const card = page.locator("#diluent-suppression");
  await expect(card.getByRole("heading", { level: 2 })).toContainText("FLEX droplet burns");
  await expect(card.getByRole("img", { name: /went out on its own, by inert gas/ }).first()).toBeAttached();
  await expect(card.getByRole("link", { name: /Flame Extinguishment Experiment/ })).toBeVisible();
  await expect(card).toContainText("not tests of an extinguisher or a suppression system");
  const moon = page.locator("#moon-window");
  await expect(moon.getByRole("group", { name: /burn outcomes: 13 self-extinguished, 5 flow stopped, 2 no ignition/ })).toBeVisible();
  await card.getByRole("link", { name: /See it in the .* brief/ }).click();
  await expect(page).toHaveURL(/\/brief\?.*l=1/);
  expect(problems).toEqual([]);
});

test.describe("explore sample and sensors (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("column, SI-badged sensors and search filter", async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto("/explore");
    await expect(page.getByRole("columnheader", { name: "Sample · sensors" })).toBeVisible();
    const rows = page.locator("tbody tr");
    const flex = rows.filter({ hasText: "PSI-69" });
    await expect(flex).toContainText("Free droplets");
    await page.getByRole("searchbox", { name: "Sample or sensor" }).fill("radiometers");
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(24);
    await expect(page.getByRole("status").filter({ hasText: "Showing" })).toHaveText(`Showing ${n} of 24 investigations`);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(rows).toHaveCount(24);
    expect(problems).toEqual([]);
  });
});

test("spec sheet shows geometry, SI sensors and the HALO label note", async ({ page }) => {
  await page.goto("/explore/PSI-25");
  const sheet = page.getByRole("complementary", { name: "Spec sheet" });
  await expect(sheet).toContainText("Sample geometry");
  await expect(sheet).toContainText("PMMA rods");
  await expect(sheet.getByRole("list", { name: "Sensors listed in the summary" })).toBeVisible();
  await page.goto("/explore/PSI-60");
  await expect(page.getByRole("complementary", { name: "Spec sheet" })).toContainText("HALO label");
});
