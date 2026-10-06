import { Desk, GateError, PermissionError, type Incident } from "../engine/desk";
import { MALFORMED_CSV, SAMPLE_CSV } from "../engine/sample";
import { CSV_COLUMNS } from "../engine/schema";
import { POLICY, ROLE_LABEL, type Role } from "../engine/rules";

const STORE = "cord-desk-state-v1";
const UI_STORE = "cord-desk-ui-v1";
const main = document.getElementById("main")!;
const dlg = document.getElementById("confirm") as HTMLDialogElement;
const roleSel = document.querySelector<HTMLSelectElement>("#role")!;

let desk = load();
let ui: { selected: string | null; exported: string | null } = loadUi();

function load(): Desk {
  try { const s = localStorage.getItem(STORE); if (s) return Desk.fromJSON(s); } catch { /* fall through */ }
  return new Desk();
}
function loadUi() { try { return JSON.parse(localStorage.getItem(UI_STORE) || "") } catch { return { selected: null, exported: null }; } }
function save() { localStorage.setItem(STORE, desk.toJSON()); localStorage.setItem(UI_STORE, JSON.stringify(ui)); }

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const hhmm = (iso: string) => iso ? iso.slice(11, 19) : "—";
const mins = (ms: number | null) => ms === null ? "—" : `${Math.round(ms / 60000)} min`;

function toast(msg: string) {
  const t = document.getElementById("toast")!;
  t.textContent = msg; t.classList.add("show");
  clearTimeout((t as unknown as { _h: number })._h);
  (t as unknown as { _h: number })._h = window.setTimeout(() => t.classList.remove("show"), 3200);
}

function act(fn: () => unknown, ok?: string) {
  try { fn(); if (ok) toast(ok); }
  catch (e) {
    if (e instanceof PermissionError || e instanceof GateError) toast(e.message);
    else { toast(`Error: ${(e as Error).message}`); console.error(e); }
  }
  save(); render();
}

// ---------- Steps ----------
function step(): number {
  const s = desk.state;
  const inc = s.incidents.find((i) => i.id === "INC-001");
  if (!s.validation) return 1;
  if (s.cases.length === 0) return 2;
  if (!inc || inc.status === "open" || inc.status === "rolled_back") return ui.selected ? 4 : 3;
  if (inc.status === "executing" || inc.status === "executed") return s.dlq.length ? 6 : 7;
  if (inc.status === "verified") return 8;
  return ui.exported ? 10 : 9;
}
const STEPS = ["Upload", "Validate", "Cluster", "Inspect evidence", "Approve repair", "Execution", "Verify fresh state", "Resolve", "Export spec"];

function stepper() {
  const n = step();
  return `<ol class="stepper" aria-label="Workflow progress">${STEPS.map((l, i) => {
    const k = i + 1; const cls = k < n ? "done" : k === n ? "now" : "";
    return `<li class="${cls}" ${k === n ? 'aria-current="step"' : ""}><span class="disc">${k < n ? "✓" : k}</span>${l}</li>`;
  }).join("")}</ol>`;
}

// ---------- Sections ----------
function intro() {
  return `<section class="panel cream" aria-labelledby="h-intro">
  <p class="eyebrow">Independent concept · one narrow workflow</p>
  <h1 id="h-intro">Turn a burst of support tickets into one owned, safely repaired incident</h1>
  <p>When an upstream webhook fails, workplaces and workers both write in about the same stuck shift status. This desk groups those cases with <strong>deterministic rules</strong>, shows the evidence, and lets an operator approve one <strong>reversible, simulated</strong> status re-sync. Sensitive cases go to a named human role.</p>
  <div class="grid2">
    <div class="value"><h3>Who uses it</h3><p>Support operations and reliability on-call staff who triage marketplace support queues. The roles here are synthetic.</p></div>
    <div class="value"><h3>Workflow pain (hypothesis)</h3><p>The same root cause shows up as many separate tickets from both sides of the marketplace. Each one is handled alone, and fixes are not checked against the source of truth.</p></div>
    <div class="value"><h3>Why the repair is safe</h3><p>It only copies status from the source-of-truth ledger, after six gates pass on a fresh read. Each write has an idempotency key, captures the prior value for rollback, and closure is checked again from fresh state.</p></div>
    <div class="value"><h3>Needs production validation</h3><p>Real ledger and projection APIs, whether writes are actually idempotent, freshness semantics, access control, audit retention, and whether this symptom really occurs at a volume worth automating.</p></div>
  </div></section>`;
}

