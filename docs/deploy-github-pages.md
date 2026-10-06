# Static GitHub Pages fallback

The app is fully client-side. The engine, sample data and state all live in the browser. That means the same `public/` bundle can be served as a static site without the Cloudflare Worker.

## What differs from the Worker build

| | Cloudflare Worker | GitHub Pages (static) |
|---|---|---|
| App, engine, sample data, exports | same bundle | same bundle |
| Security headers | real response headers (CSP, X-Frame-Options, Permissions-Policy, …) | `<meta>` CSP and referrer policy only. Pages cannot set headers, so `frame-ancestors`/X-Frame-Options are not enforced |
| `GET /api/health` | JSON health response | absent (404) |
| URL base | domain root | project subpath `/<repo>/`. All asset paths are relative so both work |

## Build and verify locally

```bash
npm ci
npm run build:pages            # typecheck is separate: npm run typecheck && npm test
mkdir -p .pages-preview && cp -r dist-pages .pages-preview/clipboard-ops-reliability-desk
python3 -m http.server 8790 --bind 127.0.0.1 --directory .pages-preview
export CHROME_PATH=/path/to/chrome
BASE_URL=http://127.0.0.1:8790/clipboard-ops-reliability-desk node scripts/e2e.mjs
BASE_URL=http://127.0.0.1:8790/clipboard-ops-reliability-desk node scripts/a11y.mjs
```

The page is served under the same subpath GitHub Pages uses. That way a broken absolute path would fail the run.

## Publishing (not done; it is the owner's decision)

`.github/workflows/pages.yml` runs only on manual `workflow_dispatch`, so nothing publishes on push. To publish:

1. GitHub Pages on a free plan requires the repository to be **public**. Private-repo Pages needs a paid plan.
2. Go to Settings → Pages → Source and select **GitHub Actions**.
3. Go to Actions → "Deploy static site to GitHub Pages" → Run workflow.
4. Check the published URL anonymously in a private window and rerun `scripts/e2e.mjs` with `BASE_URL` set to it.
