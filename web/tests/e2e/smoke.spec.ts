import { test, expect } from "@playwright/test";

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
  const probe = page.getByTestId("probe");
  await probe.click();
  await expect(probe).toHaveText("Clicked 1 times");
  expect(problems.filter((p) => /content security policy/i.test(p))).toEqual([]);
  expect(problems).toEqual([]);
});
