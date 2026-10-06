# Problem brief

## Problem statement (hypothesis)

When an upstream dependency between systems fails, a two-sided marketplace's support queue can get many tickets from *both* sides describing the same symptom. In this scenario the dependency is a webhook that carries shift-lifecycle events to the view that apps and support agents read. If each ticket is handled on its own, agents repeat the same investigation, fix records by hand without checking the source of truth, and may touch sensitive cases (pay, credentials, conduct) that should belong to specialists.

## Facts vs assumptions

| Statement | Type | Basis |
|---|---|---|
| Clipboard is a two-sided healthcare labour marketplace | **Fact** | S1, S3 |
| The role owns internal ops tooling, support platforms, automations and reliability | **Fact** | S1 |
| Clipboard's stack includes a shift ledger, a status projection and a shift-events webhook | **Assumption** | Generic event-driven architecture. Clipboard's actual architecture is unknown |
| Webhook failures produce clusters of shift-status tickets at Clipboard | **Assumption** | Plausible pattern. No evidence that it happens, or how often |
| Agents handle duplicate tickets one at a time today | **Assumption** | Unknown. Clipboard may already have incident tooling |
| A status re-sync from the source of truth is a safe repair | **Assumption, conditional** | Safe only if the ledger really is authoritative, the write is idempotent, and downstream side effects (notifications, pay) are not triggered by status changes. Needs validation |
| Billing, credential and trust decisions must stay with humans | **Design constraint** | Set by the brief. Also standard practice for regulated or high-impact decisions |
| Every number in the demo | **Synthetic** | Generated scenario |

## Why now (hypothesis)

The role is explicitly about improving reliability and automation across Ops tooling [S1]. A small, gated, auditable automation is a believable first step, and it shows the engineering discipline (idempotency, verification, rollback) that AI-assisted ops will need later.

## Success looks like (to be validated)

- The duplicate investigation for one root cause is done once, not per ticket.
- No automated write happens without fresh, gate-passing evidence and a human approval.
- Every automated write can be reversed and is verified from a new read.
- Sensitive cases always reach the right human queue with context.
