# API and webhook contracts

> **Specification.** In the demo every one of these is **simulated in the browser** (`src/engine/desk.ts`). The only real HTTP endpoint is `GET /api/health` on the Worker. A production version would need these contracts agreed with the owning engineering teams.

## Real endpoint (deployed)

`GET /api/health` → `200`
```json
{ "ok": true, "product": "Ops Reliability Desk (independent concept, not affiliated with Clipboard)", "storage": "none: state is browser-only", "data": "synthetic", "connectors": "simulated in browser" }
```
Any other `/api/*` → `404`. Non-GET/HEAD → `405`. All responses carry a strict CSP and security headers.

## Simulated: shift ledger read (source of truth)

`GET /ledger/shifts/{shift_id}` → `200`
```json
{ "shift_id": "SH-2201", "workplace_id": "WP-OAK", "status": "Clocked in", "seq": 4, "as_of": "2026-10-05T13:58:00Z" }
```
`404` if unknown, which gives `UNKNOWN_IDENTIFIER`. `as_of` must reflect replica freshness. The desk refuses if it is older than 15 min.

## Simulated: status projection write

`PUT /projection/shifts/{shift_id}/status`
Headers: `Idempotency-Key: resync:{incident}:{shift}:seq{ledgerSeq}:g{generation}`
```json
{ "status": "Clocked in", "seq": 4, "reason": "status_resync", "incident_id": "INC-001", "approved_by_role": "Ops Operator" }
```
| Response | Meaning | Desk behaviour |
|---|---|---|
| `200` | applied | record, done |
| `200` with the same key a second time | already applied | must not change state (desk also dedupes locally) |
| `409` | `seq` lower than current | treat as already newer; verify |
| `503` | transient | retry after 1s, then 2s, same key; after 3 attempts → DLQ |

**Required production guarantee:** the endpoint must honour `Idempotency-Key` for at least the DLQ retention period, and a status write must not trigger pay, billing or credential side effects.

## Simulated: inbound shift-events webhook

`POST /webhooks/shift-events`
```json
{ "event_id": "evt_9002", "shift_id": "SH-2201", "seq": 4, "status": "Clocked in", "emitted_at": "2026-10-05T13:02:00Z" }
```
| Rule | Behaviour |
|---|---|
| Duplicate `event_id` | ignored (`webhook_duplicate_ignored`) |
| `seq` ≤ current projection seq | ignored (`webhook_out_of_order_ignored`) |
| Unknown shift | ignored and logged |
| Otherwise | applied |

A production receiver would also verify an HMAC signature header and reject replays outside a timestamp window. Not implemented, because nothing real is received.

## Export: regression case (JSON)

```json
{
  "name": "INC-001 SHIFT_STATUS_STALE regression",
  "synthetic": true,
  "rule": { "symptom_code": "SHIFT_STATUS_STALE", "classification": "deterministic lookup" },
  "input_cases": [ { "case_id": "C-1001", "...": "..." } ],
  "expected": [ { "case_id": "C-1010", "eligible": false, "failed_gates": ["IDENTIFIER_PRESENT", "..."] } ],
  "executions": [ { "key": "resync:INC-001:SH-2201:seq4:g0", "status": "applied", "attempts": 1, "applied_times": 1 } ],
  "invariants": ["each idempotency key is applied at most once", "..."]
}
```
