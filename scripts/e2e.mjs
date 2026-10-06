// End-to-end browser test of the deployed or local app. Usage: BASE_URL=http://127.0.0.1:8787 node scripts/e2e.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8787";
const SHOTS = process.env.SHOTS_DIR || "docs/evidence/e2e";
const CHROME = process.env.CHROME_PATH; // path to a local Chrome/Chromium binary
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome or Chromium executable");
mkdirSync(SHOTS, { recursive: true });

const results = [];
let failed = 0;
async function check(name, fn) {
  try { await fn(); results.push(`PASS ${name}`); }
  catch (e) { failed++; results.push(`FAIL ${name}: ${e.message.split("\n")[0]}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(e.message));
const text = () => page.locator("main").innerText();

await page.goto(BASE + "/");
await check("landing shows non-affiliation and browser-only disclosure", async () => {
  const body = await page.locator("body").innerText();
  assert(/not affiliated with Clipboard/i.test(body), "missing non-affiliation label");
  assert(/Browser-only state/i.test(body), "missing browser-only disclosure");
  assert(/Concept by Ayo Ahmed/.test(body), "missing concept credit");
});
await page.screenshot({ path: `${SHOTS}/01-landing.png`, fullPage: false });

await check("malformed CSV shows actionable row errors and is not ingested", async () => {
  await page.getByRole("button", { name: "Try a malformed file" }).click();
  const t = await text();
  for (const code of ["MISSING_ID", "BAD_TIMESTAMP", "BAD_SIDE", "DUPLICATE_ID", "MALFORMED_CSV"]) assert(t.includes(code), `missing ${code}`);
  assert(/Import blocked/.test(t), "not blocked");
  assert((await page.locator(".inc").count()) === 0, "incidents formed from bad file");
});
await page.screenshot({ path: `${SHOTS}/02-malformed.png`, fullPage: false });

await check("sample import forms owned incident queue", async () => {
  await page.getByRole("button", { name: /Load sample CSV/ }).click();
  const t = await text();
  assert(/Import accepted/.test(t), "not accepted");
  assert(/INC-001 · Shift status not updating/.test(t), "INC-001 missing");
  assert(/Marketplace Reliability On-call/.test(t), "owner missing");
  assert(/UNSUPPORTED_CATEGORY/.test(t), "unsupported category warning missing");
});
await page.locator("#queue").screenshot({ path: `${SHOTS}/03-queue.png` });

await check("permission boundary: viewer cannot approve", async () => {
  await page.selectOption("#role", "viewer");
  await page.locator('[data-id="INC-001"]').click();
  assert(await page.getByRole("button", { name: "Approve simulated re-sync" }).isDisabled(), "approve enabled for viewer");
  await page.selectOption("#role", "operator");
});

await check("evidence shows refusal for absent id and stale source", async () => {
  const t = await page.locator("#detail").innerText();
  assert(/C-1010[\s\S]*?Repair refused/i.test(t), "C-1010 not refused");
  assert(/C-1011[\s\S]*?Repair refused/i.test(t), "C-1011 not refused");
  assert(/source read \d+ min old/.test(await page.locator("#detail").innerHTML()), "freshness detail missing");
});
await page.locator("#detail").screenshot({ path: `${SHOTS}/04-evidence.png` });

await check("approve executes with retry and dead-letter queue", async () => {
  await page.getByRole("button", { name: "Approve simulated re-sync" }).click();
  await page.getByRole("button", { name: "Approve and execute" }).click();
  const t = await page.locator("#detail").innerText();
  assert(/SH-2204 attempt 1: HTTP 503/.test(t) && /SH-2204 attempt 2: HTTP 200/.test(t), "retry not shown");
  assert(/SH-2206 attempt 3: HTTP 503/.test(t), "persistent failure not shown");
  assert(/1 item\(s\) failed 3 attempts/.test(t), "DLQ not shown");
});
await page.locator("#detail").screenshot({ path: `${SHOTS}/05-execution-dlq.png` });

await check("resolve blocked before verification passes", async () => {
  await page.getByRole("button", { name: "Verify from fresh read" }).click();
  assert(/Verification failed/.test(await page.locator("#detail").innerText()), "should fail with DLQ open");
  assert(await page.getByRole("button", { name: "Resolve incident" }).isDisabled(), "resolve enabled");
});

await check("DLQ recovery after simulated upstream recovery", async () => {
  await page.getByRole("button", { name: "Replay" }).click();
  assert(/SH-2206 attempt 6: HTTP 503/.test(await page.locator("#detail").innerText()), "replay under fault should fail");
  await page.getByLabel("Simulated upstream recovered").check();
  await page.getByRole("button", { name: "Replay" }).click();
  assert(/SH-2206 attempt 7: HTTP 200/.test(await page.locator("#detail").innerText()), "replay not applied");
});

await check("fresh-state verification then resolution", async () => {
  await page.getByRole("button", { name: "Verify from fresh read" }).click();
  assert(/Fresh-state verification passed[\s\S]*6\/6/.test(await page.locator("#detail").innerText()), "verification did not pass");
  await page.getByRole("button", { name: "Resolve incident" }).click();
  assert(/INC-001 resolved from fresh evidence/.test(await page.locator("#detail").innerText()), "not resolved");
});

await check("export spec and regression case downloads", async () => {
  const dl = [];
  page.on("download", (d) => dl.push(d.suggestedFilename()));
  await page.getByRole("button", { name: "Export spec + regression case" }).click();
  await page.waitForTimeout(500);
  assert(dl.includes("INC-001-spec.md") && dl.includes("INC-001-regression.json"), `downloads: ${dl}`);
});
await page.locator("#detail").screenshot({ path: `${SHOTS}/06-resolved-export.png` });

await check("out-of-order/duplicate webhook backlog does not regress state", async () => {
  await page.getByRole("button", { name: "Simulate upstream backlog redelivery" }).click();
  const m = await page.locator("main").innerText();
  assert(/\b1\b\s*\n?max times any idempotency key was applied/.test(m), "apply count >1");
});

await check("sensitive cases are human handoffs, never auto-decided", async () => {
  const t = await page.locator("#handoffs").innerText();
  assert(/Billing Ops Specialist/i.test(t) && /Credentialing Review Lead/i.test(t) && /Trust & Safety Reviewer/i.test(t), "roles missing");
});
await page.locator("#handoffs").screenshot({ path: `${SHOTS}/07-handoffs.png` });

await check("state persists across reload (browser-only)", async () => {
  await page.reload();
  assert(/resolved/i.test(await page.locator("#queue").innerText()), "state lost after reload");
});

await check("reset clears state", async () => {
  await page.getByRole("button", { name: "Reset demo" }).click();
  assert((await page.locator(".inc").count()) === 0, "incidents remain");
  await page.reload();
  assert((await page.locator(".inc").count()) === 0, "incidents return after reload");
});

await check("mobile 390px viewport has no horizontal overflow", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Load sample CSV/ }).click();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(over <= 0, `overflow ${over}px`);
  await page.screenshot({ path: `${SHOTS}/08-mobile.png` });
});

await check("no console errors (CSP-clean)", async () => assert(consoleErrors.length === 0, consoleErrors.join(" | ")));

await browser.close();
console.log(`E2E against ${BASE}`);
console.log(results.join("\n"));
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
