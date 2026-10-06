import { toCsv } from "./csv";
import { CSV_COLUMNS } from "./schema";

export const SCENARIO_START = Date.parse("2026-10-05T14:00:00Z");

export interface LedgerShift { shift_id: string; workplace_id: string; status: string; seq: number; as_of: string }
export interface ProjectionShift { shift_id: string; status: string; seq: number; updated_at: string }
export interface WebhookEvent { event_id: string; shift_id: string; seq: number; status: string; emitted_at: string; delivery: "failed" | "delivered" }

const t = (hhmm: string, day = "2026-10-05") => `${day}T${hhmm}:00Z`;

/** Simulated source of truth (shift ledger). Synthetic. */
export function sampleLedger(): LedgerShift[] {
  return [
    { shift_id: "SH-2201", workplace_id: "WP-OAK", status: "Clocked in", seq: 4, as_of: t("13:58") },
    { shift_id: "SH-2202", workplace_id: "WP-OAK", status: "Completed", seq: 5, as_of: t("13:58") },
    { shift_id: "SH-2203", workplace_id: "WP-ELM", status: "Clocked in", seq: 4, as_of: t("13:58") },
    { shift_id: "SH-2204", workplace_id: "WP-ELM", status: "Cancelled by workplace", seq: 3, as_of: t("13:58") },
    { shift_id: "SH-2205", workplace_id: "WP-BAY", status: "Completed", seq: 5, as_of: t("13:58") },
    { shift_id: "SH-2206", workplace_id: "WP-BAY", status: "Clocked in", seq: 4, as_of: t("13:58") },
    { shift_id: "SH-2207", workplace_id: "WP-PINE", status: "Booked", seq: 2, as_of: t("13:58") },
    { shift_id: "SH-2209", workplace_id: "WP-PINE", status: "Completed", seq: 5, as_of: t("07:40") },
    { shift_id: "SH-2301", workplace_id: "WP-OAK", status: "Booked", seq: 2, as_of: t("13:58") },
    { shift_id: "SH-2302", workplace_id: "WP-ELM", status: "Booked", seq: 2, as_of: t("13:58") },
  ];
}

/** Simulated downstream status projection (what support and apps display). Stale where webhooks failed. */
export function sampleProjection(): ProjectionShift[] {
  return [
    { shift_id: "SH-2201", status: "Booked", seq: 2, updated_at: t("12:31") },
    { shift_id: "SH-2202", status: "Clocked in", seq: 4, updated_at: t("12:35") },
    { shift_id: "SH-2203", status: "Booked", seq: 2, updated_at: t("12:20") },
    { shift_id: "SH-2204", status: "Booked", seq: 2, updated_at: t("12:10") },
    { shift_id: "SH-2205", status: "Clocked in", seq: 4, updated_at: t("12:38") },
    { shift_id: "SH-2206", status: "Booked", seq: 2, updated_at: t("12:15") },
    { shift_id: "SH-2207", status: "Booked", seq: 2, updated_at: t("11:50") },
    { shift_id: "SH-2209", status: "Clocked in", seq: 4, updated_at: t("07:30") },
    { shift_id: "SH-2301", status: "Booked", seq: 2, updated_at: t("11:00") },
    { shift_id: "SH-2302", status: "Booked", seq: 2, updated_at: t("11:05") },
  ];
}

