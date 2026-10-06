import { validateCsv, type SupportCase, type ValidationResult } from "./schema";
import { POLICY, ROLES, SENSITIVE, ruleFor, type Role } from "./rules";
import {
  SCENARIO_START, sampleLedger, sampleProjection, sampleWebhookLog,
  type LedgerShift, type ProjectionShift, type WebhookEvent,
} from "./sample";

export type GateId = "CATEGORY_ALLOWED" | "IDENTIFIER_PRESENT" | "IDENTIFIER_RESOLVES" | "SOURCE_FRESH" | "DRIFT_CONFIRMED" | "REVERSIBLE";
export interface Gate { id: GateId; pass: boolean; detail: string }

export interface CaseEvidence {
  case_id: string;
  shift_id: string;
  ledger: LedgerShift | null;
  projection: ProjectionShift | null;
  source_age_ms: number | null;
  read_at: string;
  gates: Gate[];
  eligible: boolean;
  next_step: string;
}

export type IncidentStatus = "open" | "executing" | "executed" | "verified" | "resolved" | "rolled_back" | "investigating";
export interface Incident {
  id: string;
  title: string;
  symptom_code: string;
  dependency: string;
  affected_workflow: string;
  owner_role: string;
  playbook: "status_resync" | null;
  case_ids: string[];
  status: IncidentStatus;
  evidence: CaseEvidence[];
  generation: number;
  webhook_failures: number;
  verification: { at: string; checks: { shift_id: string; projection: string; ledger: string; match: boolean }[]; pass: boolean } | null;
}

export interface Attempt { n: number; at: string; ok: boolean; http: number; note: string }
export interface Execution {
  key: string;
  incident_id: string;
  shift_id: string;
  status: "applied" | "dlq" | "rolled_back";
  before: { status: string; seq: number; updated_at: string };
  target: { status: string; seq: number };
  attempts: Attempt[];
}
export interface DlqItem { key: string; incident_id: string; shift_id: string; last_error: string; attempts: number; enqueued_at: string }
export interface Handoff {
  id: string;
  case_ids: string[];
  to_role: string;
  reason_code: "SENSITIVE_CATEGORY" | "ABSENT_IDENTIFIER" | "UNKNOWN_IDENTIFIER" | "STALE_SOURCE" | "NO_PLAYBOOK" | "UNSUPPORTED_CATEGORY";
  reason: string;
  context: string[];
  created_at: string;
  incident_id: string | null;
}
export interface AuditEvent { seq: number; at: string; type: string; actor: string; detail: string; ref?: string }

export interface Faults { transientOnce: string[]; persistent: string[]; upstreamRecovered: boolean }

export interface DeskState {
  version: 1;
  clock: number;
  role: Role;
  validation: ValidationResult | null;
  cases: SupportCase[];
  incidents: Incident[];
  handoffs: Handoff[];
  executions: Execution[];
  dlq: DlqItem[];
  applyCounts: Record<string, number>;
  ledger: LedgerShift[];
  projection: ProjectionShift[];
  webhookLog: WebhookEvent[];
  processedEventIds: string[];
  faults: Faults;
  events: AuditEvent[];
  nextHandoff: number;
}

export class PermissionError extends Error { constructor(m: string) { super(m); this.name = "PermissionError"; } }
export class GateError extends Error { constructor(m: string) { super(m); this.name = "GateError"; } }

export function initialState(): DeskState {
  return {
    version: 1, clock: SCENARIO_START, role: "operator", validation: null, cases: [], incidents: [], handoffs: [],
    executions: [], dlq: [], applyCounts: {}, ledger: sampleLedger(), projection: sampleProjection(),
    webhookLog: sampleWebhookLog(), processedEventIds: [],
    faults: { transientOnce: ["SH-2204"], persistent: ["SH-2206"], upstreamRecovered: false },
    events: [], nextHandoff: 1,
  };
}

const iso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");

export class Desk {
  state: DeskState;
  constructor(state?: DeskState) { this.state = state ?? initialState(); }

  static fromJSON(json: string): Desk {
    const s = JSON.parse(json) as DeskState;
    if (s?.version !== 1) throw new Error("Unsupported saved state");
    return new Desk(s);
  }
  toJSON(): string { return JSON.stringify(this.state); }

