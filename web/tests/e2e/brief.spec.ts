import { test, expect, type Page } from "@playwright/test";
import { PRESETS } from "../../src/lib/engine/presets";
import { habitatToQuery } from "../../src/lib/engine/url";

const briefUrl = (id: keyof typeof PRESETS) => `/brief?${habitatToQuery(PRESETS[id])}`;

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return problems;
}

test("Artemis brief: grade D in the hero, a detector miss, no console problems", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(briefUrl("artemis"));
  await expect(page.getByRole("heading", { level: 1, name: "Artemis Base" })).toBeVisible();
  await expect(page.locator('[data-grade="D"]')).toBeVisible();
  await expect(page.getByRole("img", { name: /^Evidence grade D/ })).toBeVisible();
  await expect(page.getByText("would likely miss").first()).toBeVisible();
  // The grade reason names the test plainly (no "an SAME" / "an FLEX" article guesses).
  await expect(page.locator(".grade-panel")).not.toContainText(/\ban? [A-Z]{2,}/);
  // Flags are callouts with cited fact chips.
  const crit = page.locator('[data-flags] [data-severity="critical"]').first();
  await expect(crit.locator("a.fact-chip").first()).toHaveAttribute("href", /^#cite-\d+$/);
  expect(problems).toEqual([]);
});

test("the halo chart is keyboard-inspectable", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const chart = page.getByRole("group", { name: /Evidence halo/ });
  await chart.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".halo-chart [aria-live]")).toContainText("Evidence distance");
});

const LIVE = {
  text: "Artemis Base sits far from tested solids [cov-solid-distance]. Scatter detectors missed Kapton smoke in SAME [det-kapton-scatter-low].",
  factIds: ["cov-solid-distance", "det-kapton-scatter-low"],
  source: "live",
};

test("Ask HALO shows live SI text with clickable fact chips", async ({ page }) => {
  let body: unknown = null;
  await page.route("**/api/explain", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIVE) });
  });
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  // The question box is there at once; the precomputed narrative waits behind its disclosure.
  await expect(panel.getByLabel("Ask about this brief")).toBeVisible();
  const pre = panel.locator("[data-precomputed]");
  await expect(pre.getByText("Evidence grade D.")).toBeHidden();
  // Suggestion chips render only after hydration; wait so the click is not undone by React taking over.
  await expect(panel.locator("[data-suggestion]").first()).toBeVisible();
  await pre.getByText("Read the plain-words summary").click();
  await expect(pre.getByText("Evidence grade D.")).toBeVisible();
  // Precomputed chips are compact: a value or a source number, never a label, and no repeated neighbours.
  const texts = await pre.locator("[data-fact-chip]").evaluateAll((els) =>
    els.map((el) => [...el.querySelectorAll('[aria-hidden="true"]')].map((x) => x.textContent).join(" ")),
  );
  expect(texts.length).toBeGreaterThan(3);
  for (const t of texts) expect(t).toMatch(/^(-?[\d.]+\S*( \S+)? )?\[\d+\]$/);
  await panel.getByLabel("Ask about this brief").fill("Why is the grade low?");
  await expect(panel).toContainText("21/300");
  await panel.getByRole("button", { name: "Generate SI narration" }).click();
  await expect(panel).toHaveAttribute("data-state", "live");
  await expect(panel).toContainText("Artemis Base sits far from tested solids");
  expect(body).toEqual({ query: habitatToQuery(PRESETS.artemis), question: "Why is the grade low?" });
  // Every SI paragraph carries the SI badge; citations are chips, not bracket text.
  await expect(panel.locator("[data-narrative] p:not(.sr-only)")).toHaveCount(1);
  await expect(panel.locator("[data-narrative]").getByText("SI", { exact: true })).toHaveCount(1);
  await expect(panel.locator("[data-narrative] .sr-only").first()).toContainText("SI-generated from the cited facts");
  await expect(panel).not.toContainText("[cov-solid-distance]");
  const chip = panel.locator('[data-fact-chip="det-kapton-scatter-low"]');
  await chip.click();
  // The cited fact elsewhere on the page flashes.
  await expect(page.locator(".fact-flash")).toHaveCount(1);
});