function importPanel() {
  const v = desk.state.validation;
  const op = desk.state.role === "operator";
  let res = "";
  if (v) {
    const errs = v.issues.filter((i) => i.severity === "error"), warns = v.issues.filter((i) => i.severity === "warning");
    res = `<div class="callout ${errs.length ? "" : "good"}" id="validation-summary">
      <strong>${errs.length ? "Import blocked." : "Import accepted."}</strong> ${v.totalRows} rows · ${v.accepted.length} accepted · ${v.rejectedRows} rejected · ${v.unsupported.length} held for triage · ${warns.length} warning(s).
      ${errs.length ? " The file was not ingested. Fix the rows below and upload again." : ""}</div>
      ${v.issues.length ? `<div class="scroll"><table aria-label="Validation issues"><thead><tr><th>Row</th><th>Column</th><th>Severity</th><th>Problem</th><th>How to fix</th></tr></thead><tbody>
      ${v.issues.map((i) => `<tr><td>${i.row}</td><td><code>${esc(i.column)}</code></td><td><span class="badge ${i.severity === "error" ? "blk" : "syn"}">${i.severity}</span></td><td><code>${i.code}</code> ${esc(i.message)}</td><td>${esc(i.fix)}</td></tr>`).join("")}
      </tbody></table></div>` : ""}`;
  }
  return `<section class="panel" aria-labelledby="h-import" id="import">
  <p class="eyebrow">Step 1–2 · Upload and validate</p>
  <h2 id="h-import">Import synthetic support cases</h2>
  <p class="muted">Expected columns: <code>${CSV_COLUMNS.join(", ")}</code>. Timestamps are ISO-8601 UTC. Validation is deterministic and runs in this browser.</p>
  <div class="drop" id="drop">
    <p><label for="file"><strong>Drop a CSV here</strong> or choose a file</label></p>
    <input type="file" id="file" accept=".csv,text/csv" ${op ? "" : "disabled"}>
    <div class="row center">
      <button class="btn y" data-action="sample" type="button" ${op ? "" : "disabled"}>Load sample CSV (17 synthetic cases)</button>
      <button class="btn o sm" data-action="malformed" type="button" ${op ? "" : "disabled"}>Try a malformed file</button>
      <button class="btn o sm" data-action="download-sample" type="button">Download sample CSV</button>
    </div>
  </div>${res}</section>`;
}

function queue() {
  const s = desk.state;
  if (!s.incidents.length) return "";
  return `<section class="panel" aria-labelledby="h-queue" id="queue">
  <p class="eyebrow">Step 3 · Symptom clusters</p>
  <h2 id="h-queue">Owned incident queue</h2>
  <p class="muted"><span class="badge det">Deterministic rule</span> Cases are grouped by symptom code within a ${POLICY.clusterWindowMs / 3600000}-hour window, then mapped to a dependency and owner through a fixed lookup table. No model is called.</p>
  <div class="incidents">${s.incidents.map((i) => {
    const c = i.case_ids.map((id) => desk.caseById(id)!);
    return `<button class="inc" type="button" data-action="select" data-id="${i.id}" aria-pressed="${ui.selected === i.id}">
      <span class="row"><span class="badge ${statusBadge(i)}">${i.status.replace("_", " ")}</span><span class="badge det">Deterministic</span>${i.playbook ? '<span class="badge sim">Simulated repair</span>' : '<span class="badge hum">No playbook</span>'}</span>
      <h3>${i.id} · ${esc(i.title)}</h3>
      <dl class="kv"><dt>Owner</dt><dd>${esc(i.owner_role)}</dd><dt>Dependency</dt><dd>${esc(i.dependency)}</dd>
      <dt>Cases</dt><dd>${c.length} (${c.filter((x) => x.side === "workplace").length} workplace · ${c.filter((x) => x.side === "worker").length} worker)</dd>
      ${i.webhook_failures ? `<dt>Signal</dt><dd>${i.webhook_failures} failed webhook deliveries</dd>` : ""}</dl>
      <span class="muted">Inspect evidence →</span></button>`;
  }).join("")}</div></section>`;
}
function statusBadge(i: Incident) {
  return ({ open: "neu", executing: "sim", executed: "sim", verified: "ok", resolved: "ok", rolled_back: "blk", investigating: "hum" } as const)[i.status];
}

