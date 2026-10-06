# Rollout, adoption and rollback plan

> **Plan for a hypothetical production version.** Nothing has been rolled out.

| Phase | Scope | Entry criteria | Exit criteria | Rollback |
|---|---|---|---|---|
| 0 · Validate | Discovery V1–V3 | Sponsor + engineering owner | Problem confirmed; write API safe | Stop |
| 1 · Read-only shadow | Import/cluster/evidence on real ticket exports (minimised fields); no writes | Privacy review | Cluster precision ≥ target over 4 weeks | Disable import |
| 2 · Gated pilot | One symptom, one playbook, 2–3 trained operators, approval required, dry-run first | Phase 1 exit; idempotent API; runbook signed off | 0 double applies, 0 unverified closures, owners satisfied | Feature flag off; per-incident rollback |
| 3 · Expand | More operators; drift alerting | Phase 2 exit | Stable metrics | Same |
| 4 · New playbooks | Each new playbook goes through phases 1–2 separately | — | — | Per playbook flag |

## Adoption
- Train operators on reading the gates and on what refusal means.
- Weekly review of refusals and rollbacks with the incident owner.
- Exported regression cases go into the engineering test suite.

## Rollback levels
1. **Per incident:** the *Roll back this repair* button restores captured prior values.
2. **Per playbook:** a flag disables approval and leaves the desk read-only.
3. **Whole tool:** redeploy the previous Worker version from the Cloudflare dashboard. State is client-side, so no data migration is needed.