  get now() { return iso(this.state.clock); }
  private tick(ms = 1000) { this.state.clock += ms; }
  private log(type: string, detail: string, ref?: string, actor = "desk") {
    this.state.events.push({ seq: this.state.events.length + 1, at: this.now, type, actor, detail, ref });
  }
  private actor() { return this.state.role === "operator" ? "Ops Operator" : "Viewer"; }

  setRole(role: Role) { this.state.role = role; this.log("role_changed", `Acting as ${role}`, undefined, "operator-ui"); }

  private requireOperator(action: string) {
    if (this.state.role !== "operator") {
      this.log("permission_denied", `${action} needs the Ops Operator role`, undefined, this.actor());
      throw new PermissionError(`${action} requires the Ops Operator role. Viewers are read-only.`);
    }
  }

  /** Reset to an empty desk with fresh simulated systems. */
  reset() {
    this.state = initialState();
    this.log("demo_reset", "All browser state cleared; simulated systems restored to the sample scenario");
  }

  // ---------- Import ----------
  importCsv(text: string, filename = "upload.csv"): ValidationResult {
    this.requireOperator("Import");
    const v = validateCsv(text);
    this.state.validation = v;
    this.tick();
    this.log("csv_imported", `${filename}: ${v.totalRows} rows, ${v.accepted.length} accepted, ${v.rejectedRows} rejected, ${v.unsupported.length} held`);
    for (const i of v.issues.filter((x) => x.severity === "error")) this.log("row_rejected", `row ${i.row} ${i.column}: ${i.code}`, String(i.row));
    if (v.rejectedRows > 0 || !v.ok && v.accepted.length === 0) {
      // Atomic import: a file with any rejected row is not ingested; the operator fixes and re-uploads.
      this.log("import_blocked", "Import not applied. Fix the listed rows and upload again.");
      return v;
    }
    const known = new Set(this.state.cases.map((c) => c.case_id));
    const fresh = v.accepted.filter((c) => !known.has(c.case_id));
    const dupes = v.accepted.length - fresh.length;
    if (dupes) this.log("duplicate_cases_skipped", `${dupes} case(s) already imported; skipped (idempotent import)`);
    this.state.cases.push(...fresh);
    for (const u of v.unsupported) {
      this.addHandoff([u.case_id], ROLES.triage, "UNSUPPORTED_CATEGORY", `Category "${u.category}" is outside this desk's scope.`, [
        `Row ${u.row}: ${u.summary}`, "Held for manual triage. No automated processing.",
      ], null);
    }
    this.cluster(fresh);
    return v;
  }

  // ---------- Clustering (deterministic) ----------
  private cluster(newCases: SupportCase[]) {
    for (const c of newCases) {
      if (c.category !== "shift_status") {
        const s = SENSITIVE[c.category];
        const related = this.state.incidents.find((i) => i.evidence.some((e) => e.shift_id && e.shift_id === c.shift_id))
          ?? this.state.incidents.find((i) => i.case_ids.some((id) => this.caseById(id)?.shift_id === c.shift_id && c.shift_id));
        this.addHandoff([c.case_id], s.role, "SENSITIVE_CATEGORY", `${c.category} case: a human decides.`, [
          `${c.side} reported: "${c.summary}"`,
          c.shift_id ? `Related shift ${c.shift_id}` : "No shift referenced",
          related ? `Possibly related to ${related.id} (${related.title}); status repair there does not decide this case.` : "No related incident found",
          s.never,
        ], related?.id ?? null);
        continue;
      }
      const rule = ruleFor(c.symptom_code);
      const t = Date.parse(c.created_at);
      let inc = this.state.incidents.find((i) => i.symptom_code === c.symptom_code && i.status !== "resolved" &&
        Math.abs(Date.parse(this.caseById(i.case_ids[0])!.created_at) - t) <= POLICY.clusterWindowMs);
      if (!inc) {
        inc = {
          id: `INC-${String(this.state.incidents.length + 1).padStart(3, "0")}`,
          title: rule.label, symptom_code: c.symptom_code, dependency: rule.dependency,
          affected_workflow: rule.affected_workflow, owner_role: rule.owner_role, playbook: rule.playbook,
          case_ids: [], status: rule.playbook ? "open" : "investigating", evidence: [], generation: 0,
          webhook_failures: 0, verification: null,
        };
        this.state.incidents.push(inc);
        this.log("incident_formed", `${inc.id} "${inc.title}" owned by ${inc.owner_role} (deterministic rule ${c.symptom_code})`, inc.id);
      }
      inc.case_ids.push(c.case_id);
    }
    for (const inc of this.state.incidents) {
      if (inc.status === "resolved") continue;
      const shifts = new Set(inc.case_ids.map((id) => this.caseById(id)!.shift_id).filter(Boolean));
      inc.webhook_failures = this.state.webhookLog.filter((e) => e.delivery === "failed" && shifts.has(e.shift_id)).length;
      if (!inc.playbook && !this.state.handoffs.some((h) => h.incident_id === inc.id && h.reason_code === "NO_PLAYBOOK")) {
        this.addHandoff([...inc.case_ids], inc.owner_role, "NO_PLAYBOOK", `No approved automated repair exists for ${inc.symptom_code}.`, [
          `${inc.case_ids.length} case(s) grouped under ${inc.id}`, `Suspected dependency: ${inc.dependency}`, "Investigate; the desk will not guess a fix.",
        ], inc.id);
      }
      this.refreshEvidence(inc.id, false);
    }
  }

