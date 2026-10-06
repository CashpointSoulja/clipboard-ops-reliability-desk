# Business and role mapping

## The business (fact, sourced)

- Clipboard runs "an app-based marketplace that connects healthcare professionals with the workplaces that need amazing workers" [S1].
- It describes itself as founded in 2016, remote-first, over 1,000 people, and profitable since 2022 [S1].
- The public site positions the product as "Every Shift, Covered": workplaces post shifts, which are offered to qualified professionals, and Clipboard handles "scheduling to documentation to payment" [S3].

## The role (fact, sourced)

The "Strategy & Ops Lead, Applied AI" posting [S1] says the role will:

| Posting language [S1] | How this concept responds |
|---|---|
| "own and evolve our internal tooling ecosystem across Ops" | An internal ops tool, not a customer-facing feature |
| "support platforms, AI-driven systems, and internal automations" | Imports support-platform cases (CSV as a stand-in for a ticketing export), automates one repair, specifies an optional AI adapter |
| "Partner with engineers… write technical specs" | Exports each incident as a spec plus a regression case; full API/webhook contracts in `docs/data/` |
| "Troubleshoot issues, improve system reliability, and ensure tools perform effectively in production" | Idempotency, retry, dead-letter queue, fresh-state verification, rollback |
| "how tools, workflows, and dependencies connect" (Systems Thinking) | Symptom → dependency → owner mapping; one webhook failure linked to many tickets |
| "Translate defined problems into practical, well-scoped technical solutions" | One narrow workflow with explicit non-goals |
| Nice to have: "support platforms such as Zendesk" | CSV schema is designed to map from a ticket export; no Zendesk integration is claimed |

## Domain areas (from the brief, treated as domains only)

The brief that commissioned this concept says that a public profile of a Clipboard leader (referred to as "Samay") discusses marketplace reliability, credential support, billing, trust & safety and workplace support [S5]. **These are treated as workflow domains, not as evidence that any current Clipboard process is broken.** The concept therefore:
- automates only one reliability symptom (stale shift status after a webhook failure), and
- routes billing, credential and trust cases to people, never deciding them.

## Source ledger

| ID | Source | Accessed | Used for | Reliability |
|---|---|---|---|---|
| S1 | Clipboard job posting "Strategy & Ops Lead, Applied AI", https://jobs.ashbyhq.com/clipboard/425e7074-2a46-4e16-abab-d873ac58bc0c (a second listing with the same title: …/d37670c6-55e1-4633-87a4-2ef60302bd8d), via the public Ashby job-board API | 2026-10-06 | Role scope, company description | Primary, public |
| S2 | https://www.clipboardworks.com/careers → redirects to https://www.clipboard.com/careers | 2026-10-05 | Brand capture, careers copy | Primary, public |
| S3 | https://www.clipboard.com/ (home, "How It Works") | 2026-10-05 | Brand, product UI patterns, product description | Primary, public |
| S4 | https://www.clipboard.com/workplaces, https://www.clipboard.com/for-workers | 2026-10-05 | Brand, two-sided marketplace framing | Primary, public |
| S5 | The commissioning brief from Ayo Ahmed, summarising a public profile of "Samay" | 2026-10-05 | Domain list only | **Secondary; the profile itself was not independently retrieved or verified for this concept** |

No Clipboard employee, customer or professional was interviewed. No internal Clipboard data, tooling or documentation was used.
