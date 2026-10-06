# 5 Whys (hypothesis)

> **Hypothesis**, worked on the *synthetic* scenario. It is not an analysis of any real Clipboard incident.

**Symptom:** 11 support cases from workplaces and workers say a shift status is wrong.

1. **Why is the status wrong?** The status projection that apps and support read still shows an older status than the shift ledger.
2. **Why is the projection behind?** Ten shift-event webhook deliveries failed (HTTP 503 at the receiver) between 12:41 and 13:20 UTC, so it never received those updates.
3. **Why weren't the failed deliveries recovered automatically?** (Hypothesis) The sender's retry window ran out during the outage, and there was no reconciliation job comparing projection to ledger.
4. **Why did support learn about it from tickets?** (Hypothesis) No alert on projection-vs-ledger drift, and no linking of tickets to dependency health.
5. **Why does each ticket get handled separately?** (Hypothesis) Ticket tooling groups by requester, not by symptom and dependency, so the shared cause isn't visible.

**Candidate root causes to validate:** missing reconciliation (3), missing drift alerting (4), no symptom-level grouping (5).

**What the concept addresses:** (5) directly, and (3) as an operator-gated, on-demand reconciliation. (4) is in the [v2 roadmap](20-v2-roadmap.md).
