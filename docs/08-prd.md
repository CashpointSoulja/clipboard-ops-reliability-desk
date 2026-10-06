# PRD: Ops Reliability Desk v0.1 (concept)

**Author:** Ayo Ahmed (independent concept). **Status:** prototype on synthetic data. **Not affiliated with Clipboard.**

## Goal
Turn a burst of same-symptom support cases into one owned incident, and resolve the shared cause with a gated, reversible, verified repair. Sensitive cases always reach a human.

## Users
Support Ops Operator (primary), Marketplace Reliability On-call (owner), specialist reviewers (escalation), Viewer (read-only). See [personas](04-personas-jtbd.md).

## Scope (v0.1)
1. CSV import with schema validation and actionable row errors. Atomic: a file with any rejected row is not ingested.
2. Deterministic clustering by symptom code within a 2-hour window. Symptom → dependency → owner → playbook through a fixed table.
3. Incident view: upstream signal, per-case evidence (ledger vs projection, freshness, affected workflow, next step, six gates).
4. One playbook: **simulated status re-sync** from ledger to projection.
5. Execution with idempotency keys, three attempts with backoff, dead-letter queue, replay.
6. Fresh-state verification. Resolve is only possible after it passes.
7. Rollback to captured prior values.
8. Handoffs: refused repairs, no-playbook incidents, unsupported categories, and billing, credential and trust cases.
9. Export: incident spec (Markdown) and regression case (JSON).
10. Reset and sample-data controls. Browser-only state, disclosed in the UI.

## Non-goals
- Clinical advice, credential or eligibility decisions, staffing or matching decisions, pay or billing changes, any money movement.
- Live integrations with any real system, including Clipboard's or Zendesk's.
- Live model calls. AI is an [adapter specification](21-ai-adapter-spec.md) only.
- Multi-user collaboration, authentication, server-side persistence.
- Claims about Clipboard's current processes, volumes or ROI.

## User stories and acceptance criteria

| ID | Story | Acceptance criteria (all tested) |
|---|---|---|
| US1 | As an operator, I upload a CSV and see exactly which rows are wrong and how to fix them | Errors list row, column, code, message and fix. Malformed quoting, missing ID, bad timestamp, bad side and duplicate ID are each detected. A file with errors is not ingested |
| US2 | As an operator, I see duplicate symptoms grouped into one incident with an owner and dependency | The sample's 11 `SHIFT_STATUS_STALE` cases form INC-001, owned by *Marketplace Reliability On-call*, dependency *shift-events webhook*, with 10 failed deliveries shown. The rule is labelled deterministic |
| US3 | As an operator, I inspect each case's evidence and risk gates | Each case shows ledger vs projection, freshness, affected workflow, next step and six gate results |
| US4 | As an operator, I approve one reversible re-sync | A confirmation lists every shift change. Evidence is re-read before execution. Only gate-passing shifts are written |
| US5 | As an operator, I trust that retries never double-apply | Every write has an idempotency key. A second approval or replay of an applied key applies nothing. Max applies per key = 1 |
| US6 | As an operator, failures are contained | After 3 failed attempts an item goes to the DLQ. Replay with the fault still active stays in the DLQ. After recovery, replay applies once |
| US7 | As an owner, I close only on fresh proof | Verification re-reads state. Resolve is blocked unless every shift matches and the DLQ is empty |
| US8 | As an operator, I can undo | Rollback restores prior values. A later re-run uses new keys (generation +1) |
| US9 | As a reviewer, sensitive cases reach me with context and no decision made | Billing, credential and trust cases each create a handoff to a named role, with a context packet that states what the desk did not do |
| US10 | As an operator, unsafe cases are refused | Absent shift_id → `ABSENT_IDENTIFIER` handoff. Source read older than 15 min → `STALE_SOURCE` handoff. No write occurs |
| US11 | As a viewer, I can't change anything | Approve, replay, resolve, rollback and import are rejected for Viewer and logged as `permission_denied` |
| US12 | As an engineer, I get a spec and regression case | Export produces Markdown and JSON with gate expectations, executions, apply counts and invariants |
| US13 | As anyone, I can reset | Reset clears browser state and restores the simulated systems |

## Release criteria
All automated tests pass (see [test results](testing/test-results.md)), no console errors under a strict CSP, and the disclosure banner, non-affiliation label and synthetic labels are visible.
