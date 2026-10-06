# Accessibility checks (actual evidence)

**Tooling:** axe-core 4.10.3 with the WCAG 2.0/2.1 A and AA rule tags, run in headless Chromium by `scripts/a11y.mjs`, plus a scripted keyboard pass.

## First run (found an issue)
```text
empty state: 1 violations, 27 rules passed, 0 need review
  - color-contrast (serious): 1 node(s) e.g. section[aria-labelledby="h-intro"] > .eyebrow
malformed import errors: 1 violations, 29 rules passed, 1 need review
  - color-contrast (serious): 1 node(s) e.g. section[aria-labelledby="h-intro"] > .eyebrow
incident detail: 0 violations, 31 rules passed, 2 need review
approval dialog: 0 violations, 14 rules passed, 1 need review
...
TOTAL axe violations: 2
```
**Fix:** small burgundy eyebrow text on dark cream was 4.28:1. It now uses `#A82843` (5.69:1). See the [brand guide note](../brand-design.md).

## After the fix
```text
empty state: 0 violations, 27 rules passed, 0 need review
malformed import errors: 0 violations, 29 rules passed, 1 need review
incident detail: 0 violations, 31 rules passed, 2 need review
approval dialog: 0 violations, 14 rules passed, 1 need review
dialog closes with Escape: true
keyboard Tab reaches "Approve simulated re-sync": true
Enter opens confirmation dialog: true
focused element has visible outline: true (solid)
TOTAL axe violations: 0
```

## Design-level measures
- Landmarks (`header`, `main`, `footer`), one `h1`, labelled sections.
- Native `<dialog>` for approval: focus moves into it, and Escape closes it.
- Visible 3 px focus outline. Status is never shown by colour alone (✓/✕ and text labels).
- Toasts use `aria-live="polite"`.
- `prefers-reduced-motion` is respected.
- No horizontal overflow at 390 px (e2e check).

## Not done
No screen-reader user testing and no manual NVDA/VoiceOver pass. The "need review" items from axe were not individually audited.