  caseById(id: string) { return this.state.cases.find((c) => c.case_id === id); }
  incident(id: string) {
    const i = this.state.incidents.find((x) => x.id === id);
    if (!i) throw new Error(`Unknown incident ${id}`);
    return i;
  }

  // ---------- Evidence and gates ----------
  /** Fresh simulated read of the ledger (source of truth) and projection for every case in the incident. */
  refreshEvidence(incidentId: string, logIt = true): CaseEvidence[] {
    const inc = this.incident(incidentId);
    this.tick(500);
    inc.evidence = inc.case_ids.map((id) => this.evaluate(this.caseById(id)!, inc));
    if (logIt) this.log("evidence_refreshed", `${inc.id}: fresh read of simulated ledger and projection`, inc.id);
    for (const e of inc.evidence) this.log("gate_evaluated", `${e.case_id}: ${e.eligible ? "eligible" : "refused"} (${e.gates.filter((g) => !g.pass).map((g) => g.id).join(", ") || "all gates pass"})`, inc.id);
    this.handoffRefused(inc);
    return inc.evidence;
  }

  private evaluate(c: SupportCase, inc: Incident): CaseEvidence {
    const gates: Gate[] = [];
    const l0 = c.shift_id ? this.state.ledger.find((l) => l.shift_id === c.shift_id) : undefined;
    const p0 = c.shift_id ? this.state.projection.find((p) => p.shift_id === c.shift_id) : undefined;
    // Evidence is a point-in-time snapshot, not a live reference.
    const ledger = l0 ? { ...l0 } : null;
    const projection = p0 ? { ...p0 } : null;
    const age = ledger ? this.state.clock - Date.parse(ledger.as_of) : null;
    gates.push({ id: "CATEGORY_ALLOWED", pass: c.category === "shift_status" && inc.playbook === "status_resync", detail: inc.playbook ? "shift_status with an approved re-sync playbook" : "no approved playbook for this symptom" });
    gates.push({ id: "IDENTIFIER_PRESENT", pass: !!c.shift_id, detail: c.shift_id ? `shift_id ${c.shift_id}` : "case has no shift_id" });
    gates.push({ id: "IDENTIFIER_RESOLVES", pass: !!ledger, detail: ledger ? `found in simulated ledger` : c.shift_id ? `${c.shift_id} not found in simulated ledger` : "nothing to look up" });
    gates.push({ id: "SOURCE_FRESH", pass: age !== null && age <= POLICY.sourceFreshnessMs, detail: age === null ? "no source read" : `source read ${Math.round(age / 60000)} min old (limit ${POLICY.sourceFreshnessMs / 60000} min)` });
    const drift = !!ledger && !!projection && (projection.status !== ledger.status || projection.seq < ledger.seq);
    gates.push({ id: "DRIFT_CONFIRMED", pass: drift, detail: ledger && projection ? `projection "${projection.status}" (seq ${projection.seq}) vs ledger "${ledger.status}" (seq ${ledger.seq})` : "cannot compare" });
    gates.push({ id: "REVERSIBLE", pass: !!projection, detail: projection ? `prior value "${projection.status}" captured for rollback` : "no prior value to restore" });
    const eligible = gates.every((g) => g.pass);
    const failed = gates.find((g) => !g.pass);
    let next_step = "Approve simulated status re-sync from ledger";
    if (!eligible) {
      if (failed?.id === "DRIFT_CONFIRMED" && ledger && projection) next_step = "No drift: projection already matches ledger. Close from fresh evidence.";
      else if (failed?.id === "CATEGORY_ALLOWED") next_step = `Hand off to ${inc.owner_role}`;
      else next_step = `Refuse automated repair. Hand off to ${ROLES.reliability} with context.`;
    }
    return { case_id: c.case_id, shift_id: c.shift_id, ledger, projection, source_age_ms: age, read_at: this.now, gates, eligible, next_step };
  }