test("leaving a live answer opens the precomputed summary and focuses its toggle", async ({ page }) => {
  // Two paragraphs: a paragraph ends after a sentence that closes with its citations.
  const two = { ...LIVE, text: "Artemis Base sits far from tested solids. [cov-solid-distance] Scatter detectors missed Kapton smoke in SAME. [det-kapton-scatter-low]" };
  await page.route("**/api/explain", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(two) }),
  );
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  await panel.getByRole("button", { name: "Generate SI narration" }).click();
  await expect(panel).toHaveAttribute("data-state", "live");
  // Every SI paragraph is marked, not only the first.
  await expect(panel.locator("[data-narrative] p:not(.sr-only)")).toHaveCount(2);
  await expect(panel.locator("[data-narrative] [data-si-chip]")).toHaveCount(2);
  await panel.getByRole("button", { name: "Show the precomputed narrative" }).click();
  await expect(panel).toHaveAttribute("data-state", "fallback");
  await expect(panel.getByText("Evidence grade D.")).toBeVisible();
  await expect(panel.locator("[data-precomputed] > summary")).toBeFocused();
  await expect(panel.locator("[data-fallback-notice]")).toHaveCount(0);
});

test("Ask HALO keeps the precomputed narrative on a 503", async ({ page }) => {
  await page.route("**/api/explain", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ text: "x", factIds: [], source: "fallback" }) }),
  );
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  await panel.getByRole("button", { name: "Generate SI narration" }).click();
  await expect(panel.getByText("Showing precomputed narrative")).toBeVisible();
  await expect(panel).toHaveAttribute("data-state", "fallback");
  // The fallback opens the precomputed summary for the reader.
  await expect(panel.getByText("Evidence grade D.")).toBeVisible();
});

test("Ask HALO keeps the precomputed narrative when the request fails", async ({ page }) => {
  await page.route("**/api/explain", (route) => route.abort("failed"));
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  await panel.getByRole("button", { name: "Generate SI narration" }).click();
  await expect(panel.getByText("Showing precomputed narrative")).toBeVisible();
  await expect(panel.getByText("Evidence grade D.")).toBeVisible();
});

test("print media hides the nav, the sticky bar and the precomputed Ask HALO panel", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await expect(page.locator("[data-brief-bar]")).toBeHidden();
  // The precomputed narrative repeats the flags, so it is left off paper.
  await expect(page.locator("#explain")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Artemis Base" })).toBeVisible();
});

test("print keeps a live SI narration with its fact chips as plain citations", async ({ page }) => {
  await page.route("**/api/explain", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIVE) }),
  );
  await page.goto(briefUrl("artemis"));
  await page.locator("[data-ask]").getByRole("button", { name: "Generate SI narration" }).click();
  await expect(page.locator("[data-ask]")).toHaveAttribute("data-state", "live");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-ask] [data-narrative]")).toBeVisible();
  await expect(page.locator("[data-ask] form")).toBeHidden();
  const chip = page.locator('[data-fact-chip="cov-solid-distance"]');
  await expect(chip).toBeVisible();
  await expect(chip.locator(".chip-jump")).toBeHidden();
});

test("citation marks read as [n], never as superscripts", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const marks = page.locator('#detection a[aria-label^="source "]');
  await expect(marks.first()).toHaveText(/^\[\d+\]$/);
  expect(await page.locator("#main sup").count()).toBe(0);
});

test("the sticky brief bar appears once the hero scrolls away", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const bar = page.locator("[data-brief-bar]");
  await expect(bar).toHaveAttribute("data-visible", "false");
  await page.locator("#evidence").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("data-visible", "true");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Print" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toHaveAttribute("data-visible", "false");
});

test("focus inside the sticky bar moves to the hero action when the bar hides", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const bar = page.locator("[data-brief-bar]");
  await page.locator("#evidence").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("data-visible", "true");
  await bar.getByRole("button", { name: "Print" }).focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toHaveAttribute("data-visible", "false");
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeFocused();
});

