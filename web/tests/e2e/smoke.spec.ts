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

  await page.goto("/");
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
    await page.goto("/");
    await page.locator(`[data-preset="${id}"]`).click();
    await page.getByRole("button", { name: "Generate brief" }).click();
    await page.waitForURL((u) => u.pathname === "/brief");
    expect(new URL(page.url()).search.slice(1)).toBe(habitatToQuery(habitat));
  }
});