  private handoffRefused(inc: Incident) {
    if (!inc.playbook) return;
    for (const e of inc.evidence) {
      if (e.eligible) continue;
      const failed = e.gates.find((g) => !g.pass)!;
      if (failed.id === "DRIFT_CONFIRMED" && e.ledger && e.projection) continue;
      const code = failed.id === "IDENTIFIER_PRESENT" ? "ABSENT_IDENTIFIER" : failed.id === "IDENTIFIER_RESOLVES" ? "UNKNOWN_IDENTIFIER" : failed.id === "SOURCE_FRESH" ? "STALE_SOURCE" : "NO_PLAYBOOK";
      if (this.state.handoffs.some((h) => h.case_ids.includes(e.case_id) && h.reason_code === code)) continue;
      const c = this.caseById(e.case_id)!;
      this.addHandoff([e.case_id], ROLES.reliability, code, `Automated repair refused: ${failed.detail}.`, [
        `${c.side} reported: "${c.summary}"`,
        `Grouped under ${inc.id}; dependency ${inc.dependency}`,
        ...e.gates.map((g) => `${g.pass ? "PASS" : "FAIL"} ${g.id}: ${g.detail}`),
        code === "STALE_SOURCE" ? "Ask: confirm the shift's true status from a fresh source before any change." : "Ask: identify the shift with the reporter, then re-run the gates.",
      ], inc.id);
    }
  }

  private addHandoff(case_ids: string[], to_role: string, reason_code: Handoff["reason_code"], reason: string, context: string[], incident_id: string | null) {
    const h: Handoff = { id: `HO-${String(this.state.nextHandoff++).padStart(3, "0")}`, case_ids, to_role, reason_code, reason, context, created_at: this.now, incident_id };
    this.state.handoffs.push(h);
    this.log("handoff_created", `${h.id} → ${to_role}: ${reason_code} (${case_ids.join(", ")})`, h.id);
    return h;
  }

  // ---------- Repair ----------
  idempotencyKey(inc: Incident, shiftId: string, ledgerSeq: number) {
    return `resync:${inc.id}:${shiftId}:seq${ledgerSeq}:g${inc.generation}`;
  }

  /** Operator approval. Re-reads evidence first; only gate-passing shifts are touched. Safe to call twice. */
  approveRepair(incidentId: string): Execution[] {
    this.requireOperator("Approving a repair");
    const inc = this.incident(incidentId);
    if (inc.playbook !== "status_resync") {
      this.log("repair_refused", `${inc.id} has no approved playbook`, inc.id, this.actor());
      throw new GateError(`${inc.id} has no approved automated repair. It stays with ${inc.owner_role}.`);
    }
    if (inc.status === "resolved") throw new GateError(`${inc.id} is already resolved.`);
    this.log("repair_approved", `${inc.id}: simulated status re-sync approved`, inc.id, this.actor());
    this.refreshEvidence(inc.id);
    inc.status = "executing";
    const shifts = [...new Set(inc.evidence.filter((e) => e.eligible).map((e) => e.shift_id))];
    const out: Execution[] = [];
    for (const shiftId of shifts) {
      const ledger = this.state.ledger.find((l) => l.shift_id === shiftId)!;
      out.push(this.execute(inc, shiftId, this.idempotencyKey(inc, shiftId, ledger.seq)));
    }
    inc.status = "executed";
    this.log("repair_batch_done", `${inc.id}: ${out.filter((e) => e.status === "applied").length} applied, ${this.state.dlq.filter((d) => d.incident_id === inc.id).length} in dead-letter queue`, inc.id);
    return out;
  }