function detail() {
  const s = desk.state;
  if (!ui.selected) return "";
  const inc = s.incidents.find((i) => i.id === ui.selected);
  if (!inc) return "";
  const op = s.role === "operator";
  const eligible = inc.evidence.filter((e) => e.eligible);
  const shifts = [...new Set(eligible.map((e) => e.shift_id))];
  const execs = s.executions.filter((x) => x.incident_id === inc.id);
  const dlq = s.dlq.filter((d) => d.incident_id === inc.id);
  const failed = s.webhookLog.filter((e) => e.delivery === "failed" && inc.evidence.some((x) => x.shift_id === e.shift_id));
  const canApprove = op && inc.playbook === "status_resync" && ["open", "rolled_back", "executed"].includes(inc.status) && shifts.length > 0;

  const signal = inc.playbook ? `<div class="callout info"><span class="badge sim">Simulated connector</span> <strong>Upstream signal:</strong> ${failed.length} shift-event webhook deliveries returned HTTP 503 at the simulated receiver between ${hhmm(failed[0]?.emitted_at ?? "")} and ${hhmm(failed.at(-1)?.emitted_at ?? "")} UTC. Since then the status projection has been out of step with the shift ledger.</div>` : `<div class="callout">No approved automated repair exists for <code>${esc(inc.symptom_code)}</code>. The incident is handed to ${esc(inc.owner_role)} to investigate. The desk will not guess a fix.</div>`;

  const cases = inc.evidence.map((e) => {
    const c = desk.caseById(e.case_id)!;
    const noDrift = !e.eligible && e.gates.find((g) => !g.pass)?.id === "DRIFT_CONFIRMED" && e.ledger && e.projection;
    const gatesPassed = e.gates.filter((g) => g.pass).length;
    const refused = !e.eligible && !noDrift;
    return `<details class="case ${e.eligible ? "eligible" : noDrift ? "" : "refused"}" ${refused ? "open" : ""} aria-label="Case ${e.case_id}">
      <summary><strong>${e.case_id}</strong> <span class="badge neu">${c.side}</span> <span class="badge ${e.eligible ? "ok" : noDrift ? "neu" : "blk"}">${e.eligible ? "Eligible" : noDrift ? "No drift" : "Repair refused"}</span>
        <span class="cline">${esc(e.shift_id || "no shift_id")} · shown “${esc(e.projection?.status ?? "—")}” vs ledger “${esc(e.ledger?.status ?? "—")}” · ${e.ledger ? `${mins(e.source_age_ms)} old` : "no source read"} · gates ${gatesPassed}/6</span></summary>
      <p class="sum">“${esc(c.summary)}” <span class="muted">via ${esc(c.source_system)} at ${hhmm(c.created_at)}</span></p>
      <div class="ev">
        <div><b>Shift</b>${esc(e.shift_id || "absent")}</div>
        <div><b>Ledger (source)</b>${e.ledger ? `${esc(e.ledger.status)} · seq ${e.ledger.seq}` : "—"}</div>
        <div><b>Projection (shown)</b>${e.projection ? `${esc(e.projection.status)} · seq ${e.projection.seq}` : "—"}</div>
        <div><b>Data freshness</b>${e.ledger ? `${mins(e.source_age_ms)} old · read ${hhmm(e.read_at)}` : "n/a: no shift to read"}</div>
        <div><b>Affected workflow</b>${esc(inc.affected_workflow)}</div>
      </div>
      <div class="gates" aria-label="Risk gates">${e.gates.map((g) => `<span class="badge ${g.pass ? "ok" : "blk"}" title="${esc(g.detail)}">${g.pass ? "✓" : "✕"} ${g.id.replace(/_/g, " ").toLowerCase()}</span>`).join("")}</div>
      <p class="next"><strong>Next step:</strong> ${esc(e.next_step)}</p>
      ${refused ? `<p class="muted"><strong>Why refused:</strong> ${esc(e.gates.find((g) => !g.pass)?.detail)}</p>` : ""}
    </details>`;
  }).join("");

  const timeline = execs.length ? `<h3>Execution timeline</h3><p class="muted">Each write has an idempotency key. Retries reuse the same key, so a duplicate retry is never applied twice. Times are simulated.</p>
    <ul class="tl">${execs.map((x) => x.attempts.map((a) => `<li class="${a.ok ? "good" : "fail"}"><time>${hhmm(a.at)}</time><strong>${x.shift_id}</strong> attempt ${a.n}: HTTP ${a.http} · ${esc(a.note)}${a.ok ? ` → “${esc(x.target.status)}”` : ""} <code class="muted">${esc(x.key)}</code>${x.status === "rolled_back" ? ' <span class="badge blk">rolled back</span>' : ""}</li>`).join("")).join("")}
    ${s.events.filter((e) => e.ref === inc.id && (e.type === "repair_skipped_duplicate")).map((e) => `<li class="skip"><time>${hhmm(e.at)}</time>${esc(e.detail)}</li>`).join("")}</ul>` : "";

  const dlqHtml = execs.length || dlq.length ? `<h3>Dead-letter queue</h3>${dlq.length ? `<div class="callout"><strong>${dlq.length} item(s) failed ${POLICY.maxAttempts} attempts.</strong> Nothing was half-applied. Recovery: clear the simulated upstream fault, then replay. The replay reuses the same idempotency key.</div>
    <div class="row"><label class="row"><input type="checkbox" data-action="fault" ${s.faults.upstreamRecovered ? "checked" : ""} ${op ? "" : "disabled"}> Simulated upstream recovered</label></div>
    <ul class="tl">${dlq.map((d) => `<li class="fail"><strong>${d.shift_id}</strong> · ${d.attempts} attempts · ${esc(d.last_error)} <button class="btn o sm" type="button" data-action="replay" data-key="${esc(d.key)}" ${op ? "" : "disabled"}>Replay</button></li>`).join("")}</ul>` : `<p class="muted">Empty.</p>`}` : "";

  const ver = inc.verification ? `<div class="callout ${inc.verification.pass ? "good" : ""}" id="verification"><strong>${inc.verification.pass ? "Fresh-state verification passed" : "Verification failed"}</strong> at ${hhmm(inc.verification.at)}: ${inc.verification.checks.filter((c) => c.match).length}/${inc.verification.checks.length} shifts match the ledger on a new read.${dlq.length ? " Dead-letter items are still open." : ""}
    <div class="scroll"><table><thead><tr><th>Shift</th><th>Projection now</th><th>Ledger now</th><th>Match</th></tr></thead><tbody>${inc.verification.checks.map((c) => `<tr><td>${c.shift_id}</td><td>${esc(c.projection)}</td><td>${esc(c.ledger)}</td><td>${c.match ? "✓" : "✕"}</td></tr>`).join("")}</tbody></table></div></div>` : "";

  const handed = s.handoffs.filter((h) => h.incident_id === inc.id);
  return `<section class="panel" aria-labelledby="h-detail" id="detail">
  <p class="eyebrow">Steps 4–9 · ${inc.id}</p>
  <h2 id="h-detail">${esc(inc.title)}</h2>
  <dl class="kv"><dt>Owner</dt><dd>${esc(inc.owner_role)} (synthetic role)</dd><dt>Dependency</dt><dd>${esc(inc.dependency)}</dd><dt>Workflow</dt><dd>${esc(inc.affected_workflow)}</dd><dt>Status</dt><dd><span class="badge ${statusBadge(inc)}">${inc.status.replace("_", " ")}</span></dd></dl>
  ${signal}
  <div class="split"><div>
    <h3>Cases and evidence</h3>
    <p class="muted">Every repair needs six gates to pass on a fresh read: category allowed, identifier present, identifier resolves, source fresh (≤ ${POLICY.sourceFreshnessMs / 60000} min), drift confirmed, and reversible.</p>
    ${inc.playbook ? `<div class="row"><button class="btn o sm" type="button" data-action="refresh" ${op ? "" : "disabled"}>Re-read evidence</button></div>` : ""}
    ${cases}
  </div><div>
    ${inc.playbook ? `<h3>Repair</h3>
    <p><strong>${shifts.length}</strong> shift(s) eligible: ${shifts.join(", ") || "none"}. ${inc.evidence.length - eligible.length} case(s) excluded.</p>
    <div class="row">
      <button class="btn b" type="button" data-action="approve" ${canApprove ? "" : "disabled"}>Approve simulated re-sync</button>
      <button class="btn o sm" type="button" data-action="verify" ${execs.length && op && inc.status !== "resolved" ? "" : "disabled"}>Verify from fresh read</button>
      <button class="btn g sm" type="button" data-action="resolve" ${inc.status === "verified" && op ? "" : "disabled"}>Resolve incident</button>
    </div>
    ${!op ? '<p class="callout">Viewer role: read-only. Approve, replay, resolve and rollback need the Ops Operator role.</p>' : ""}
    ${timeline}${dlqHtml}${ver}
    ${execs.some((x) => x.status === "applied") && inc.status !== "resolved" ? `<p><button class="btn o sm" type="button" data-action="rollback" ${op ? "" : "disabled"}>Roll back this repair</button></p>` : ""}
    ${inc.status === "resolved" ? `<div class="callout good" id="resolved"><strong>${inc.id} resolved from fresh evidence.</strong> ${handed.length} case(s) still have a human owner (see handoffs).</div>
      <div class="row"><button class="btn y" type="button" data-action="export">Export spec + regression case</button><button class="btn o sm" type="button" data-action="redeliver" ${op ? "" : "disabled"}>Simulate upstream backlog redelivery</button></div>
      ${ui.exported === inc.id ? `<p class="muted">Downloaded <code>${inc.id}-spec.md</code> and <code>${inc.id}-regression.json</code>. Preview:</p><pre>${esc(desk.exportSpec(inc.id).markdown)}</pre>` : ""}` : ""}
    ` : ""}
  </div></div></section>`;
}

