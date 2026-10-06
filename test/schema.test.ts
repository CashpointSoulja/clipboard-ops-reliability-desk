import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/engine/csv";
import { validateCsv, CSV_COLUMNS } from "../src/engine/schema";
import { MALFORMED_CSV, SAMPLE_CSV } from "../src/engine/sample";

const H = CSV_COLUMNS.join(",");
const ok = "C-1,2026-10-05T13:00:00Z,worker,shift_status,SHIFT_STATUS_STALE,SH-2201,WP-OAK,WK-1,chat,2026-10-05T13:58:00Z,Booked,Stuck";

describe("CSV parser", () => {
  it("handles quoted commas, escaped quotes and CRLF", () => {
    const r = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n');
    expect(r.errors).toEqual([]);
    expect(r.rows[0].cells).toEqual(["x, y", 'say "hi"']);
  });
  it("reports an unclosed quote with its line", () => {
    const r = parseCsv('a,b\n1,2\n3,"oops\n');
    expect(r.errors[0].line).toBe(3);
    expect(r.errors[0].message).toMatch(/Unclosed double quote/);
  });
});

describe("schema validation", () => {
  it("accepts the sample file with only warnings", () => {
    const v = validateCsv(SAMPLE_CSV);
    expect(v.rejectedRows).toBe(0);
    expect(v.accepted).toHaveLength(16);
    expect(v.unsupported.map((u) => u.case_id)).toEqual(["C-1017"]);
    expect(v.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("malformed CSV: gives actionable row errors", () => {
    const v = validateCsv(MALFORMED_CSV);
    const codes = v.issues.filter((i) => i.severity === "error").map((i) => `${i.row}:${i.code}`);
    expect(codes).toEqual(expect.arrayContaining(["2:MISSING_ID", "3:BAD_TIMESTAMP", "4:BAD_SIDE", "5:DUPLICATE_ID", "6:MALFORMED_CSV"]));
    expect(v.ok).toBe(false);
    for (const i of v.issues) expect(i.fix.length).toBeGreaterThan(10);
  });

  it("missing ID: row rejected with fix hint", () => {
    const v = validateCsv(`${H}\n${ok.replace("C-1,", ",")}\n`);
    expect(v.issues[0]).toMatchObject({ row: 2, column: "case_id", code: "MISSING_ID", severity: "error" });
    expect(v.accepted).toHaveLength(0);
  });

  it("missing required column blocks the file", () => {
    const v = validateCsv("case_id,created_at\nC-1,2026-10-05T13:00:00Z\n");
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "MISSING_COLUMN" && i.column === "category" && i.severity === "error")).toBe(true);
  });

  it("unsupported category is held for triage, not accepted", () => {
    const v = validateCsv(`${H}\n${ok.replace("shift_status", "referral_bonus")}\n`);
    expect(v.accepted).toHaveLength(0);
    expect(v.unsupported).toHaveLength(1);
    expect(v.issues[0].code).toBe("UNSUPPORTED_CATEGORY");
  });

  it("absent shift identifier is a warning, not a rejection", () => {
    const v = validateCsv(`${H}\n${ok.replace("SH-2201", "")}\n`);
    expect(v.accepted).toHaveLength(1);
    expect(v.issues[0]).toMatchObject({ code: "ABSENT_IDENTIFIER", severity: "warning" });
  });

  it("rejects rows that look like real PII", () => {
    const v = validateCsv(`${H}\n${ok.replace("Stuck", "SSN 123-45-6789")}\n`);
    expect(v.issues.some((i) => i.code === "POSSIBLE_PII")).toBe(true);
    expect(v.accepted).toHaveLength(0);
  });

  it("empty file", () => {
    expect(validateCsv("").issues[0].code).toBe("EMPTY_FILE");
  });
});