/** Simulated upstream webhook delivery log: deliveries failed 12:40–13:25 (HTTP 503 at the simulated receiver). */
export function sampleWebhookLog(): WebhookEvent[] {
  return [
    { event_id: "evt_9001", shift_id: "SH-2201", seq: 3, status: "Confirmed", emitted_at: t("12:41"), delivery: "failed" },
    { event_id: "evt_9002", shift_id: "SH-2201", seq: 4, status: "Clocked in", emitted_at: t("13:02"), delivery: "failed" },
    { event_id: "evt_9003", shift_id: "SH-2202", seq: 5, status: "Completed", emitted_at: t("12:55"), delivery: "failed" },
    { event_id: "evt_9004", shift_id: "SH-2203", seq: 3, status: "Confirmed", emitted_at: t("12:44"), delivery: "failed" },
    { event_id: "evt_9005", shift_id: "SH-2203", seq: 4, status: "Clocked in", emitted_at: t("13:05"), delivery: "failed" },
    { event_id: "evt_9006", shift_id: "SH-2204", seq: 3, status: "Cancelled by workplace", emitted_at: t("12:50"), delivery: "failed" },
    { event_id: "evt_9007", shift_id: "SH-2205", seq: 5, status: "Completed", emitted_at: t("13:10"), delivery: "failed" },
    { event_id: "evt_9008", shift_id: "SH-2206", seq: 3, status: "Confirmed", emitted_at: t("12:47"), delivery: "failed" },
    { event_id: "evt_9009", shift_id: "SH-2206", seq: 4, status: "Clocked in", emitted_at: t("13:12"), delivery: "failed" },
    { event_id: "evt_9010", shift_id: "SH-2209", seq: 5, status: "Completed", emitted_at: t("13:20"), delivery: "failed" },
  ];
}

type Row = Record<(typeof CSV_COLUMNS)[number], string>;
const row = (r: Partial<Row>): string[] => CSV_COLUMNS.map((c) => r[c] ?? "");

