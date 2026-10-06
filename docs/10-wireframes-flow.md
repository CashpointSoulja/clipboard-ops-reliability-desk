# Clickable flow and wireframes

The **clickable flow is the live demo itself** (link in the [root README](../README.md)). The screens below are actual screenshots taken by `scripts/e2e.mjs` during the automated run, in flow order.

| Step | Screen | Screenshot |
|---|---|---|
| 1 | Landing: who it's for, workflow pain (hypothesis), why the repair is safe, what needs production validation | ![landing](evidence/e2e/01-landing.png) |
| 2 | Malformed file: row-level errors with fixes; import blocked | ![malformed](evidence/e2e/02-malformed.png) |
| 3 | Sample accepted: owned incident queue with deterministic rule badges | ![queue](evidence/e2e/03-queue.png) |
| 4 | Incident detail: upstream signal, per-case evidence and gates, refusals | ![evidence](evidence/e2e/04-evidence.png) |
| 5 | After approval: execution timeline with retries and the dead-letter queue | ![execution](evidence/e2e/05-execution-dlq.png) |
| 6 | Verified, resolved and exported | ![resolved](evidence/e2e/06-resolved-export.png) |
| 7 | Human handoffs to named synthetic roles | ![handoffs](evidence/e2e/07-handoffs.png) |
| 8 | Mobile (390 px) | ![mobile](evidence/e2e/08-mobile.png) |

## Layout wireframe

```text
┌ Logo · INDEPENDENT CONCEPT · NOT AFFILIATED ─ Ops Reliability Desk ─ [Acting as ▾] [Reset] ┐
├ Banner: Synthetic data · Simulated connectors · Browser-only state ───────────────────────┤
│ Stepper 1 Upload › 2 Validate › 3 Cluster › … › 9 Export                                   │
│ Intro: Who uses it | Workflow pain (hypothesis) | Why safe | Needs production validation  │
│ Import: [drop zone] [Load sample] [Try malformed] [Download sample]  → validation table   │
│ Queue: incident cards (status · Deterministic · owner · dependency · cases)               │
│ Detail: header · upstream signal ┬ Cases & evidence (expandable, gates) │ Repair panel    │
│                                  │                                     │ timeline · DLQ  │
│                                  │                                     │ verify · export │
│ Handoffs · Synthetic metrics · Audit log · How this demo works                            │
└ Footer: Concept by Ayo Ahmed · not affiliated · source ───────────────────────────────────┘
```
