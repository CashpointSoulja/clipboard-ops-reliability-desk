# Decision log and ADRs

| # | Date | Decision | Status |
|---|---|---|---|
| D1 | 2026-10-05 | Brand guide committed before any app code | Done (`0aea5fc`) |
| D2 | 2026-10-05 | Scope to one symptom with one playbook | Accepted |
| D3 | 2026-10-05 | Browser-only state, static Worker | Accepted |
| D4 | 2026-10-05 | Deterministic classification; AI as adapter spec only | Accepted |
| D5 | 2026-10-05 | Atomic CSV import | Accepted |
| D6 | 2026-10-05 | Simulated clock and deterministic fault injection | Accepted |

## ADR-001: Simplest architecture: static Worker + in-browser engine
**Context:** the brief asks for the simplest architecture that shows the reliability behaviour, with no paid services and no secrets. **Decision:** a TypeScript engine (`src/engine`) runs in the browser. A Cloudflare Worker (`src/worker.ts`) serves assets with security headers and a health check. **Consequences:** zero server state and free-tier friendly. Multi-user and server audit trails are out of scope and disclosed.

## ADR-002: Idempotency key = incident + shift + ledger seq + generation
**Context:** retries, double clicks and replays must not double-apply. **Decision:** the key `resync:{inc}:{shift}:seq{n}:g{gen}` is reused across retries and replays. A rollback increments `gen`, so a deliberate re-run is distinguishable. **Consequences:** a changed ledger seq naturally produces a new key, so the repair targets the new truth.

## ADR-003: Re-read evidence at approval time
**Context:** time passes between inspection and approval. **Decision:** `approveRepair` calls `refreshEvidence` first, and only gate-passing shifts are executed. A test simulates 20 minutes passing, and nothing executes.

## ADR-004: Deterministic rules, labelled
**Context:** the brief forbids unapproved model calls and fake AI spinners. **Decision:** a lookup table, with "Deterministic rule" badges in the UI. **Consequences:** unmapped symptoms go to triage instead of being guessed.

## ADR-005: Evidence as snapshots
**Context:** the first UI build showed post-repair values in pre-repair evidence because the evidence objects were live references. **Decision:** evidence holds copies. A regression test was added.

## ADR-006: Atomic import
**Decision:** any row error blocks the whole file, so an incident never forms from partial data. Warnings (absent `shift_id`, unsupported category) are still imported, but they route to humans.
