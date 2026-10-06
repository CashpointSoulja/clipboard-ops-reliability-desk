# Human review and escalation design

## Principles
1. **Automation proposes, a human approves.** No write happens without an Ops Operator approval.
2. **Gates are evaluated again at execution time.** Approval doesn't freeze stale evidence.
3. **Sensitive categories are hard stops.** Billing, credential and trust cases are never decided or changed, and money is never moved.
4. **A refusal is an output, not an error.** Each refusal creates a handoff with context.

## Routing table (synthetic roles)

| Trigger | Reason code | Goes to | Context packet includes |
|---|---|---|---|
| `category=billing` | `SENSITIVE_CATEGORY` | Billing Ops Specialist | reporter side and summary, related shift, related incident if any, "The desk does not change invoices or pay, and never moves money." |
| `category=credential` | `SENSITIVE_CATEGORY` | Credentialing Review Lead | same + "does not make credential or eligibility decisions" |
| `category=trust` | `SENSITIVE_CATEGORY` | Trust & Safety Reviewer | same + "does not make trust & safety or account-standing decisions" |
| shift_status, no `shift_id` | `ABSENT_IDENTIFIER` | Marketplace Reliability On-call | all six gate results, ask: identify the shift with the reporter |
| shift unknown to ledger | `UNKNOWN_IDENTIFIER` | Marketplace Reliability On-call | gate results |
| ledger read > 15 min old | `STALE_SOURCE` | Marketplace Reliability On-call | gate results, ask: confirm status from a fresh source |
| symptom without playbook | `NO_PLAYBOOK` | the symptom's owner | case list, suspected dependency |
| category outside the schema | `UNSUPPORTED_CATEGORY` | Support Ops Triage Lead | row and summary |

## Example from the sample run
C-1012 (worker, billing: "Worried my pay for this shift will be wrong because the status is stuck") goes to **Billing Ops Specialist**, linked to INC-001. The status repair on SH-2203 does not decide the pay question. The specialist does.

## Review service levels (to be set with the owners)
Not defined. They would be agreed in rollout phase 1.
