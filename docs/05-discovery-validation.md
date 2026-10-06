# Discovery questions and validation plan

> **Plan.** Nothing below has been run. No interviews have taken place.

## Discovery questions

**Does the problem exist?**
1. In the last quarter, how many support spikes came from one upstream cause? How were they detected?
2. When a shift status is wrong, what is the source of truth, and how do agents check it today?
3. How are duplicate tickets linked today (tags, macros, parent tickets, incident tools)?

**Is the repair safe?**
4. Does changing a projected status trigger anything else: notifications, timesheets, pay calculation, rating prompts?
5. Does the write endpoint support idempotency keys? What is its retry contract?
6. How fresh is the source-of-truth read, and how is replica lag exposed?

**Ownership and boundaries**
7. Who owns each dependency, and is there an on-call rotation?
8. Which case categories must never be touched by automation, and who owns each one?
9. What audit retention and access controls apply to ops tooling?

**Value**
10. What does one duplicate investigation cost in agent time (measured, not estimated)?
11. What would make an operator trust an automated repair?

## Validation plan

| Step | Method | Evidence that would continue | Evidence that would stop or pivot |
|---|---|---|---|
| V1 | Ticket export analysis (30–90 days, anonymised) | Bursts of ≥ N same-symptom tickets linked to known upstream incidents | Spikes are rare or already auto-linked |
| V2 | 5–8 shadowing sessions with support operators | Repeated manual lookups for the same root cause | Existing tooling already groups and resolves |
| V3 | Architecture review with engineering | An authoritative ledger read exists; the write is idempotent; there are no side effects | Status writes trigger pay or notifications |
| V4 | Read-only pilot (detect and cluster only) | Cluster precision ≥ target on labelled history | Too many false groupings |
| V5 | Gated write pilot on one symptom, operator approval required | Verified fixes with zero double applies, and rollback unused or working | Any unverified or duplicate write |

The metrics for these steps are defined in [15-metrics-event-taxonomy.md](15-metrics-event-taxonomy.md). No results exist yet.
