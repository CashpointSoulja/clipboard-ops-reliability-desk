// Records the vertical walkthrough (540x960 CSS px at 2x = 1080x1920) and writes scene timings.
// Usage: BASE_URL=... SCENES=path/to/scenes-timed.json OUT_DIR=... node scripts/record-walkthrough.mjs
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8787";
const OUT = process.env.OUT_DIR || "video-out";
const CHROME = process.env.CHROME_PATH; // path to a local Chrome/Chromium binary
if (!CHROME) throw new Error("Set CHROME_PATH to a Chrome or Chromium executable");
const scenes = JSON.parse(readFileSync(process.env.SCENES || "docs/video/scenes.json", "utf8"));
const vo = Object.fromEntries(scenes.map((s) => [s.id, s.vo_seconds ?? 6]));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, acceptDownloads: true, bypassCSP: true,
});
await ctx.addInitScript(() => {
  const mk = () => {
    if (document.getElementById("demo-cursor")) return;
    document.documentElement.style.scrollBehavior = "auto";
    const c = document.createElement("div");
    c.id = "demo-cursor";
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", width: "26px", height: "26px", margin: "-13px 0 0 -13px", borderRadius: "50%",
      background: "rgba(250,250,100,.55)", border: "3px solid #CA3051", boxShadow: "0 0 0 6px rgba(250,250,100,.25)", zIndex: "2147483647",
      pointerEvents: "none", transition: "transform .12s ease", transform: "translate(270px,480px)" });
    const dot = document.createElement("div");
    Object.assign(dot.style, { position: "absolute", left: "8px", top: "8px", width: "4px", height: "4px", borderRadius: "50%", background: "#37171A" });
    c.appendChild(dot);
    document.documentElement.appendChild(c);
    let x = 270, y = 480, s = 1;
    const put = () => { c.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; put(); }, true);
    addEventListener("mousedown", () => { s = 0.7; put(); }, true);
    addEventListener("mouseup", () => { s = 1; put(); }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", mk); else mk();
});

