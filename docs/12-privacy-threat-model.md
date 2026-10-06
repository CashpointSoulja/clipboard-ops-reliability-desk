# Privacy and threat model

## Data handling (actual, v0.1)
- **Data:** synthetic only. IDs such as `WK-031` are pseudonymous, and the summaries are invented.
- **Storage:** the browser's `localStorage` only. The Cloudflare Worker serves static files and `/api/health`. It has no bindings for KV, D1 or R2, holds no secrets and logs no request bodies. Observability is limited to Cloudflare's standard invocation logs.
- **Third parties:** none at runtime. Fonts are self-hosted. There is no analytics and no model calls.
- **Reset:** clears all desk state from the browser.
- **PII guard:** rows containing SSN-shaped or 13–19-digit numbers are rejected.

## STRIDE (demo scope)

| Threat | Example | Control |
|---|---|---|
| Spoofing | Someone pretends to be an operator | Demo role switch is cosmetic and disclosed. Production needs SSO + RBAC |
| Tampering | Edited localStorage state | Only affects that user's browser. No server trust |
| Repudiation | "Who approved this?" | Audit log with actor and simulated time. Production needs append-only server storage |
| Information disclosure | Leaking case data | No server storage. Synthetic data. CSP `default-src 'self'`, `connect-src 'self'` |
| Denial of service | Very large CSV | Parsed client-side, so it only affects that tab |
| Elevation of privilege | Viewer triggers repair | Engine-level `PermissionError` (not just a disabled button). Tested |

## Production privacy needs (not built)
A data-processing assessment for ticket exports, minimising fields to IDs and symptom codes, retention limits, access logging, and redaction before any optional AI adapter sees text.
