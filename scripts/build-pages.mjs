// Builds a static GitHub Pages copy of the app into dist-pages/ (no Worker, no server code).
// The app is fully client-side, so the only differences from the Worker build are:
// security headers come from a <meta> CSP (Pages can't set response headers), and /api/health is absent.
import { cpSync, rmSync, writeFileSync, existsSync } from "node:fs";
const OUT = "dist-pages";
if (!existsSync("public/app.js")) throw new Error("Run `npm run build` first");
rmSync(OUT, { recursive: true, force: true });
cpSync("public", OUT, { recursive: true });
writeFileSync(`${OUT}/.nojekyll`, "");
writeFileSync(`${OUT}/404.html`, '<!doctype html><meta charset="utf-8"><title>Not found</title><p>Not found. <a href="./">Ops Reliability Desk</a> (independent concept by Ayo Ahmed, not affiliated with Clipboard).</p>\n');
console.log(`static site written to ${OUT}/`);
