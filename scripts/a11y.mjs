// Runs axe-core (WCAG 2.0/2.1 A + AA rules) on each main app state, plus a keyboard-only pass.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8787";
const CHROME = process.env.CHROME_PATH; // path to a local Chrome/Chromium binary
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome or Chromium executable");
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
let total = 0;
async function scan(label) {
  await page.addScriptTag({ content: axe }).catch(async () => { await page.evaluate(axe); });
  const r = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  total += r.violations.length;
  console.log(`${label}: ${r.violations.length} violations, ${r.passes.length} rules passed, ${r.incomplete.length} need review`);
  for (const v of r.violations) console.log(`  - ${v.id} (${v.impact}): ${v.nodes.length} node(s) e.g. ${v.nodes[0].target.join(" ")}`);
}
await page.goto(BASE + "/");
await scan("empty state");
await page.getByRole("button", { name: "Try a malformed file" }).click();
await scan("malformed import errors");
await page.getByRole("button", { name: /Load sample CSV/ }).click();
await page.locator('[data-id="INC-001"]').click();
await scan("incident detail");
await page.getByRole("button", { name: "Approve simulated re-sync" }).click();
await scan("approval dialog");
await page.keyboard.press("Escape");
console.log(`dialog closes with Escape: ${!(await page.locator("#confirm").evaluate((d) => d.open))}`);
// keyboard: Tab from the top must reach the approve button and Enter must open the dialog
await page.goto(BASE + "/"); await page.locator("body").click({ position: { x: 1, y: 1 } });
let reached = false;
for (let i = 0; i < 80; i++) { await page.keyboard.press("Tab"); const t = await page.evaluate(() => document.activeElement?.textContent?.trim()); if (t === "Approve simulated re-sync") { reached = true; break; } }
console.log(`keyboard Tab reaches "Approve simulated re-sync": ${reached}`);
if (reached) { await page.keyboard.press("Enter"); console.log(`Enter opens confirmation dialog: ${await page.locator("#confirm").evaluate((d) => d.open)}`); }
const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
console.log(`focused element has visible outline: ${outline !== "none"} (${outline})`);
await browser.close();
console.log(`TOTAL axe violations: ${total}`);
process.exit(total ? 1 : 0);
