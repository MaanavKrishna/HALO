import { test, expect } from "@playwright/test";
import { PRESETS } from "../../src/lib/engine/presets";
import { habitatToQuery } from "../../src/lib/engine/url";

test("headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
});

test("page hydrates with no CSP violations", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));

  await page.goto("/build");
  await expect(page.getByRole("heading", { name: "HALO" })).toBeVisible();
  const o2 = page.getByRole("spinbutton", { name: /Oxygen/ });
  await expect(o2).toHaveValue(String(PRESETS.artemis.o2Pct));
  // A preset click only changes the field once React has hydrated.
  await page.getByRole("button", { name: /^ISS/ }).click();
  await expect(o2).toHaveValue(String(PRESETS.iss.o2Pct));
  expect(problems.filter((p) => /content security policy/i.test(p))).toEqual([]);
  expect(problems).toEqual([]);
});

test("each preset generates the matching brief URL", async ({ page }) => {
  for (const [id, habitat] of Object.entries(PRESETS)) {
    await page.goto("/build");
    await page.locator(`[data-preset="${id}"]`).click();
    await page.getByRole("button", { name: "Generate brief" }).click();
    await page.waitForURL((u) => u.pathname === "/brief");
    expect(new URL(page.url()).search.slice(1)).toBe(habitatToQuery(habitat));
  }
});

test("editing a loaded preset marks the name as modified", async ({ page }) => {
  await page.goto("/build");
  await page.locator('[data-preset="artemis"]').click();
  const o2 = page.getByRole("spinbutton", { name: /Oxygen/ });
  await o2.fill("27");
  await expect(page.getByRole("textbox", { name: "Habitat name" })).toHaveValue("Artemis Base (modified)");
  await page.getByRole("button", { name: "Generate brief" }).click();
  await page.waitForURL((u) => u.pathname === "/brief");
  const q = new URL(page.url()).searchParams;
  expect(q.get("n")).toBe("Artemis Base (modified)");
  expect(q.get("o2")).toBe("27");
});

const briefUrl = (id: keyof typeof PRESETS) => `/brief?${habitatToQuery(PRESETS[id])}`;

function watchConsole(page: import("@playwright/test").Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

test("Artemis brief shows grade D and the detector miss", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(briefUrl("artemis"));
  await expect(page.getByRole("heading", { level: 1, name: "Artemis Base" })).toBeVisible();
  await expect(page.locator('[data-grade="D"]')).toBeVisible();
  await expect(page.getByRole("img", { name: /^Evidence grade D/ })).toBeVisible();
  await expect(page.getByText("would likely miss").first()).toBeVisible();
  await expect(page.getByText("HALO summarizes published NASA test evidence. It is not a safety certification.")).toBeVisible();
  // The halo chart is present with its accessible title.
  await expect(page.getByRole("img", { name: /Evidence halo for Artemis Base/ })).toBeVisible();
  await expect(page.locator("[data-hidden-above]")).toContainText(/\d+ tests above 20 psia not shown/);
  expect(problems).toEqual([]);
});

test("ISS brief still shows the SAME ISS-air caveat on the detection card", async ({ page }) => {
  await page.goto(briefUrl("iss"));
  await expect(page.locator("[data-iss-air]")).toContainText(
    "SAME ran at ISS air (21% O2, 1 atm); smoke behavior at habitat atmosphere is untested",
  );
});

test("sensor what-if toggles to scatter + ionization", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const bars = page.locator("[data-detector]");
  await expect(bars).toHaveAttribute("data-detector", "scatter");
  await page.getByRole("radio", { name: "Scatter + ionization" }).check();
  await expect(bars).toHaveAttribute("data-detector", "scatter-ionization");
  await expect(bars).toContainText("of 35 runs caught");
});

test("print media hides the nav and the action buttons", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Artemis Base" })).toBeVisible();
});

test("a garbled brief URL renders notices instead of crashing", async ({ page }) => {
  const problems = watchConsole(page);
  const res = await page.goto("/brief?o2=abc&p=0&m=constructor");
  expect(res?.status()).toBe(200);
  const notices = page.locator("[data-notices]");
  await expect(notices).toBeVisible();
  await expect(notices).toContainText("is not a number");
  await expect(notices).toContainText("outside");
  await expect(notices).toContainText("Unknown material ignored: constructor");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("This section could not be computed")).toHaveCount(0);
  expect(problems).toEqual([]);
});
