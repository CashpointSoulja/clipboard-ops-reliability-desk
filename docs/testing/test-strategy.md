# Test strategy

| Layer | Tool | What | Location |
|---|---|---|---|
| Unit | Vitest | CSV parser, schema validation, rule lookup | `test/schema.test.ts` |
| Integration | Vitest | Whole `Desk` state machine: import → cluster → gates → execute → DLQ → verify → resolve → rollback → reset, plus webhooks and permissions | `test/desk.test.ts` |
| End-to-end | Playwright (`playwright-core`, headless Chromium) | Real UI against `wrangler dev` or the deployed URL; screenshots to `docs/evidence/e2e/` | `scripts/e2e.mjs` |
| Accessibility | axe-core 4.10.3 (WCAG 2.0/2.1 A + AA) + keyboard pass | Four UI states | `scripts/a11y.mjs` |
| Static | TypeScript `--noEmit`, strict | Whole repo | `tsconfig.json` |
| Manual | Browser walkthrough on the deployed URL | Anonymous access, visual check | [test-results.md](test-results.md#manual-checks) |

## Required scenarios → tests

| Scenario | Automated test(s) |
|---|---|
| Malformed CSV | schema: "flags unclosed quotes", "rejects the malformed sample with actionable errors"; desk: "malformed file is rejected atomically"; e2e: "malformed CSV shows actionable row errors" |
| Missing ID | schema: malformed sample (`MISSING_ID`) |
| Duplicate event | desk: "duplicate webhook event is ignored", "duplicate approval does not apply twice", "replaying an applied key is a no-op" |
| Out-of-order webhook | desk: "out-of-order webhook does not regress state"; e2e: backlog redelivery |
| Stale evidence | desk: "stale source refuses and hands off", "approval re-reads evidence (time passes → stale)" |
| Permission boundary | desk: "viewer cannot approve, replay, resolve, rollback or import"; e2e: viewer approve disabled |
| Unsupported category | schema + desk: `UNSUPPORTED_CATEGORY` → Support Ops Triage Lead |
| Failed retry | desk: "persistent failure goes to DLQ after 3 attempts"; e2e |
| Rollback | desk: "rollback restores prior values and bumps generation" |
| Deterministic recovery | desk: "DLQ replay after recovery applies once"; e2e |
| Reset | desk: "reset restores sample systems and clears state"; e2e: reset + reload |

## How to run
```bash
npm ci
npm run check                         # typecheck + unit/integration + build
npx wrangler dev --port 8787 &        # local Worker
node scripts/e2e.mjs                  # BASE_URL=... to target the deployed URL
node scripts/a11y.mjs
```
