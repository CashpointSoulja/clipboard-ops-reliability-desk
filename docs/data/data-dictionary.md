# Data dictionary

All entities are synthetic and live in browser `localStorage` under the key `cord-desk-state-v1`.

## Entities

| Entity | Fields | Notes |
|---|---|---|
| **SupportCase** | CSV columns + `row` | Imported case |
| **LedgerShift** (simulated source of truth) | `shift_id`, `workplace_id`, `status`, `seq`, `as_of` | `as_of` is the time of the last authoritative read. Freshness gate uses it |
| **ProjectionShift** (simulated display view) | `shift_id`, `status`, `seq`, `updated_at` | What apps and support "see" |
| **WebhookEvent** | `event_id`, `shift_id`, `seq`, `status`, `emitted_at`, `delivery` | `delivery=failed` is the simulated outage |
| **Incident** | `id`, `title`, `symptom_code`, `dependency`, `affected_workflow`, `owner_role`, `playbook`, `case_ids`, `status`, `evidence[]`, `generation`, `webhook_failures`, `verification` | `generation` increments on rollback, so new keys are used |
| **CaseEvidence** | `case_id`, `shift_id`, `ledger`, `projection` (snapshots), `source_age_ms`, `read_at`, `gates[]`, `eligible`, `next_step` | Point-in-time snapshot |
| **Gate** | `id`, `pass`, `detail` | See below |
| **Execution** | `key`, `incident_id`, `shift_id`, `status` (`applied` \| `dlq` \| `rolled_back`), `before`, `target`, `attempts[]` | `before` enables rollback |
| **DlqItem** | `key`, `incident_id`, `shift_id`, `last_error`, `attempts`, `enqueued_at` | |
| **Handoff** | `id`, `case_ids`, `to_role`, `reason_code`, `reason`, `context[]`, `created_at`, `incident_id` | |
| **AuditEvent** | `seq`, `at`, `type`, `actor`, `detail`, `ref` | See [event taxonomy](../15-metrics-event-taxonomy.md) |

## Symptom codes (deterministic table, `src/engine/rules.ts`)

| Code | Label | Dependency | Owner (synthetic) | Playbook |
|---|---|---|---|---|
| `SHIFT_STATUS_STALE` | Shift status not updating | Shift-events webhook → status projection | Marketplace Reliability On-call | `status_resync` |
| `SHIFT_CLOCKIN_FAILED` | Clock-in fails in app | Clock-in service | Field App Reliability On-call | none → handoff |
| *any other* | Unmapped symptom | Unknown | Support Ops Triage Lead | none → handoff |

## Gates

| Gate | Passes when |
|---|---|
| `CATEGORY_ALLOWED` | category is `shift_status` and the incident's playbook is `status_resync` |
| `IDENTIFIER_PRESENT` | `shift_id` is non-empty |
| `IDENTIFIER_RESOLVES` | the shift exists in the ledger |
| `SOURCE_FRESH` | ledger `as_of` is ≤ 15 min before the current (simulated) time |
| `DRIFT_CONFIRMED` | projection status ≠ ledger status, or projection seq < ledger seq |
| `REVERSIBLE` | a prior projection value exists to restore |

## Handoff reason codes
`SENSITIVE_CATEGORY`, `ABSENT_IDENTIFIER`, `UNKNOWN_IDENTIFIER`, `STALE_SOURCE`, `NO_PLAYBOOK`, `UNSUPPORTED_CATEGORY`.

## Synthetic roles
Marketplace Reliability On-call · Field App Reliability On-call · Billing Ops Specialist · Credentialing Review Lead · Trust & Safety Reviewer · Support Ops Triage Lead. These are not real people or real teams.
