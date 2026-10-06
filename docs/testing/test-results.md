# Test results (actual evidence)

All output below was copied from real runs on 2026-10-06 (UTC). The raw logs are in [`docs/evidence/logs/`](../evidence/logs/).

## Typecheck
```text
tsc --noEmit: exit 0
```

## Unit + integration (Vitest)
```text
 RUN  v5.0.3 /home/ubuntu/repos/clipboard-ops-reliability-desk
 Test Files  2 passed (2)
      Tests  31 passed (31)
   Start at  00:28:00
   Duration  259ms (transform 54%, tests 26%, import 15%, worker 4%)
```

Per-test list (`npx vitest run --reporter=verbose`):
```text
 ✓ test/schema.test.ts > CSV parser > handles quoted commas, escaped quotes and CRLF 2ms
 ✓ test/schema.test.ts > CSV parser > reports an unclosed quote with its line 2ms
 ✓ test/schema.test.ts > schema validation > accepts the sample file with only warnings 4ms
 ✓ test/schema.test.ts > schema validation > malformed CSV: gives actionable row errors 1ms
 ✓ test/schema.test.ts > schema validation > missing ID: row rejected with fix hint 1ms
 ✓ test/schema.test.ts > schema validation > missing required column blocks the file 0ms
 ✓ test/schema.test.ts > schema validation > unsupported category is held for triage, not accepted 3ms
 ✓ test/schema.test.ts > schema validation > absent shift identifier is a warning, not a rejection 0ms
 ✓ test/schema.test.ts > schema validation > rejects rows that look like real PII 0ms
 ✓ test/schema.test.ts > schema validation > empty file 0ms
 ✓ test/desk.test.ts > clustering and routing (deterministic) > groups shift-status symptoms into one owned incident tied to the webhook dependency 5ms
 ✓ test/desk.test.ts > clustering and routing (deterministic) > symptom without a playbook becomes an investigating incident with a handoff 1ms
 ✓ test/desk.test.ts > clustering and routing (deterministic) > billing, credential and trust cases escalate to named roles with context 1ms
 ✓ test/desk.test.ts > clustering and routing (deterministic) > unsupported category goes to triage 1ms
 ✓ test/desk.test.ts > gates and refusal path > absent identifier: refuses repair and creates a human handoff 2ms
 ✓ test/desk.test.ts > gates and refusal path > stale evidence: refuses repair and creates a human handoff 1ms
 ✓ test/desk.test.ts > gates and refusal path > no drift: case is not repaired and needs no handoff 1ms
 ✓ test/desk.test.ts > gates and refusal path > evidence that goes stale before approval is refused at approval time 1ms
 ✓ test/desk.test.ts > permission boundary > viewer cannot approve, replay, resolve, rollback or import 1ms
 ✓ test/desk.test.ts > permission boundary > operator cannot run a repair on an incident without a playbook 1ms
 ✓ test/desk.test.ts > execution: idempotency, retry, DLQ, recovery > happy path end to end 2ms
 ✓ test/desk.test.ts > execution: idempotency, retry, DLQ, recovery > duplicate approval does not apply the repair twice 1ms
 ✓ test/desk.test.ts > execution: idempotency, retry, DLQ, recovery > duplicate replay of an applied key is skipped 1ms
 ✓ test/desk.test.ts > webhooks > duplicate event is ignored by event_id 1ms
 ✓ test/desk.test.ts > webhooks > out-of-order event does not overwrite newer state 2ms
 ✓ test/desk.test.ts > rollback and reset > rollback restores prior values and allows a clean re-run 1ms
 ✓ test/desk.test.ts > rollback and reset > reset clears everything and restores simulated systems 1ms
 ✓ test/desk.test.ts > rollback and reset > evidence is a snapshot that later writes do not mutate 0ms
 ✓ test/desk.test.ts > rollback and reset > state round-trips through JSON (browser storage) 2ms
 ✓ test/desk.test.ts > rollback and reset > re-importing the same file is idempotent 1ms
 ✓ test/desk.test.ts > rollback and reset > malformed file is not ingested 0ms
```

## End-to-end, local (`wrangler dev`)
```text
E2E against http://127.0.0.1:8787
PASS landing shows non-affiliation and browser-only disclosure
PASS malformed CSV shows actionable row errors and is not ingested
PASS sample import forms owned incident queue
PASS permission boundary: viewer cannot approve
PASS evidence shows refusal for absent id and stale source
PASS approve executes with retry and dead-letter queue
PASS resolve blocked before verification passes
PASS DLQ recovery after simulated upstream recovery
PASS fresh-state verification then resolution
PASS export spec and regression case downloads
PASS out-of-order/duplicate webhook backlog does not regress state
PASS sensitive cases are human handoffs, never auto-decided
PASS state persists across reload (browser-only)
PASS reset clears state
PASS mobile 390px viewport has no horizontal overflow
PASS no console errors (CSP-clean)
16/16 passed
```
Screenshots: [`docs/evidence/e2e/`](../evidence/e2e/).

## End-to-end, deployed
**Not yet run: blocked.** No Cloudflare credentials are available in this environment (see the readiness report). When deployed, run `BASE_URL=<workers.dev URL> node scripts/e2e.mjs`.

## Accessibility
See [accessibility.md](accessibility.md).

## Manual checks
Manual review of the recorded walkthrough frames, local `wrangler dev`, 2026-10-06 (actual):

| Check | Result |
|---|---|
| Non-affiliation label next to the logo, synthetic/simulated/browser-only banner, footer credit | Visible on every screen |
| Malformed file → row errors with fixes, nothing imported | Pass |
| Sample → INC-001 owned by Marketplace Reliability On-call, deterministic badge | Pass |
| C-1010 (no shift_id) and C-1011 (380 min old source) refused, with reason and handoff | Pass |
| Approve → confirmation lists 6 changes → timeline shows SH-2204 retry and SH-2206 in DLQ | Pass |
| Verify fails with DLQ open → recovery toggle + replay → verify 6/6 → resolve → export | Pass |
| Billing / credential / trust handoffs to named synthetic roles | Pass |
| Reset returns to the empty state | Pass |
| An earlier build showed post-repair values in the pre-repair evidence | **Found and fixed** (ADR-005, regression test added) |
| "— old" freshness shown for a case with no shift | **Found and fixed**: now "n/a: no shift to read" |

Deployed-URL anonymous checks are pending deployment (see below).
