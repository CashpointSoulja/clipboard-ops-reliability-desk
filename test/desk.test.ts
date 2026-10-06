import { beforeEach, describe, expect, it } from "vitest";
import { Desk, GateError, PermissionError } from "../src/engine/desk";
import { MALFORMED_CSV, SAMPLE_CSV } from "../src/engine/sample";
import { ROLES } from "../src/engine/rules";

let d: Desk;
const inc1 = () => d.incident("INC-001");
beforeEach(() => { d = new Desk(); d.importCsv(SAMPLE_CSV, "sample.csv"); });

describe("clustering and routing (deterministic)", () => {
  it("groups shift-status symptoms into one owned incident tied to the webhook dependency", () => {
    const i = inc1();
    expect(i.symptom_code).toBe("SHIFT_STATUS_STALE");
    expect(i.case_ids).toHaveLength(11);
    expect(i.owner_role).toBe(ROLES.reliability);
    expect(i.dependency).toMatch(/webhook/);
    expect(i.webhook_failures).toBe(10);
    const sides = new Set(i.case_ids.map((id) => d.caseById(id)!.side));
    expect(sides).toEqual(new Set(["workplace", "worker"]));
  });
  it("symptom without a playbook becomes an investigating incident with a handoff", () => {
    const i = d.incident("INC-002");
    expect(i.status).toBe("investigating");
    expect(d.state.handoffs.find((h) => h.incident_id === "INC-002")?.reason_code).toBe("NO_PLAYBOOK");
  });
  it("billing, credential and trust cases escalate to named roles with context", () => {
    const byCase = (id: string) => d.state.handoffs.find((h) => h.case_ids.includes(id))!;
    expect(byCase("C-1012")).toMatchObject({ to_role: ROLES.billing, reason_code: "SENSITIVE_CATEGORY", incident_id: "INC-001" });
    expect(byCase("C-1012").context.join(" ")).toMatch(/never moves money/);
    expect(byCase("C-1013").to_role).toBe(ROLES.credential);
    expect(byCase("C-1014").to_role).toBe(ROLES.trust);
  });
  it("unsupported category goes to triage", () => {
    expect(d.state.handoffs.find((h) => h.case_ids.includes("C-1017"))?.reason_code).toBe("UNSUPPORTED_CATEGORY");
  });
});

describe("gates and refusal path", () => {
  it("absent identifier: refuses repair and creates a human handoff", () => {
    const e = inc1().evidence.find((x) => x.case_id === "C-1010")!;
    expect(e.eligible).toBe(false);
    expect(e.gates.find((g) => !g.pass)?.id).toBe("IDENTIFIER_PRESENT");
    expect(d.state.handoffs.find((h) => h.case_ids.includes("C-1010"))?.reason_code).toBe("ABSENT_IDENTIFIER");
  });
  it("stale evidence: refuses repair and creates a human handoff", () => {
    const e = inc1().evidence.find((x) => x.case_id === "C-1011")!;
    expect(e.gates.find((g) => g.id === "SOURCE_FRESH")?.pass).toBe(false);
    expect(d.state.handoffs.find((h) => h.case_ids.includes("C-1011"))?.reason_code).toBe("STALE_SOURCE");
  });
  it("no drift: case is not repaired and needs no handoff", () => {
    const e = inc1().evidence.find((x) => x.case_id === "C-1009")!;
    expect(e.eligible).toBe(false);
    expect(e.next_step).toMatch(/No drift/);
    expect(d.state.handoffs.some((h) => h.case_ids.includes("C-1009"))).toBe(false);
  });
  it("evidence that goes stale before approval is refused at approval time", () => {
    d.state.clock += 20 * 60 * 1000;
    d.approveRepair("INC-001");
    expect(d.state.executions).toHaveLength(0);
    expect(d.state.handoffs.filter((h) => h.reason_code === "STALE_SOURCE").length).toBeGreaterThan(1);
  });
});

describe("permission boundary", () => {
  it("viewer cannot approve, replay, resolve, rollback or import", () => {
    d.setRole("viewer");
    expect(() => d.approveRepair("INC-001")).toThrow(PermissionError);
    expect(() => d.resolve("INC-001")).toThrow(PermissionError);
    expect(() => d.rollback("INC-001")).toThrow(PermissionError);
    expect(() => d.importCsv(SAMPLE_CSV)).toThrow(PermissionError);
    expect(d.state.executions).toHaveLength(0);
    expect(d.state.events.some((e) => e.type === "permission_denied")).toBe(true);
  });
  it("operator cannot run a repair on an incident without a playbook", () => {
    expect(() => d.approveRepair("INC-002")).toThrow(GateError);
  });
});