function handoffs() {
  const h = desk.state.handoffs;
  if (!h.length) return "";
  return `<section class="panel" aria-labelledby="h-handoffs" id="handoffs">
  <p class="eyebrow">Human review</p><h2 id="h-handoffs">Handoffs (${h.length})</h2>
  <p class="muted">Refused repairs and billing, credential and trust cases go to a named synthetic role, with context attached. The desk never makes those decisions and never moves money.</p>
  ${h.map((x) => `<article class="case ${x.reason_code === "SENSITIVE_CATEGORY" ? "" : "refused"}" aria-label="Handoff ${x.id}"><header><strong>${x.id}</strong><span class="badge hum">→ ${esc(x.to_role)}</span><span class="badge blk">${x.reason_code.replace(/_/g, " ").toLowerCase()}</span><span class="muted">${x.case_ids.join(", ")}${x.incident_id ? ` · ${x.incident_id}` : ""}</span></header>
    <p class="sum">${esc(x.reason)}</p><details><summary>Context packet</summary><ul>${x.context.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></details></article>`).join("")}
  </section>`;
}

function metrics() {
  const m = desk.metrics();
  if (!desk.state.cases.length) return "";
  return `<section class="panel" aria-labelledby="h-metrics"><p class="eyebrow">Illustrative only</p><h2 id="h-metrics">Synthetic run measurements <span class="badge syn">Synthetic metric</span></h2>
  <p class="muted">Counts from this browser session's synthetic scenario. They are not claims about Clipboard's operations or ROI.</p>
  <div class="grid2">
    <div class="metric"><b>${m.cases_imported} → ${m.incidents}</b>cases grouped into incidents</div>
    <div class="metric"><b>${m.approvals}</b>operator approval(s) for ${desk.state.executions.filter((x) => x.status !== "rolled_back").length} shift repairs</div>
    <div class="metric"><b>${m.max_apply_per_key}</b>max times any idempotency key was applied</div>
    <div class="metric"><b>${m.duplicate_applies_prevented}</b>duplicate or out-of-order writes ignored</div>
    <div class="metric"><b>${m.handoffs}</b>human handoffs with context</div>
    <div class="metric"><b>${m.dlq_open}</b>open dead-letter items</div>
  </div></section>`;
}

function audit() {
  const ev = desk.state.events;
  return `<section class="panel" aria-labelledby="h-audit"><details><summary id="h-audit">Audit log (${ev.length} events, simulated clock)</summary>
  <div class="scroll"><table><thead><tr><th>#</th><th>Time</th><th>Event</th><th>Actor</th><th>Detail</th></tr></thead><tbody>
  ${ev.slice().reverse().slice(0, 200).map((e) => `<tr><td>${e.seq}</td><td>${hhmm(e.at)}</td><td><code>${e.type}</code></td><td>${esc(e.actor)}</td><td>${esc(e.detail)}</td></tr>`).join("")}
  </tbody></table></div></details></section>`;
}

function about() {
  return `<section class="panel cream" aria-labelledby="h-about">
  <h2 id="h-about">How this demo is built</h2>
  <ul>
    <li><strong>Browser-only state.</strong> Cases, incidents and the audit log live in this browser's localStorage. The Cloudflare Worker only serves static files and a health check, and it stores nothing. <em>Reset demo</em> clears everything.</li>
    <li><strong>Simulated connectors.</strong> The shift ledger, status projection, webhook log and write API are in-browser simulations with deterministic fault injection: one transient 503 on SH-2204 and a persistent 503 on SH-2206 until the fault is cleared.</li>
    <li><strong>Deterministic classification.</strong> A fixed lookup table maps symptom code → dependency → owner → playbook.</li>
    <li><strong>Optional AI adapter: specification only.</strong> The docs describe an interface for suggesting a symptom code for unmapped cases, with human confirmation required. Nothing is connected, and no model is called.</li>
  </ul></section>`;
}

function render() {
  roleSel.value = desk.state.role;
  main.innerHTML = stepper() + (desk.state.cases.length ? "" : intro()) + importPanel() + queue() + detail() + handoffs() + metrics() + audit() + about();
  wireDrop();
}

function wireDrop() {
  const drop = document.getElementById("drop");
  const file = document.getElementById("file") as HTMLInputElement | null;
  file?.addEventListener("change", async () => { const f = file.files?.[0]; if (f) importText(await f.text(), f.name); });
  drop?.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop?.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop?.addEventListener("drop", async (e) => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer?.files[0]; if (f) importText(await f.text(), f.name); });
}

