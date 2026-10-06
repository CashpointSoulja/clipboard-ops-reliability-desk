# Support runbook and incident handling

## Using the demo
1. Open the live demo and click **Load sample CSV**. To see validation errors first, click **Try a malformed file**.
2. Open **INC-001**. Read the upstream signal and the case evidence. C-1010 and C-1011 are refused, and C-1009 has no drift.
3. Click **Approve simulated re-sync**, check the list of changes, then click **Approve and execute**.
4. In the timeline, SH-2204 retries once and succeeds. SH-2206 fails 3 times and lands in the **dead-letter queue**.
5. **Verify from fresh read** fails while the DLQ is open. This is expected.
6. Tick **Simulated upstream recovered** and click **Replay**. Then **Verify** again (6/6) and **Resolve incident**.
7. **Export spec + regression case**. Optionally, **Simulate upstream backlog redelivery** to see older events ignored.
8. **Reset demo** at any time.

## Handling guide (production intent)

| Situation | Action |
|---|---|
| Verification fails, DLQ empty | Do not resolve. Re-read evidence. If the ledger changed, re-approve (new key). Otherwise roll back and escalate to the owner |
| DLQ item | Check dependency health. Replay only after recovery. Replay re-checks freshness |
| Replay says "source stale" | Re-read evidence first |
| Wrong cluster | Do not approve. Hand off the incident. File a rule fix with an exported regression case |
| Suspected side effect after a write | Roll back immediately. Disable the playbook flag. Open an incident with the owner |
| Sensitive case appears in a cluster | It can't be repaired (category gate). Confirm the handoff reached the specialist |

## Desk outage
The tool is static. If the Worker is down, operators fall back to the standard ticket process. No state is lost server-side, because there is none.

## Severity for incidents found through the desk (proposal)
- **SEV-2:** ≥ 10 cases on one dependency, or any workplace-facing status wrong for more than 1h.
- **SEV-3:** fewer, contained.

These thresholds are placeholders for the owners to set.
