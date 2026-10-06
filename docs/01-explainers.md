# Explainers

## ELI5

Picture a shop with a big screen showing which orders are ready. The kitchen knows the truth, but the cable from the kitchen to the screen broke for a while. Now customers *and* staff keep coming to the counter saying "my order says it isn't ready, but it is!".

Without this desk, every complaint is handled on its own. With it, the helper sees that all twelve complaints come from **one broken cable**. It checks the kitchen's own list (the source of truth) to confirm what's really true, and asks a grown-up for permission. Then it copies the right answers to the screen, **once**, even if someone presses the button twice. Afterwards it looks again to make sure the screen is now right. If a complaint is about money, a badge or someone's behaviour, the helper doesn't touch it. It passes it to the right person with a note explaining everything.

## 30-second explanation

When an upstream integration fails, for example a shift-events webhook that stops delivering, support sees a burst of tickets from both workplaces and professionals, all about the same symptom. **Ops Reliability Desk** imports those cases from a CSV and validates them with row-level, fixable errors. It then groups them with **deterministic rules** into one incident, with an owner and a named dependency. For each case it shows the evidence: source of truth vs displayed status, data freshness, affected workflow, next step and the six risk gates.

An operator approves one **reversible, simulated status re-sync**. Each write has an idempotency key, is retried with backoff, and goes to a dead-letter queue if it keeps failing. Closure is verified from a **fresh read**. Cases with a stale source or a missing identifier are **refused** and handed to a person. Billing, credential and trust cases are always escalated and never auto-decided. The resolved incident exports as a spec and a regression case.

It is a working, tested prototype on synthetic data. It is not a claim about how Clipboard operates today.
