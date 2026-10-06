# Optional AI diagnosis adapter: specification only

> **Not connected. No model is called anywhere in this project.** This is an interface for possible later approval.

## Purpose
Suggest a `symptom_code` for cases whose code is missing or unmapped, so they can join an existing deterministic rule. The adapter never chooses a repair, never sees billing, credential or trust cases, and never writes.

## Interface
```ts
interface DiagnosisAdapter {
  suggest(input: {
    case_id: string;
    summary_redacted: string;   // PII-redacted before the call
    side: "workplace" | "worker";
    known_codes: string[];      // from SYMPTOM_RULES
  }): Promise<{
    case_id: string;
    suggested_code: string | null;  // must be one of known_codes or null
    rationale: string;              // shown to the operator
    model_id: string;               // recorded in the audit log
  }>;
}
```

## Guardrails
1. Off by default, enabled per environment after approval. Each call is logged as `ai_suggestion` with the model id.
2. Input: only `shift_status` cases, with redacted summaries. Never sensitive categories.
3. Output is validated: a code outside `known_codes` becomes `null`.
4. The suggestion appears as a **"Suggested — confirm"** chip. It takes effect only after an operator clicks confirm, and then deterministic rules and all six gates still apply.
5. The UI must show that a suggestion came from a model. No spinner without a real call.
6. Evaluation before enablement: precision on labelled history, compared with the deterministic baseline.