function importText(text: string, name: string) {
  act(() => {
    const v = desk.importCsv(text, name);
    if (v.rejectedRows === 0 && desk.state.incidents.length) ui.selected = null;
  });
  document.getElementById("validation-summary")?.scrollIntoView({ block: "center" });
}

function download(name: string, body: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function confirmApprove(inc: Incident) {
  const elig = inc.evidence.filter((e) => e.eligible);
  const shifts = [...new Set(elig.map((e) => e.shift_id))];
  dlg.innerHTML = `<div class="in"><p class="eyebrow">Risk gate · operator approval</p><h2 id="confirm-title">Approve simulated status re-sync?</h2>
  <p>The status of <strong>${shifts.length} shift(s)</strong> will be copied from the simulated ledger to the simulated projection:</p>
  <ul>${shifts.map((s) => { const e = elig.find((x) => x.shift_id === s)!; return `<li>${s}: “${esc(e.projection?.status)}” → “${esc(e.ledger?.status)}”</li>`; }).join("")}</ul>
  <p class="muted">Evidence is re-read before execution, and any shift that fails a gate at that point is skipped. Prior values are captured for rollback. ${inc.evidence.length - elig.length} case(s) are excluded and owned by humans. Nothing touches billing, credentials or trust.</p>
  <div class="row"><button class="btn b" type="button" id="dlg-ok">Approve and execute</button><button class="btn o" type="button" id="dlg-cancel">Cancel</button></div></div>`;
  dlg.showModal();
  dlg.querySelector<HTMLButtonElement>("#dlg-ok")!.onclick = () => {
    dlg.close();
    act(() => { const out = desk.approveRepair(inc.id); const d = desk.state.dlq.length; toast(`${out.filter((x) => x.status === "applied").length} applied · ${d} moved to dead-letter queue`); });
  };
  dlg.querySelector<HTMLButtonElement>("#dlg-cancel")!.onclick = () => dlg.close();
}

document.addEventListener("click", (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!el || el.tagName === "INPUT") return;
  const a = el.dataset.action!;
  const inc = ui.selected ? desk.state.incidents.find((i) => i.id === ui.selected) : undefined;
  switch (a) {
    case "reset": desk.reset(); ui = { selected: null, exported: null }; save(); render(); toast("Demo reset. Browser state cleared."); window.scrollTo(0, 0); break;
    case "sample": importText(SAMPLE_CSV, "sample-support-cases.csv"); break;
    case "malformed": importText(MALFORMED_CSV, "malformed-example.csv"); break;
    case "download-sample": download("sample-support-cases.csv", SAMPLE_CSV, "text/csv"); break;
    case "select": ui.selected = el.dataset.id!; ui.exported = null; save(); render(); document.getElementById("detail")?.scrollIntoView({ block: "start" }); break;
    case "refresh": if (inc) act(() => desk.refreshEvidence(inc.id), "Evidence re-read from simulated systems"); break;
    case "approve": if (inc) { if (desk.state.role !== "operator") act(() => desk.approveRepair(inc.id)); else confirmApprove(inc); } break;
    case "replay": act(() => { const x = desk.replayDlq(el.dataset.key!); toast(x.status === "applied" ? `${x.shift_id} applied on replay` : `${x.shift_id} still failing; kept in dead-letter queue`); }); break;
    case "verify": if (inc) act(() => { const v = desk.verify(inc.id); toast(v.pass ? "Verification passed" : "Verification failed"); }); break;
    case "resolve": if (inc) act(() => desk.resolve(inc.id), `${inc.id} resolved`); break;
    case "rollback": if (inc) act(() => { const n = desk.rollback(inc.id); toast(`${n} shift(s) restored to prior values`); }); break;
    case "export": if (inc) act(() => { const s = desk.exportSpec(inc.id); download(`${inc.id}-spec.md`, s.markdown, "text/markdown"); download(`${inc.id}-regression.json`, JSON.stringify(s.regression, null, 2), "application/json"); ui.exported = inc.id; }); break;
    case "redeliver": act(() => { const c = desk.redeliverBacklog(); toast(`Backlog: ${c.out_of_order ?? 0} older events ignored, ${c.duplicate ?? 0} duplicates, ${c.applied ?? 0} applied`); }); break;
  }
});
document.addEventListener("change", (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.dataset.action === "fault") act(() => desk.setUpstreamRecovered(el.checked), el.checked ? "Simulated upstream recovered" : "Simulated upstream failing");
});
roleSel.addEventListener("change", () => act(() => desk.setRole(roleSel.value as Role), `Acting as ${ROLE_LABEL[roleSel.value as Role]}`));

render();