test("EVA suit brief renders with its off-axis habitat column", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(briefUrl("suit"));
  await expect(page.locator('[data-grade="F"]')).toBeVisible();
  await expect(page.getByRole("img", { name: /Evidence halo for EVA Suit/ })).toBeVisible();
  expect(problems).toEqual([]);
});

test("the grade reads in plain words first, with the rule one click away", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const panel = page.locator(".grade-panel");
  await expect(panel.locator("[data-grade-reason]")).toContainText("would grade F");
  await expect(panel.locator("[data-grade-reason]")).not.toContainText(/evidence distance|capped/);
  await expect(panel.locator("[data-grade-technical]")).toBeHidden();
  await panel.getByText("How the grade is set").click();
  await expect(panel.locator("[data-grade-technical]")).toContainText("ACME BRE");
  // The lift rests on a pressure the experiment did not log; the brief says so and names the grade without it.
  await expect(panel.locator("[data-grade-caveat]")).toContainText("inferred it from the investigation\u2019s stated objective");
  await expect(panel.locator("[data-grade-caveat]")).toContainText("the grade would be F");
});

test("Rover (5 cm/s) and Moon (10 cm/s) briefs show different air flow in the evidence", async ({ page }) => {
  const problems = watchConsole(page);
  const flowText = async (id: "rover" | "moon") => {
    await page.goto(briefUrl(id));
    const line = page.locator('[data-nearest] [data-flow="solid"]');
    await expect(line).toBeVisible();
    await expect(page.locator("[data-flow-callout]")).toContainText("Your cabin runs at");
    return { line: await line.innerText(), callout: await page.locator("[data-flow-callout]").innerText() };
  };
  const rover = await flowText("rover");
  const moon = await flowText("moon");
  expect(rover.line).toContain("yours 5 cm/s");
  expect(moon.line).toContain("yours 10 cm/s");
  expect(rover.line).not.toEqual(moon.line);
  expect(rover.callout).not.toEqual(moon.callout);
  // Droplet tests ran in still air, so a ventilated cabin is outside their flow range.
  await expect(page.locator('[data-flow="droplet"]')).toHaveAttribute("data-flow-inside", "false");
  expect(problems).toEqual([]);
});

test("Next test is read against Saffire and names LUCI and FM2", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const card = page.locator("[data-next-test]");
  await expect(card.locator("[data-next-literature]")).toContainText("This is not a first burn.");
  await expect(card.locator("[data-next-literature]")).toContainText("Saffire V and Saffire VI");
  await expect(card.locator("[data-next-literature]")).toContainText("The gap is the archive");
  await expect(card.locator("[data-next-archive]")).toContainText("If the Saffire IV–VI runs were archived in PSI");
  const vehicles = card.locator("[data-next-vehicles]");
  await expect(vehicles).toContainText("Lunar Combustion Investigation (LUCI)");
  await expect(vehicles).toContainText("Flammability of Materials on the Moon (FM2)");
  await expect(vehicles.getByRole("link", { name: /NASA page/ }).nth(1)).toHaveAttribute("href", /flammability-of-materials-on-the-moon-fm2/);
  // The panel badge is "Computed" (arithmetic on data), not "Model" (a fitted model).
  await expect(page.locator('#next-test [title^="Arithmetic on the data"]').first()).toContainText("Computed");
});

test("Earth card cites the ISS water-mist extinguisher and ties each Spinoff to a finding", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const earth = page.locator("[data-earth]");
  await expect(earth.locator("li")).toHaveCount(4);
  const mist = earth.locator('[data-earth-item="earth-water-mist"]');
  await expect(mist).toContainText("fine-water-mist");
  await expect(mist.getByRole("link", { name: /Zero-Leak Valve/ })).toHaveAttribute("href", "https://spinoff.nasa.gov/node/11065");
  await expect(earth.locator('[data-earth-item="earth-fire-detector"] a[href="#detection"]')).toBeVisible();
  await expect(earth.locator('[data-earth-item="earth-air-tanks"] a[href="#aftermath"]')).toBeVisible();
  // The Saffire VI CO and CO2 tie is written once, not on every aftermath item.
  await expect(earth.getByText(/24-hour crew limit/)).toHaveCount(1);
  await expect(earth.getByText(/24-hour crew limit/)).toContainText("but stayed below the 1-hour limit");
});

