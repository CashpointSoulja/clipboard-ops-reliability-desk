# v2 roadmap (if validated)

| Item | Why | Depends on |
|---|---|---|
| Read-only connector to a ticket platform export (e.g. Zendesk views) | Replace CSV upload | Phase 1 privacy review |
| Projection-vs-ledger drift alert | Detect before tickets arrive (5 Whys #4) | Ledger read API |
| Server-side append-only audit + SSO/RBAC | Multi-user, accountable approvals | Platform team |
| Dry-run mode with diff preview from the real API | Safer pilot | Write API |
| Webhook receiver with HMAC verification | Real backlog replay | Engineering owner |
| DLQ age alerting | Operational SLO | Phase 2 |
| Optional AI adapter for unmapped symptoms | Suggest a code; human confirms; never writes | [Adapter spec](21-ai-adapter-spec.md), approval, redaction |
| Second playbook (e.g. notification re-send) | Reuse the gate framework | Phase 2 success |
| Regression cases auto-filed to the engineering test suite | Close the loop | Repo access |