export const SAMPLE_ROWS: string[][] = [
  row({ case_id: "C-1001", created_at: t("13:05"), side: "workplace", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2201", workplace_id: "WP-OAK", worker_ref: "WK-031", source_system: "support_inbox", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "Nurse is on site but the shift still shows Booked on our dashboard" }),
  row({ case_id: "C-1002", created_at: t("13:07"), side: "worker", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2201", workplace_id: "WP-OAK", worker_ref: "WK-031", source_system: "in_app_chat", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "I clocked in but my app still says Booked" }),
  row({ case_id: "C-1003", created_at: t("13:09"), side: "worker", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2202", workplace_id: "WP-OAK", worker_ref: "WK-044", source_system: "in_app_chat", evidence_read_at: t("13:58"), reported_status: "Clocked in", summary: "Finished my shift, it still shows in progress" }),
  row({ case_id: "C-1004", created_at: t("13:11"), side: "workplace", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2203", workplace_id: "WP-ELM", worker_ref: "WK-052", source_system: "phone_log", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "Shift status not updating for today's CNA shift" }),
  row({ case_id: "C-1005", created_at: t("13:14"), side: "workplace", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2204", workplace_id: "WP-ELM", worker_ref: "WK-058", source_system: "support_inbox", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "We cancelled this shift but it still shows Booked" }),
  row({ case_id: "C-1006", created_at: t("13:16"), side: "worker", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2205", workplace_id: "WP-BAY", worker_ref: "WK-063", source_system: "in_app_chat", evidence_read_at: t("13:58"), reported_status: "Clocked in", summary: "Shift done but status is stuck" }),
  row({ case_id: "C-1007", created_at: t("13:18"), side: "workplace", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2206", workplace_id: "WP-BAY", worker_ref: "WK-070", source_system: "support_inbox", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "Dashboard does not show the professional as arrived" }),
  row({ case_id: "C-1008", created_at: t("13:21"), side: "worker", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2206", workplace_id: "WP-BAY", worker_ref: "WK-070", source_system: "in_app_chat", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "App says Booked even though I am clocked in" }),
  row({ case_id: "C-1009", created_at: t("13:24"), side: "workplace", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2207", workplace_id: "WP-PINE", worker_ref: "WK-081", source_system: "support_inbox", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "Is this shift status correct? Want to double check" }),
  row({ case_id: "C-1010", created_at: t("13:26"), side: "worker", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "", workplace_id: "WP-PINE", worker_ref: "WK-085", source_system: "phone_log", evidence_read_at: "", reported_status: "Booked", summary: "Caller says shift status is wrong but could not give the shift" }),
  row({ case_id: "C-1011", created_at: t("13:28"), side: "workplace", category: "shift_status", symptom_code: "SHIFT_STATUS_STALE", shift_id: "SH-2209", workplace_id: "WP-PINE", worker_ref: "WK-090", source_system: "support_inbox", evidence_read_at: t("07:40"), reported_status: "Clocked in", summary: "Status for the morning shift looks wrong" }),
  row({ case_id: "C-1012", created_at: t("13:30"), side: "worker", category: "billing", symptom_code: "PAY_AMOUNT_QUERY", shift_id: "SH-2203", workplace_id: "WP-ELM", worker_ref: "WK-052", source_system: "in_app_chat", evidence_read_at: t("13:58"), reported_status: "", summary: "Worried my pay for this shift will be wrong because the status is stuck" }),
  row({ case_id: "C-1013", created_at: t("13:33"), side: "worker", category: "credential", symptom_code: "CREDENTIAL_UPLOAD_QUERY", shift_id: "", workplace_id: "", worker_ref: "WK-097", source_system: "support_inbox", evidence_read_at: "", reported_status: "", summary: "Uploaded a renewed certificate, asking when it will be reviewed" }),
  row({ case_id: "C-1014", created_at: t("13:35"), side: "workplace", category: "trust", symptom_code: "CONDUCT_REPORT", shift_id: "SH-2301", workplace_id: "WP-OAK", worker_ref: "WK-102", source_system: "phone_log", evidence_read_at: "", reported_status: "", summary: "Workplace wants to report a conduct concern (synthetic)" }),
  row({ case_id: "C-1015", created_at: t("13:37"), side: "worker", category: "shift_status", symptom_code: "SHIFT_CLOCKIN_FAILED", shift_id: "SH-2301", workplace_id: "WP-OAK", worker_ref: "WK-102", source_system: "in_app_chat", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "Clock-in button gives an error" }),
  row({ case_id: "C-1016", created_at: t("13:39"), side: "worker", category: "shift_status", symptom_code: "SHIFT_CLOCKIN_FAILED", shift_id: "SH-2302", workplace_id: "WP-ELM", worker_ref: "WK-104", source_system: "in_app_chat", evidence_read_at: t("13:58"), reported_status: "Booked", summary: "Cannot clock in, spinner then error" }),
  row({ case_id: "C-1017", created_at: t("13:41"), side: "worker", category: "referral_bonus", symptom_code: "REFERRAL_QUERY", shift_id: "", workplace_id: "", worker_ref: "WK-110", source_system: "support_inbox", evidence_read_at: "", reported_status: "", summary: "Question about a referral programme" }),
];

export const SAMPLE_CSV = toCsv([...CSV_COLUMNS], SAMPLE_ROWS);

/** Deliberately broken file for the validation demo. */
export const MALFORMED_CSV = [
  CSV_COLUMNS.join(","),
  `,${t("13:05")},workplace,shift_status,SHIFT_STATUS_STALE,SH-2201,WP-OAK,WK-031,support_inbox,${t("13:58")},Booked,Missing case id`,
  `C-2002,yesterday,workplace,shift_status,SHIFT_STATUS_STALE,SH-2202,WP-OAK,WK-044,support_inbox,${t("13:58")},Booked,Bad timestamp`,
  `C-2003,${t("13:07")},vendor,shift_status,SHIFT_STATUS_STALE,SH-2203,WP-ELM,WK-052,support_inbox,${t("13:58")},Booked,Unknown side`,
  `C-2003,${t("13:08")},worker,shift_status,SHIFT_STATUS_STALE,SH-2203,WP-ELM,WK-052,support_inbox,${t("13:58")},Booked,Duplicate id`,
  `C-2005,${t("13:09")},worker,shift_status,SHIFT_STATUS_STALE,SH-2204,WP-ELM,WK-058,support_inbox,${t("13:58")},Booked,"Unclosed quote`,
].join("\n") + "\n";
