# Viability memo

> **Opinion, labelled.** Written by Ayo Ahmed as the concept author, without Clipboard data.

**Recommendation:** worth a **two-week read-only validation** (phases 0–1). Not worth building as a write tool until the write API's idempotency and side effects are confirmed.

**Why it could matter.** In a two-sided marketplace, one integration fault can show up as many tickets from both sides at once. Grouping them by symptom and dependency is cheap, deterministic and low-risk. On its own it could cut repeated investigation, if bursts like this happen often enough. That frequency is unknown.

**Why caution.** The value of automated repair depends on facts this concept can't see: whether a status write has downstream effects (notifications, timesheets, pay), whether reads expose freshness, and whether there are already reconciliation jobs. If any of these fail, the right product is a **read-only drift and cluster view** plus a better handoff. That is still useful, but smaller.

**What it shows about the role.** It turns a loosely defined ops pain into a scoped spec, contracts, guardrails and tests. It treats reliability as idempotency, verification and rollback. It keeps humans on sensitive decisions, and it labels what is known, assumed and synthetic.

**Kill criteria.** Fewer than a handful of qualifying bursts per quarter; cluster precision below target; or status writes that can't be isolated from side effects.
