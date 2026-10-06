import { parseCsv } from "./csv";

export const CSV_COLUMNS = [
  "case_id",
  "created_at",
  "side",
  "category",
  "symptom_code",
  "shift_id",
  "workplace_id",
  "worker_ref",
  "source_system",
  "evidence_read_at",
  "reported_status",
  "summary",
] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

export const REQUIRED_COLUMNS: CsvColumn[] = ["case_id", "created_at", "side", "category", "symptom_code", "summary"];
export const SIDES = ["workplace", "worker"] as const;
export const SUPPORTED_CATEGORIES = ["shift_status", "billing", "credential", "trust"] as const;
export type Side = (typeof SIDES)[number];
export type Category = (typeof SUPPORTED_CATEGORIES)[number];

export interface SupportCase {
  case_id: string;
  created_at: string;
  side: Side;
  category: Category;
  symptom_code: string;
  shift_id: string;
  workplace_id: string;
  worker_ref: string;
  source_system: string;
  evidence_read_at: string;
  reported_status: string;
  summary: string;
  row: number;
}

export type IssueSeverity = "error" | "warning";
export interface RowIssue {
  row: number;
  column: string;
  severity: IssueSeverity;
  code: string;
  message: string;
  fix: string;
}

export interface ValidationResult {
  ok: boolean;
  accepted: SupportCase[];
  issues: RowIssue[];
  rejectedRows: number;
  totalRows: number;
  /** Rows with a category outside the allow-list; kept for manual triage, never auto-processed. */
  unsupported: { row: number; case_id: string; category: string; summary: string }[];
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;
const SENSITIVE_TEXT = /\b(\d{3}-\d{2}-\d{4}|\d{13,19})\b/;

export function isIsoUtc(v: string): boolean {
  return ISO.test(v) && !Number.isNaN(Date.parse(v));
}

export function validateCsv(text: string): ValidationResult {
  const parsed = parseCsv(text);
  const issues: RowIssue[] = [];
  const accepted: SupportCase[] = [];
  const unsupported: ValidationResult["unsupported"] = [];

  for (const e of parsed.errors) {
    issues.push({ row: e.line, column: "*", severity: "error", code: "MALFORMED_CSV", message: e.message, fix: "Fix the quoting on this row and re-upload." });
  }
  if (parsed.header.length === 0) {
    issues.push({ row: 1, column: "*", severity: "error", code: "EMPTY_FILE", message: "The file has no header row.", fix: `Start the file with: ${CSV_COLUMNS.join(",")}` });
    return { ok: false, accepted, issues, rejectedRows: 0, totalRows: 0, unsupported };
  }

  const missingCols = CSV_COLUMNS.filter((c) => !parsed.header.includes(c));
  const unknownCols = parsed.header.filter((h) => !(CSV_COLUMNS as readonly string[]).includes(h));
  for (const c of missingCols) {
    const required = REQUIRED_COLUMNS.includes(c);
    issues.push({ row: 1, column: c, severity: required ? "error" : "warning", code: "MISSING_COLUMN", message: `Header is missing column "${c}".`, fix: `Add a "${c}" column to the header (see docs/data/csv-schema.md).` });
  }
  for (const c of unknownCols) {
    issues.push({ row: 1, column: c, severity: "warning", code: "UNKNOWN_COLUMN", message: `Column "${c}" is not in the schema and will be ignored.`, fix: "Remove or rename the column." });
  }
  if (REQUIRED_COLUMNS.some((c) => missingCols.includes(c))) {
    return { ok: false, accepted, issues, rejectedRows: parsed.rows.length, totalRows: parsed.rows.length, unsupported };
  }

  const idx = Object.fromEntries(parsed.header.map((h, i) => [h, i])) as Record<string, number>;
  const seen = new Map<string, number>();
  let rejectedRows = 0;

  for (const r of parsed.rows) {
    const get = (c: CsvColumn) => (idx[c] === undefined ? "" : (r.cells[idx[c]] ?? "").trim());
    const rowIssues: RowIssue[] = [];
    const add = (column: string, code: string, message: string, fix: string, severity: IssueSeverity = "error") =>
      rowIssues.push({ row: r.line, column, severity, code, message, fix });

    if (r.cells.length !== parsed.header.length) {
      add("*", "COLUMN_COUNT", `Row has ${r.cells.length} fields but the header has ${parsed.header.length}.`, "Check for an unquoted comma or a missing field.");
    }
    const caseId = get("case_id");
    if (!caseId) add("case_id", "MISSING_ID", "case_id is empty.", "Give every row a unique case_id such as C-1001.");
    else if (!/^[A-Za-z0-9_-]{2,40}$/.test(caseId)) add("case_id", "BAD_ID", `case_id "${caseId}" has unsupported characters.`, "Use letters, digits, dash or underscore only.");
    else if (seen.has(caseId)) add("case_id", "DUPLICATE_ID", `case_id "${caseId}" already appeared on row ${seen.get(caseId)}.`, "Remove the duplicate row or give it a new id.");
    else seen.set(caseId, r.line);

    const created = get("created_at");
    if (!isIsoUtc(created)) add("created_at", "BAD_TIMESTAMP", `created_at "${created}" is not an ISO-8601 UTC timestamp.`, "Use the form 2026-10-05T13:20:00Z.");
    const evidence = get("evidence_read_at");
    if (evidence && !isIsoUtc(evidence)) add("evidence_read_at", "BAD_TIMESTAMP", `evidence_read_at "${evidence}" is not an ISO-8601 UTC timestamp.`, "Use the form 2026-10-05T13:20:00Z or leave empty.");

    const side = get("side");
    if (!(SIDES as readonly string[]).includes(side)) add("side", "BAD_SIDE", `side "${side}" must be "workplace" or "worker".`, "Set side to workplace or worker.");

    const category = get("category");
    const supported = (SUPPORTED_CATEGORIES as readonly string[]).includes(category);
    if (!category) add("category", "MISSING_CATEGORY", "category is empty.", `Use one of: ${SUPPORTED_CATEGORIES.join(", ")}.`);
    if (!get("symptom_code")) add("symptom_code", "MISSING_SYMPTOM", "symptom_code is empty.", "Use a code from docs/data/data-dictionary.md, for example SHIFT_STATUS_STALE.");
    if (!get("summary")) add("summary", "MISSING_SUMMARY", "summary is empty.", "Add a one-line synthetic description.");
    if (SENSITIVE_TEXT.test(r.cells.join(" "))) {
      add("summary", "POSSIBLE_PII", "Row contains a number shaped like an SSN or card number.", "This demo only accepts synthetic data. Remove the number.");
    }
    if (category === "shift_status" && !get("shift_id")) {
      add("shift_id", "ABSENT_IDENTIFIER", "shift_status case has no shift_id; it can be imported but cannot be auto-repaired.", "Add the shift_id if known; otherwise the case goes to human handoff.", "warning");
    }

    const errors = rowIssues.filter((i) => i.severity === "error");
    issues.push(...rowIssues);
    if (errors.length > 0) { rejectedRows++; continue; }

    if (category && !supported) {
      issues.push({ row: r.line, column: "category", severity: "warning", code: "UNSUPPORTED_CATEGORY", message: `category "${category}" is not handled by this desk; it is held for manual triage and never auto-processed.`, fix: `Route it to its owning queue, or use one of: ${SUPPORTED_CATEGORIES.join(", ")}.` });
      unsupported.push({ row: r.line, case_id: caseId, category, summary: get("summary") });
      continue;
    }
    accepted.push({
      case_id: caseId, created_at: created, side: side as Side, category: category as Category,
      symptom_code: get("symptom_code"), shift_id: get("shift_id"), workplace_id: get("workplace_id"),
      worker_ref: get("worker_ref"), source_system: get("source_system"), evidence_read_at: evidence,
      reported_status: get("reported_status"), summary: get("summary"), row: r.line,
    });
  }

  const hasFileError = issues.some((i) => i.severity === "error" && (i.code === "MALFORMED_CSV" || i.row === 1));
  return { ok: !hasFileError && rejectedRows === 0, accepted, issues, rejectedRows, totalRows: parsed.rows.length, unsupported };
}
