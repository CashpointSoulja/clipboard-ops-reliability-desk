# Risk register

| ID | Risk | Likelihood | Impact | Mitigation in v0.1 | Production need |
|---|---|---|---|---|---|
| R1 | Repair applied twice (duplicate click, retry, replay) | Med | High | Idempotency key per shift/seq/generation; local apply counter; tested max = 1 | Server-side idempotency at the write API |
| R2 | Repair based on stale data | Med | High | `SOURCE_FRESH` gate; evidence re-read at approval; replay re-checks freshness | Real replica-lag signal |
| R3 | Wrong case grouped into an incident | Med | Med | Deterministic rule + time window; per-case gates still apply | Measure precision on labelled history |
| R4 | Automation touches pay, credentials or conduct | Low | Very high | Category hard stop; repair throws for non-playbook incidents; handoff with "never" statement | Policy sign-off; access scoping |
| R5 | Status write triggers side effects | Unknown | High | Out of scope (simulated) | Validate in V3; dry-run mode |
| R6 | Partial failure leaves mixed state | Med | Med | Per-shift execution, DLQ, verification blocks resolve | Alert on DLQ age |
| R7 | Rollback restores wrong value | Low | Med | `before` captured per execution; tested | Compare-and-set on rollback |
| R8 | Operator over-trusts automation | Med | Med | Confirmation lists every change; verification required; refusal reasons visible | Training, audit review |
| R9 | Demo mistaken for a real Clipboard tool | Low | High | Non-affiliation label next to the logo, banner, footer, NOTICE | — |
| R10 | Real PII pasted into the demo | Low | Med | PII-shaped number rejection; browser-only state; reset | DLP in a real pipeline |
| R11 | Out-of-order webhook overwrites newer state | Med | Med | `seq` monotonic check; tested | Same in the receiver |