  private execute(inc: Incident, shiftId: string, key: string): Execution {
    const existing = this.state.executions.find((x) => x.key === key);
    if (existing && existing.status === "applied") {
      this.log("repair_skipped_duplicate", `${shiftId}: key ${key} already applied; not applied again`, inc.id);
      return existing;
    }
    const ledger = this.state.ledger.find((l) => l.shift_id === shiftId)!;
    const proj = this.state.projection.find((p) => p.shift_id === shiftId)!;
    const exec: Execution = existing ?? {
      key, incident_id: inc.id, shift_id: shiftId, status: "dlq",
      before: { status: proj.status, seq: proj.seq, updated_at: proj.updated_at },
      target: { status: ledger.status, seq: ledger.seq }, attempts: [],
    };
    if (!existing) this.state.executions.push(exec);
    for (let n = 1; n <= POLICY.maxAttempts; n++) {
      const res = this.simulatedProjectionWrite(shiftId);
      const attemptNo = exec.attempts.length + 1;
      exec.attempts.push({ n: attemptNo, at: this.now, ok: res.ok, http: res.http, note: res.note });
      this.log(res.ok ? "repair_attempt_ok" : "repair_attempt_failed", `${shiftId} attempt ${attemptNo}: HTTP ${res.http} ${res.note}`, inc.id);
      if (res.ok) {
        this.applyProjection(shiftId, exec.target.status, exec.target.seq, key);
        exec.status = "applied";
        this.state.dlq = this.state.dlq.filter((d) => d.key !== key);
        return exec;
      }
      if (n < POLICY.maxAttempts) {
        this.tick(POLICY.backoffMs[n - 1]);
        this.log("repair_retry_scheduled", `${shiftId}: retry in ${POLICY.backoffMs[n - 1] / 1000}s (same idempotency key)`, inc.id);
      }
    }
    exec.status = "dlq";
    const prev = this.state.dlq.find((d) => d.key === key);
    if (prev) { prev.attempts = exec.attempts.length; prev.last_error = exec.attempts.at(-1)!.note; }
    else this.state.dlq.push({ key, incident_id: inc.id, shift_id: shiftId, last_error: exec.attempts.at(-1)!.note, attempts: exec.attempts.length, enqueued_at: this.now });
    this.log("dlq_enqueued", `${shiftId}: ${POLICY.maxAttempts} attempts failed; moved to dead-letter queue`, inc.id);
    return exec;
  }

  /** Simulated connector. Deterministic fault injection; nothing leaves the browser. */
  private simulatedProjectionWrite(shiftId: string): { ok: boolean; http: number; note: string } {
    this.tick(300);
    const f = this.state.faults;
    if (f.transientOnce.includes(shiftId)) {
      f.transientOnce = f.transientOnce.filter((s) => s !== shiftId);
      return { ok: false, http: 503, note: "simulated transient upstream error" };
    }
    if (f.persistent.includes(shiftId) && !f.upstreamRecovered) return { ok: false, http: 503, note: "simulated upstream still failing" };
    return { ok: true, http: 200, note: "simulated projection write accepted" };
  }

  private applyProjection(shiftId: string, status: string, seq: number, key: string) {
    const p = this.state.projection.find((x) => x.shift_id === shiftId)!;
    p.status = status; p.seq = seq; p.updated_at = this.now;
    this.state.applyCounts[key] = (this.state.applyCounts[key] ?? 0) + 1;
    this.log("projection_updated", `${shiftId} → "${status}" (seq ${seq})`, key);
  }

  /** Clears the simulated upstream fault so DLQ items can be replayed. */
  setUpstreamRecovered(v: boolean) {
    this.state.faults.upstreamRecovered = v;
    this.log("simulated_fault_changed", v ? "Simulated upstream recovered" : "Simulated upstream failing", undefined, this.actor());
  }

  replayDlq(key: string): Execution {
    this.requireOperator("Replaying the dead-letter queue");
    const item = this.state.dlq.find((d) => d.key === key);
    const done = this.state.executions.find((x) => x.key === key && x.status === "applied");
    if (!item && done) { this.log("repair_skipped_duplicate", `${key} already applied; replay ignored`, done.incident_id); return done; }
    if (!item) throw new Error(`No dead-letter item ${key}`);
    const inc = this.incident(item.incident_id);
    this.log("dlq_replayed", `${item.shift_id}: replay requested`, inc.id, this.actor());
    const ledger = this.state.ledger.find((l) => l.shift_id === item.shift_id)!;
    if (this.state.clock - Date.parse(ledger.as_of) > POLICY.sourceFreshnessMs) {
      throw new GateError(`Source for ${item.shift_id} is now stale. Refresh evidence before replay.`);
    }
    return this.execute(inc, item.shift_id, key);
  }

