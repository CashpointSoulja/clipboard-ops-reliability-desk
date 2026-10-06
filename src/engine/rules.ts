import type { Category } from "./schema";

/** Synthetic role names. None of these are real people or real Clipboard teams. */
export const ROLES = {
  reliability: "Marketplace Reliability On-call",
  fieldApp: "Field App Reliability On-call",
  billing: "Billing Ops Specialist",
  credential: "Credentialing Review Lead",
  trust: "Trust & Safety Reviewer",
  triage: "Support Ops Triage Lead",
} as const;

export interface SymptomRule {
  symptom_code: string;
  label: string;
  dependency: string;
  affected_workflow: string;
  owner_role: string;
  playbook: "status_resync" | null;
}

/** Deterministic lookup table. No model is involved in classification. */
export const SYMPTOM_RULES: SymptomRule[] = [
  {
    symptom_code: "SHIFT_STATUS_STALE",
    label: "Shift status not updating",
    dependency: "Shift-events webhook → status projection (simulated)",
    affected_workflow: "Shift lifecycle status shown to workplace and worker",
    owner_role: ROLES.reliability,
    playbook: "status_resync",
  },
  {
    symptom_code: "SHIFT_CLOCKIN_FAILED",
    label: "Clock-in fails in app",
    dependency: "Clock-in service (simulated)",
    affected_workflow: "Worker clock-in at shift start",
    owner_role: ROLES.fieldApp,
    playbook: null,
  },
];

export const UNMAPPED_RULE: SymptomRule = {
  symptom_code: "*",
  label: "Unmapped symptom",
  dependency: "Unknown — needs manual triage",
  affected_workflow: "Unknown",
  owner_role: ROLES.triage,
  playbook: null,
};

export function ruleFor(symptom: string): SymptomRule {
  return SYMPTOM_RULES.find((r) => r.symptom_code === symptom) ?? { ...UNMAPPED_RULE, symptom_code: symptom };
}

/** Categories that the desk may never decide. They always become a human handoff. */
export const SENSITIVE: Record<Exclude<Category, "shift_status">, { role: string; never: string }> = {
  billing: { role: ROLES.billing, never: "The desk does not change invoices or pay, and never moves money." },
  credential: { role: ROLES.credential, never: "The desk does not make credential or eligibility decisions." },
  trust: { role: ROLES.trust, never: "The desk does not make trust & safety or account-standing decisions." },
};

export const POLICY = {
  /** Max age of the source-of-truth read before an automated repair is allowed. */
  sourceFreshnessMs: 15 * 60 * 1000,
  /** Cases further apart than this from the first case form a separate incident. */
  clusterWindowMs: 2 * 60 * 60 * 1000,
  maxAttempts: 3,
  backoffMs: [1000, 2000, 4000],
} as const;

export type Role = "viewer" | "operator";
export const ROLE_LABEL: Record<Role, string> = { viewer: "Viewer (read-only)", operator: "Ops Operator" };