describe("execution: idempotency, retry, DLQ, recovery", () => {
  it("happy path end to end", () => {
    const out = d.approveRepair("INC-001");
    expect(out.map((x) => x.shift_id)).toEqual(["SH-2201", "SH-2202", "SH-2203", "SH-2204", "SH-2205", "SH-2206"]);
    const t = out.find((x) => x.shift_id === "SH-2204")!;
    expect(t.attempts.map((a) => a.http)).toEqual([503, 200]);
    expect(t.status).toBe("applied");
    // failed retry -> DLQ
    const p = out.find((x) => x.shift_id === "SH-2206")!;
    expect(p.attempts.map((a) => a.http)).toEqual([503, 503, 503]);
    expect(d.state.dlq.map((x) => x.shift_id)).toEqual(["SH-2206"]);
    expect(d.verify("INC-001").pass).toBe(false);
    expect(() => d.resolve("INC-001")).toThrow(GateError);
    // replay while still failing stays in DLQ
    d.replayDlq(d.state.dlq[0].key);
    expect(d.state.dlq).toHaveLength(1);
    // deterministic recovery
    d.setUpstreamRecovered(true);
    d.replayDlq(d.state.dlq[0].key);
    expect(d.state.dlq).toHaveLength(0);
    const v = d.verify("INC-001");
    expect(v.pass).toBe(true);
    expect(v.checks).toHaveLength(6);
    d.resolve("INC-001");
    expect(inc1().status).toBe("resolved");
    expect(d.metrics().max_apply_per_key).toBe(1);
    const spec = d.exportSpec("INC-001");
    expect(spec.markdown).toMatch(/Synthetic scenario/);
    expect(spec.regression.executions.every((x) => x.applied_times === 1)).toBe(true);
  });

  it("duplicate approval does not apply the repair twice", () => {
    d.setUpstreamRecovered(true);
    d.approveRepair("INC-001");
    const before = { ...d.state.applyCounts };
    d.state.clock -= 0; // same evidence window
    // second approval: projection already matches, so gates find no drift and nothing executes
    d.approveRepair("INC-001");
    expect(d.state.applyCounts).toEqual(before);
    expect(Object.values(d.state.applyCounts).every((n) => n === 1)).toBe(true);
  });

  it("duplicate replay of an applied key is skipped", () => {
    d.setUpstreamRecovered(true);
    d.approveRepair("INC-001");
    const key = d.state.executions[0].key;
    d.state.dlq.push({ key, incident_id: "INC-001", shift_id: d.state.executions[0].shift_id, last_error: "x", attempts: 1, enqueued_at: d.now });
    d.state.dlq = [];
    const r = d.replayDlq(key);
    expect(r.status).toBe("applied");
    expect(d.state.applyCounts[key]).toBe(1);
    expect(d.state.events.at(-1)?.type).toBe("repair_skipped_duplicate");
  });
});

describe("webhooks", () => {
  it("duplicate event is ignored by event_id", () => {
    const e = { event_id: "evt_x", shift_id: "SH-2207", seq: 3, status: "Confirmed", emitted_at: d.now, delivery: "delivered" as const };
    expect(d.deliverWebhook(e)).toBe("applied");
    expect(d.deliverWebhook(e)).toBe("duplicate");
  });
  it("out-of-order event does not overwrite newer state", () => {
    d.setUpstreamRecovered(true);
    d.approveRepair("INC-001");
    const counts = d.redeliverBacklog();
    expect(counts.out_of_order).toBeGreaterThanOrEqual(8);
    const p = d.state.projection.find((x) => x.shift_id === "SH-2201")!;
    expect(p).toMatchObject({ status: "Clocked in", seq: 4 });
    expect(d.deliverWebhook({ event_id: "evt_old", shift_id: "SH-2201", seq: 3, status: "Confirmed", emitted_at: d.now, delivery: "delivered" })).toBe("out_of_order");
    expect(p.status).toBe("Clocked in");
  });
});

describe("rollback and reset", () => {
  it("rollback restores prior values and allows a clean re-run", () => {
    d.setUpstreamRecovered(true);
    d.approveRepair("INC-001");
    expect(d.rollback("INC-001")).toBe(6);
    expect(d.state.projection.find((x) => x.shift_id === "SH-2201")).toMatchObject({ status: "Booked", seq: 2 });
    expect(inc1().status).toBe("rolled_back");
    d.approveRepair("INC-001");
    expect(d.verify("INC-001").pass).toBe(true);
    expect(Object.values(d.state.applyCounts).every((n) => n === 1)).toBe(true);
    expect(new Set(d.state.executions.map((x) => x.key)).size).toBe(12);
  });
  it("reset clears everything and restores simulated systems", () => {
    d.approveRepair("INC-001");
    d.reset();
    expect(d.state.cases).toHaveLength(0);
    expect(d.state.executions).toHaveLength(0);
    expect(d.state.projection.find((x) => x.shift_id === "SH-2201")?.status).toBe("Booked");
    expect(d.state.events.map((e) => e.type)).toEqual(["demo_reset"]);
  });
  it("evidence is a snapshot that later writes do not mutate", () => {
    d.setUpstreamRecovered(true);
    const before = inc1().evidence.find((e) => e.case_id === "C-1001")!;
    d.approveRepair("INC-001");
    expect(before.projection?.status).toBe("Booked");
    expect(d.state.projection.find((p) => p.shift_id === "SH-2201")?.status).toBe("Clocked in");
  });
  it("state round-trips through JSON (browser storage)", () => {
    d.approveRepair("INC-001");
    const r = Desk.fromJSON(d.toJSON());
    expect(r.state).toEqual(d.state);
  });
  it("re-importing the same file is idempotent", () => {
    d.importCsv(SAMPLE_CSV);
    expect(d.state.cases).toHaveLength(16);
    expect(d.state.incidents).toHaveLength(2);
  });
  it("malformed file is not ingested", () => {
    const fresh = new Desk();
    fresh.importCsv(MALFORMED_CSV);
    expect(fresh.state.cases).toHaveLength(0);
    expect(fresh.state.events.some((e) => e.type === "import_blocked")).toBe(true);
  });
});