const t0 = Date.now();
const page = await ctx.newPage();
// Capture frames over CDP screencast (lossless-ish JPEG) rather than Playwright's low-bitrate video.
mkdirSync(`${OUT}/frames`, { recursive: true });
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on("Page.screencastFrame", async (f) => {
  const file = `${OUT}/frames/${String(frames.length).padStart(6, "0")}.jpg`;
  writeFileSync(file, Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp - t0 / 1000 });
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
page.setDefaultTimeout(5000);
const sleep = (ms) => page.waitForTimeout(ms);
let mx = 270, my = 480;
async function moveTo(loc, { dx = 0, dy = 0, ms = 700 } = {}) {
  const b = await loc.boundingBox();
  const x = b.x + Math.min(b.width / 2, 120) + dx, y = b.y + b.height / 2 + dy;
  const steps = Math.max(12, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(mx + (x - mx) * e, my + (y - my) * e);
  }
  mx = x; my = y;
}
async function click(loc, opts) { await moveTo(loc, opts); await sleep(180); await page.mouse.down(); await sleep(90); await page.mouse.up(); await sleep(250); }
async function scrollTo(loc, { top = 90, ms = 900 } = {}) {
  await loc.evaluate((el, [top, ms]) => new Promise((res) => {
    const start = scrollY, end = Math.max(0, start + el.getBoundingClientRect().top - top), t0 = performance.now();
    const f = (now) => { const t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      scrollTo(0, start + (end - start) * e); t < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [top, ms]);
  await sleep(150);
}
async function zoom(loc, scale = 1.12) {
  const b = await loc.boundingBox();
  await page.evaluate(([ox, oy, s]) => { const m = document.querySelector("main"); m.style.transition = "transform .7s ease"; m.style.transformOrigin = `${ox}px ${oy}px`; m.style.transform = `scale(${s})`; },
    [b.x + b.width / 2, b.y + scrollYOf(b), scale]);
  await sleep(750);
}
function scrollYOf() { return 0; }
async function unzoom() { await page.evaluate(() => { document.querySelector("main").style.transform = "none"; }); await sleep(750); }

const marks = [];
let sceneStart = 0;
function begin(id) { sceneStart = Date.now(); marks.push({ id, start: (sceneStart - t0) / 1000 }); }
async function hold(id, pad = 0.7) { const need = (vo[id] + pad) * 1000 - (Date.now() - sceneStart); if (need > 0) await sleep(need); }

await page.goto(BASE + "/");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForLoadState("networkidle");
await sleep(600);
const videoStart = (Date.now() - t0) / 1000;

// s01 intro
begin("s01");
await moveTo(page.locator(".indep"), { ms: 1100 }).catch(() => {});
await sleep(1500);
await moveTo(page.locator(".banner"), { ms: 900 });
await sleep(2500);
await scrollTo(page.getByText("Who uses it"), { top: 120, ms: 1400 });
await moveTo(page.getByText("Who uses it"), { ms: 800 });
await sleep(1200);
await moveTo(page.getByText("Why the repair is safe"), { ms: 900 });
await hold("s01", 0.5);

// s02 malformed
begin("s02");
await scrollTo(page.getByRole("button", { name: "Try a malformed file" }), { top: 380, ms: 1200 });
await click(page.getByRole("button", { name: "Try a malformed file" }));
await sleep(500);
await scrollTo(page.getByText(/Import blocked/).first(), { top: 80, ms: 1100 });
await zoom(page.getByText(/Import blocked/).first(), 1.1);
await moveTo(page.getByText("MISSING_ID").first(), { ms: 900 });
await sleep(1200);
await moveTo(page.getByText("DUPLICATE_ID").first(), { ms: 900 });
await hold("s02", 0.2);
await unzoom();

// s03 sample upload
begin("s03");
await scrollTo(page.getByRole("button", { name: /Load sample CSV/ }), { top: 380, ms: 1100 });
await click(page.getByRole("button", { name: /Load sample CSV/ }));
await sleep(400);
await scrollTo(page.getByText(/Import accepted/).first(), { top: 90, ms: 1100 });
await moveTo(page.getByText(/Import accepted/).first(), { ms: 800 });
await sleep(1500);
await moveTo(page.getByText("UNSUPPORTED_CATEGORY").first(), { ms: 900 }).catch(() => {});
await hold("s03");

// s04 owned incident
begin("s04");
await scrollTo(page.locator("#queue"), { top: 30, ms: 1200 });
const inc1 = page.locator('[data-id="INC-001"]');
await moveTo(inc1, { dy: -40, ms: 900 });
await sleep(1000);
await moveTo(inc1.getByText(/deterministic/i).first(), { ms: 700 }).catch(() => {});
await sleep(1200);
await hold("s04", 0);
await click(inc1);

// s05 evidence
begin("s05");
await sleep(300);
await scrollTo(page.getByText("Upstream signal").first(), { top: 80, ms: 1100 });
await moveTo(page.getByText("Upstream signal").first(), { ms: 800 });
await sleep(1200);
const c1 = page.locator('details[aria-label="Case C-1001"] > summary');
await scrollTo(c1, { top: 120, ms: 900 });
await click(c1);
await sleep(300);
await zoom(page.locator('details[aria-label="Case C-1001"]'), 1.1);
await moveTo(page.locator('details[aria-label="Case C-1001"] .gates'), { ms: 900 });
await hold("s05", 0.2);
await unzoom();
await click(c1);

// s06 refusal
begin("s06");
const r1 = page.locator('details[aria-label="Case C-1010"]');
await scrollTo(r1, { top: 70, ms: 1300 });
await moveTo(r1.getByText(/Repair refused/i).first(), { ms: 800 });
await sleep(1600);
await moveTo(r1.getByText(/Why refused/).first(), { ms: 800 });
await sleep(1800);
const r2 = page.locator('details[aria-label="Case C-1011"]');
await scrollTo(r2, { top: 70, ms: 1000 });
await moveTo(r2.getByText(/380 min old/).first(), { ms: 800 });
await hold("s06");

// s07 approve
begin("s07");
const ap = page.getByRole("button", { name: "Approve simulated re-sync" });
await scrollTo(ap, { top: 260, ms: 1200 });
await click(ap);
await sleep(1600);
await moveTo(page.locator("#confirm li, #confirm table").first(), { ms: 800 }).catch(() => {});
await sleep(1500);
await hold("s07", -0.8);
await click(page.getByRole("button", { name: "Approve and execute" }));

// s08 timeline + DLQ
begin("s08");
await sleep(400);
await scrollTo(page.getByText("Execution timeline"), { top: 60, ms: 1000 });
await moveTo(page.getByText(/SH-2204/).nth(0), { ms: 800 }).catch(() => {});
await sleep(1500);
await scrollTo(page.getByText("Dead-letter queue").first(), { top: 380, ms: 1400 });
await moveTo(page.getByText(/failed 3 attempts/).first(), { ms: 900 });
await hold("s08");

// s09 recovery
begin("s09");
await click(page.getByRole("button", { name: "Verify from fresh read" }));
await sleep(500);
await scrollTo(page.locator("#verification"), { top: 300, ms: 900 }).catch(() => {});
await sleep(1200);
const rec = page.getByLabel("Simulated upstream recovered");
await scrollTo(rec, { top: 420, ms: 900 });
await click(rec);
await sleep(500);
await click(page.getByRole("button", { name: "Replay" }));
await sleep(600);
await hold("s09");

// s10 verify, resolve, export
begin("s10");
await scrollTo(page.getByRole("button", { name: "Verify from fresh read" }), { top: 300, ms: 900 });
await click(page.getByRole("button", { name: "Verify from fresh read" }));
await sleep(500);
await scrollTo(page.locator("#verification"), { top: 260, ms: 900 });
await sleep(900);
await scrollTo(page.getByRole("button", { name: "Resolve incident" }), { top: 300, ms: 700 });
await click(page.getByRole("button", { name: "Resolve incident" }));
await sleep(700);
const ex = page.getByRole("button", { name: "Export spec + regression case" });
await scrollTo(ex, { top: 300, ms: 800 });
await click(ex);
await hold("s10");

// s11 handoffs
begin("s11");
await scrollTo(page.locator("#handoffs"), { top: 30, ms: 1300 });
await moveTo(page.locator("#handoffs").getByText(/Billing Ops Specialist/i).first(), { ms: 900 });
await sleep(1500);
await moveTo(page.locator("#handoffs").getByText(/never moves money/i).first(), { ms: 900 }).catch(() => {});
await hold("s11");

// s12 metrics + reset
begin("s12");
await scrollTo(page.getByText(/Synthetic metric/i).first(), { top: 140, ms: 1300 });
await moveTo(page.getByText(/Synthetic metric/i).first(), { ms: 800 });
await sleep(2200);
await page.evaluate(() => new Promise((res) => { const s = scrollY, t0 = performance.now(); const f = (n) => { const t = Math.min(1, (n - t0) / 1400); scrollTo(0, s * (1 - (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2))); t < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }));
await click(page.getByRole("button", { name: "Reset demo" }));
await hold("s12", 1.2);
const end = (Date.now() - t0) / 1000;

await cdp.send("Page.stopScreencast");
await sleep(300);
await browser.close();
writeFileSync(`${OUT}/timings.json`, JSON.stringify({ videoStart, end, marks, frames }, null, 1));
console.log(JSON.stringify({ frames: frames.length, videoStart, end, marks: marks.map((m) => `${m.id}@${m.start.toFixed(2)}`) }));
