# Metrics and event taxonomy

> **No results are claimed.** The definitions below are for a future validation. The numbers shown in the app are **synthetic counts from the demo scenario** and are labelled "Synthetic metric".

## Metric definitions

| Metric | Definition | Type | Target | Result |
|---|---|---|---|---|
| Cluster precision | correctly grouped cases ÷ grouped cases, on labelled history | quality | set in V4 | not measured |
| Investigations per root cause | distinct agent investigations per incident | efficiency | ↓ vs baseline | not measured |
| Time to verified resolution | first case `created_at` → `incident_resolved` | speed | set after baseline | not measured |
| Double-apply rate | keys with apply count > 1 ÷ keys | safety | 0 | 0 in automated tests (synthetic) |
| Unverified closure rate | resolved without `verification_passed` | safety | 0 | 0 by construction (tested) |
| Sensitive auto-decision rate | sensitive cases with any automated write | safety | 0 | 0 by construction (tested) |
| Refusal rate | refused ÷ cases in playbook incidents | guardrail | monitor | synthetic: 2/11 in sample |
| DLQ age p95 | time items spend in the DLQ | reliability | set in pilot | not measured |
| Rollback rate | rollbacks ÷ executions | quality | monitor | not measured |

## Event taxonomy (emitted by the engine, visible in the audit log)

| Event | When | Key fields in `detail` |
|---|---|---|
| `csv_imported` | file processed | rows, accepted, rejected, held |
| `row_rejected` | each error | row, column, code |
| `import_blocked` | file had errors | — |
| `duplicate_cases_skipped` | re-import | count |
| `incident_formed` | new cluster | id, owner, rule |
| `evidence_refreshed` / `gate_evaluated` | fresh read | case, eligible, failed gates |
| `handoff_created` | refusal or escalation | id, role, reason code |
| `permission_denied` | Viewer attempted an action | action |
| `repair_approved` / `repair_refused` | operator action | incident |
| `repair_attempt_ok` / `repair_attempt_failed` | each attempt | shift, HTTP, attempt no. |
| `repair_retry_scheduled` | backoff | delay |
| `repair_skipped_duplicate` | key already applied | key |
| `projection_updated` | write applied | shift, status, seq |
| `dlq_enqueued` / `dlq_replayed` | DLQ | shift |
| `simulated_fault_changed` | fault toggle | state |
| `webhook_applied` / `webhook_duplicate_ignored` / `webhook_out_of_order_ignored` / `webhook_unknown_shift` | inbound event | event_id, seq |
| `verification_passed` / `verification_failed` | verify | matched/total |
| `incident_resolved` | resolve | closed vs human-owned |
| `rollback_applied` | rollback | shift, restored value |
| `spec_exported` | export | incident |
| `role_changed` / `demo_reset` | UI | — |