test("ranked investigations open from three one-line rows to the full list", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const section = page.locator("#ranked");
  await expect(section.locator("[data-ranking-note]")).toContainText("SAME-R and SAME rank low because they only ran in ISS air, even though they hold the flight smoke-detector data");
  const top = section.locator("[data-ranked-top] > li");
  await expect(top).toHaveCount(3);
  await expect(top.first()).toContainText("ACME BRE");
  const ranked = section.locator("[data-ranked]");
  await expect(ranked).toBeHidden();
  await section.getByText("Show all 8 and details").click();
  await expect(ranked.locator("> li")).toHaveCount(8);
  await expect(section.locator("[data-ranked-top]")).toBeHidden();
  await expect(ranked.locator("[data-ranked-fuels]").first()).toBeVisible();
  // A PSI placeholder cell is never listed as a fuel.
  await expect(ranked).not.toContainText(/see previous row/i);
  const sensors = ranked.locator("[data-ranked-sensors]").first();
  await expect(sensors).toBeVisible();
  await expect(sensors.getByText("SI", { exact: true })).toBeVisible();
  await section.getByText("Show only the top 3").click();
  await expect(top).toHaveCount(3);
  await expect(ranked).toBeHidden();
});

test("print shows the full ranked rows even when the list is collapsed on screen", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-ranked-top]")).toBeHidden();
  await expect(page.locator("[data-ranked] > li").first()).toBeVisible();
  await expect(page.locator("[data-ranked] [data-ranked-fuels]").first()).toBeVisible();
});

test("the header names the detector as the builder does and badges the reader's inputs", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const hero = page.locator("#brief-hero");
  await expect(hero.getByText("ISS-style photoelectric (scatter)")).toBeVisible();
  await expect(hero.locator("[data-your-input]")).toHaveCount(3);
  await expect(hero.getByText("Assumed", { exact: true })).toHaveCount(0);
});

test("Ask HALO suggestion chips are tailored to the brief and submit on click", async ({ page }) => {
  let body = null as { question?: string } | null;
  await page.route("**/api/explain", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LIVE) });
  });
  await page.goto(briefUrl("artemis"));
  const panel = page.locator("[data-ask]");
  const chips = panel.locator("[data-suggestion]");
  await expect(chips).toHaveCount(4);
  await expect(chips.nth(0)).toHaveText("Why is the grade D?");
  await expect(panel.getByRole("button", { name: "Would my smoke detector catch a Kapton fire?" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "What test would help most?" })).toBeVisible();
  // Keyboard: a chip is a real button reached by Tab and pressed with Enter.
  await panel.getByRole("button", { name: "What test would help most?" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveAttribute("data-state", "live");
  expect(body?.question).toBe("What test would help most?");
  await expect(panel.getByLabel("Ask about this brief")).toHaveValue("What test would help most?");
});

test("grade ladder: Artemis shows today and two hypothetical grades that anchor to their sections; ISS hides it", async ({ page }) => {
  await page.goto(briefUrl("artemis"));
  const ladder = page.locator("[data-grade-ladder]");
  await expect(ladder.locator("[data-ladder-step]")).toHaveCount(3);
  await expect(ladder.locator('[data-ladder-step="today"]')).toHaveAttribute("data-ladder-grade", "D");
  await expect(ladder.getByText("Hypothetical", { exact: true })).toHaveCount(2);
  await expect(ladder.locator('[data-ladder-step="archive"] a[href="#next-archive"]')).toBeVisible();
  await expect(ladder.locator('[data-ladder-step="next"] a[href="#next-test"]')).toBeVisible();
  await expect(page.locator("#next-archive")).toHaveCount(1);
  await page.goto(briefUrl("iss"));
  await expect(page.locator("[data-grade-ladder]")).toHaveCount(0);
});