  // ---------- Webhooks ----------
  /** Simulated upstream redelivers its backlog after recovery. Duplicates and older sequences are ignored. */
  deliverWebhook(evt: WebhookEvent): "applied" | "duplicate" | "out_of_order" | "unknown_shift" {
    this.tick(200);
    if (this.state.processedEventIds.includes(evt.event_id)) { this.log("webhook_duplicate_ignored", `${evt.event_id} already processed`); return "duplicate"; }
    this.state.processedEventIds.push(evt.event_id);
    const p = this.state.projection.find((x) => x.shift_id === evt.shift_id);
    if (!p) { this.log("webhook_unknown_shift", `${evt.event_id} for ${evt.shift_id}: no projection row`); return "unknown_shift"; }
    if (evt.seq <= p.seq) { this.log("webhook_out_of_order_ignored", `${evt.event_id} seq ${evt.seq} ≤ current seq ${p.seq} for ${evt.shift_id}`); return "out_of_order"; }
    p.status = evt.status; p.seq = evt.seq; p.updated_at = this.now;
    this.log("webhook_applied", `${evt.event_id}: ${evt.shift_id} → "${evt.status}" (seq ${evt.seq})`);
    return "applied";
  }

  redeliverBacklog(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.state.webhookLog.filter((x) => x.delivery === "failed")) {
      const r = this.deliverWebhook(e); counts[r] = (counts[r] ?? 0) + 1;
    }
    return counts;
  }

  // ---------- Verify / resolve / rollback ----------
  verify(incidentId: string) {
    const inc = this.incident(incidentId);
    this.tick(1000);
    const shifts = [...new Set(this.state.executions.filter((x) => x.incident_id === inc.id && x.status !== "rolled_back").map((x) => x.shift_id))];
    const checks = shifts.map((s) => {
      const p = this.state.projection.find((x) => x.shift_id === s)!;
      const l = this.state.ledger.find((x) => x.shift_id === s)!;
      return { shift_id: s, projection: p.status, ledger: l.status, match: p.status === l.status && p.seq >= l.seq };
    });
    const pass = checks.length > 0 && checks.every((c) => c.match) && !this.state.dlq.some((d) => d.incident_id === inc.id);
    inc.verification = { at: this.now, checks, pass };
    if (pass) inc.status = "verified";
    this.log(pass ? "verification_passed" : "verification_failed", `${inc.id}: ${checks.filter((c) => c.match).length}/${checks.length} shifts match ledger on fresh read${this.state.dlq.some((d) => d.incident_id === inc.id) ? "; dead-letter items outstanding" : ""}`, inc.id);
    return inc.verification;
  }

  resolve(incidentId: string) {
    this.requireOperator("Resolving an incident");
    const inc = this.incident(incidentId);
    if (!inc.verification?.pass) throw new GateError(`${inc.id} cannot be resolved until fresh-state verification passes.`);
    const stale = this.state.clock - Date.parse(inc.verification.at) > POLICY.sourceFreshnessMs;
    if (stale) throw new GateError("Verification is older than the freshness limit. Verify again.");
    inc.status = "resolved";
    const handed = this.state.handoffs.filter((h) => h.incident_id === inc.id).flatMap((h) => h.case_ids);
    this.log("incident_resolved", `${inc.id} resolved from fresh evidence; ${inc.case_ids.length - handed.length} case(s) closed, ${handed.length} with human owners`, inc.id, this.actor());
    return inc;
  }

  rollback(incidentId: string) {
    this.requireOperator("Rollback");
    const inc = this.incident(incidentId);
    const applied = this.state.executions.filter((x) => x.incident_id === inc.id && x.status === "applied");
    for (const x of applied.reverse()) {
      const p = this.state.projection.find((y) => y.shift_id === x.shift_id)!;
      p.status = x.before.status; p.seq = x.before.seq; p.updated_at = this.now;
      x.status = "rolled_back";
      this.log("rollback_applied", `${x.shift_id} restored to "${x.before.status}" (seq ${x.before.seq})`, inc.id, this.actor());
    }
    this.state.dlq = this.state.dlq.filter((d) => d.incident_id !== inc.id);
    for (const x of this.state.executions.filter((e) => e.incident_id === inc.id && e.status === "dlq")) x.status = "rolled_back";
    inc.generation += 1;
    inc.status = "rolled_back";
    inc.verification = null;
    this.tick();
    return applied.length;
  }

  // ---------- Export ----------
  exportSpec(incidentId: string) {
    const inc = this.incident(incidentId);
    const cases = inc.case_ids.map((id) => this.caseById(id)!);
    const regression = {
      name: `${inc.id} ${inc.symptom_code} regression`,
      synthetic: true,
      generated_at: this.now,
      rule: { symptom_code: inc.symptom_code, dependency: inc.dependency, owner_role: inc.owner_role, playbook: inc.playbook, classification: "deterministic lookup" },
      input_cases: cases.map(({ row: _r, ...c }) => c),
      expected: inc.evidence.map((e) => ({ case_id: e.case_id, shift_id: e.shift_id, eligible: e.eligible, failed_gates: e.gates.filter((g) => !g.pass).map((g) => g.id) })),
      executions: this.state.executions.filter((x) => x.incident_id === inc.id).map((x) => ({ key: x.key, shift_id: x.shift_id, status: x.status, attempts: x.attempts.length, applied_times: this.state.applyCounts[x.key] ?? 0 })),
      invariants: [
        "each idempotency key is applied at most once",
        "cases failing any gate are handed off, never repaired",
        "billing, credential and trust cases are never auto-decided",
        "incident resolves only after a fresh-state verification passes",
      ],
      verification: inc.verification,
    };
    const md = [
      `# Incident spec: ${inc.id} — ${inc.title}`, "", "> Synthetic scenario. Simulated connectors. Not a real Clipboard incident.", "",
      `- **Owner (synthetic role):** ${inc.owner_role}`, `- **Affected dependency:** ${inc.dependency}`, `- **Affected workflow:** ${inc.affected_workflow}`,
      `- **Classification:** deterministic rule \`${inc.symptom_code}\``, `- **Cases:** ${inc.case_ids.length} (${cases.filter((c) => c.side === "workplace").length} workplace, ${cases.filter((c) => c.side === "worker").length} worker)`,
      `- **Failed upstream webhook deliveries observed:** ${inc.webhook_failures}`, `- **Status:** ${inc.status}`, "",
      "## Gate results", "", "| Case | Shift | Eligible | Failed gates |", "|---|---|---|---|",
      ...regression.expected.map((e) => `| ${e.case_id} | ${e.shift_id || "—"} | ${e.eligible ? "yes" : "no"} | ${e.failed_gates.join(", ") || "—"} |`), "",
      "## Executions", "", "| Shift | Key | Status | Attempts | Applied times |", "|---|---|---|---|---|",
      ...regression.executions.map((x) => `| ${x.shift_id} | \`${x.key}\` | ${x.status} | ${x.attempts} | ${x.applied_times} |`), "",
      "## Invariants for the regression case", "", ...regression.invariants.map((i) => `- ${i}`), "",
      "## Needs production validation", "", "- Real ledger and projection read APIs, and their freshness semantics", "- Idempotency support at the real write endpoint", "- Role-based access and audit storage", "",
    ].join("\n");
    this.log("spec_exported", `${inc.id} spec and regression case exported`, inc.id, this.actor());
    return { markdown: md, regression };
  }

  // ---------- Synthetic metrics ----------
  metrics() {
    const s = this.state;
    const repairedCases = s.incidents.filter((i) => i.status === "resolved").flatMap((i) => i.evidence.filter((e) => e.eligible).map((e) => e.case_id));
    return {
      cases_imported: s.cases.length,
      incidents: s.incidents.length,
      handoffs: s.handoffs.length,
      repairs_applied: Object.values(s.applyCounts).reduce((a, b) => a + b, 0),
      duplicate_applies_prevented: s.events.filter((e) => e.type === "repair_skipped_duplicate" || e.type === "webhook_duplicate_ignored" || e.type === "webhook_out_of_order_ignored").length,
      dlq_open: s.dlq.length,
      approvals: s.events.filter((e) => e.type === "repair_approved").length,
      cases_closed_by_verified_repair: repairedCases.length,
      max_apply_per_key: Math.max(0, ...Object.values(s.applyCounts)),
    };
  }
}
