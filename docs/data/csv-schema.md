# CSV schema: support case import

UTF-8 with a header row. RFC 4180 quoting: fields that contain commas, quotes or newlines are wrapped in `"`, and inner quotes are doubled. **Synthetic data only.** Rows with SSN-shaped or card-number-shaped digits are rejected (`POSSIBLE_PII`).

| Column | Required | Type / allowed | Example | Validation codes |
|---|---|---|---|---|
| `case_id` | yes | `[A-Za-z0-9_-]{2,40}`, unique in the file | `C-1001` | `MISSING_ID`, `BAD_ID`, `DUPLICATE_ID` |
| `created_at` | yes | ISO-8601 UTC (`Z`) | `2026-10-05T13:05:00Z` | `BAD_TIMESTAMP` |
| `side` | yes | `workplace` \| `worker` | `worker` | `BAD_SIDE` |
| `category` | yes | `shift_status` \| `billing` \| `credential` \| `trust`. Anything else is held for triage | `shift_status` | `MISSING_CATEGORY`, `UNSUPPORTED_CATEGORY` (warning) |
| `symptom_code` | yes | Code from the [data dictionary](data-dictionary.md). Unknown codes form an "unmapped" incident | `SHIFT_STATUS_STALE` | `MISSING_SYMPTOM` |
| `shift_id` | needed for repair | string | `SH-2201` | `ABSENT_IDENTIFIER` (warning; leads to refusal) |
| `workplace_id` | no | string | `WP-OAK` | — |
| `worker_ref` | no | pseudonymous reference | `WK-031` | — |
| `source_system` | no | where the case came from | `in_app_chat` | — |
| `evidence_read_at` | no | ISO-8601 UTC | `2026-10-05T13:58:00Z` | `BAD_TIMESTAMP` |
| `reported_status` | no | status the reporter saw | `Booked` | — |
| `summary` | yes | free text, synthetic | `App still says Booked` | `MISSING_SUMMARY` |

**File-level codes:** `EMPTY_FILE`, `MALFORMED_CSV` (unclosed or stray quote), `COLUMN_COUNT`, `MISSING_COLUMN` (error if the column is required, otherwise a warning), `UNKNOWN_COLUMN` (warning).

**Import semantics:** atomic. A file with any error is not ingested, and every issue is listed with a fix. Re-importing a file is idempotent: case IDs that already exist are skipped.

Sample file: the **Download sample CSV** button in the app, generated from `src/engine/sample.ts`.
