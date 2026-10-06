# Brand and Design Guide

Clipboard Ops Reliability Desk is an **independent concept by Ayo Ahmed**. It is **not affiliated with, endorsed by or connected to Clipboard**, and it has no access to any Clipboard system. Every case, ID, name and number in the product is synthetic.

This guide records what the public Clipboard site looked like on **October 5, 2026** so that the concept looks like it belongs in the same ecosystem. It was written before any application code. The visual reference is [`docs/brand/visual-guide.html`](brand/visual-guide.html), rendered as [`docs/brand/visual-guide.png`](brand/visual-guide.png).

## Sources inspected

| Page | URL | Observation |
|---|---|---|
| Careers (requested) | https://www.clipboardworks.com/careers | Redirects to `https://www.clipboard.com/careers` |
| Careers | https://www.clipboard.com/careers | Photo hero, yellow "JOIN US" eyebrow, Lora headline, yellow pill CTA |
| Home | https://www.clipboard.com/ | "Every Shift, Covered" hero, yellow and cream CTA cards, cream "How It Works" panel with product UI cards |
| Workplaces | https://www.clipboard.com/workplaces | Burgundy logo on a light header, cream sections |
| For Workers | https://www.clipboard.com/for-workers | Same system with pink, blue and green accents |

The captures are in [`docs/brand/captures/`](brand/captures/), downscaled to 1200 px wide. The colours and fonts below were read from the live DOM with `getComputedStyle`, not guessed from screenshots.

## Logo

- **Literal assets:** `clipboard-logo-yellow.svg` (fill `#fafa64`) and `clipboard-logo-burgundy.svg` (fill `#ca3051`). Both were downloaded unmodified from `clipboard.com/_next/static/media/`. viewBox `0 0 1300 375`, rendered at 40 px tall in the site header.
- **Usage in this concept:** the burgundy wordmark goes on light/cream surfaces and the yellow wordmark on dark or burgundy surfaces. Do not recolour, stretch, outline or animate it, and do not put a product name inside the wordmark.
- **Mandatory lockup:** the logo always appears with the label **"Independent concept · not affiliated with Clipboard"** right next to it. The product name "Ops Reliability Desk" is set separately in Lora so that it never looks like an official Clipboard sub-brand.
- **Ownership:** the Clipboard name and logo belong to their owner. They are used here only to show brand fit in an audition piece. Note in `NOTICE.md`.

## Palette (observed values)

| Token | Hex | Observed use on clipboard.com | Use in concept |
|---|---|---|---|
| `--cb-yellow` | `#FAFA64` | Logo on dark, primary CTA pill | Primary action buttons, highlight |
| `--cb-yellow-soft` | `#FAF97B` | CTA background on careers/workplaces | Hover/selected |
| `--cb-burgundy` | `#CA3051` | Logo on light, "Post" button in product UI, red accent ticks | Brand accent, focus ring, critical badges |
| `--cb-maroon` | `#37171A` | Dark text in warm sections | Text on yellow/cream, dark header band |
| `--cb-ink` | `#1F2937` | Default body text (most frequent colour) | Body text |
| `--cb-cream` | `#F0E9D9` | "How It Works" and section backgrounds | App background panels |
| `--cb-cream-light` | `#F8F4EA` | Lighter cream cards | Card surfaces |
| `--cb-pink` | `#EBA8B6` | Accent illustrations | Escalation/human-review tint |
| `--cb-blue` | `#3860BE` | Links | Links, "simulated connector" tag |
| `--cb-navy` | `#27455C` | Secondary dark | Timeline lines |
| `--cb-green` | `#468254` | Accents on workplaces page | Verified/resolved state |
| `--cb-grey` | `#696969` | Secondary text | Muted text (only on white, for contrast) |

**Contrast checks (WCAG 2.1, computed with the relative-luminance formula):** ink on cream is 12.14:1, maroon on yellow 14.56:1, burgundy on cream-light 4.72:1, white on burgundy 5.18:1, yellow on burgundy 4.67:1, grey `#696969` on cream 4.54:1, blue `#3860BE` on white 5.86:1, green `#468254` on white 4.58:1 and maroon on pink 8.32:1. All of these pass AA for normal text (4.5:1). Pairs close to the limit (grey on cream, green on white) are only used at 14 px or larger.

## Typography

| Role | Observed font | Observed sizes | Concept |
|---|---|---|---|
| Display / headings | **Lora** 600 (serif) | H1 58 px, H2 50 px, H3 22–23 px | Lora 600 (SIL OFL, self-hosted) |
| Body | **Work Sans** 400/500 | 16 px, 18–19 px lead | Work Sans 400/500/600 (SIL OFL, self-hosted) |
| Navigation / UI labels | **ppNeueMontreal** 400 (proprietary) | 13–14 px | Not licensed. Work Sans 500 at 14 px as a substitute |
| Eyebrow | Work Sans caps, wide tracking, yellow | ~14 px | Same for section eyebrows |

Fonts are bundled as WOFF2 files from the `@fontsource` packages, so the deployed demo makes no third-party font requests.

## Layout and components observed

- **Header:** logo left, centred nav, outlined pill "Workplace Log In" on the right, all over the hero photo.
- **Hero:** full-bleed photography of healthcare professionals, a white Lora headline, a short Work Sans subline, and two large rounded CTA cards (a yellow card for Workplaces and a cream card for Professionals), each with an icon tile and an arrow.
- **Section panels:** cream background, centred Lora heading, and a yellow pill CTA with a soft drop shadow.
- **Product UI cards (How It Works):** white or off-white cards with a 12–16 px radius and a thin warm-grey border (`#E1DED4`); a circular numbered badge (cream disc with a Lora numeral); dense 12–14 px UI text; a burgundy primary button ("Post"); a status list with a burgundy active dot and grey upcoming dots; avatars in soft circles.
- **Shape language:** pill buttons (100 px radius), 8 px radius on menu items, 12–16 px card radius, generous whitespace, subtle shadows.

## How the concept applies it

1. **App shell:** a cream page (`#F8F4EA`) with a white header carrying the burgundy logo, the "Independent concept" label and the product name in Lora. A persistent yellow-on-maroon banner reads "Synthetic data · Simulated connectors · Browser-only state".
2. **Workflow stepper:** numbered cream discs with Lora numerals (taken from "How It Works") for Upload → Validate → Cluster → Inspect → Repair → Verify → Resolve → Export.
3. **Cards:** white cards with a `#E1DED4` border and 14 px radius for cases, the incident queue and the timeline.
4. **Buttons:** a yellow pill for the primary action. A burgundy pill is reserved for *approve repair*, the one consequential action. An outlined pill is used for secondary actions.
5. **Status semantics:** green = verified, burgundy = blocked/refused, pink tint = human handoff, blue = simulated connector, navy = timeline.
6. **Badges are honest:** "DETERMINISTIC RULE", "SIMULATED CONNECTOR" and "SYNTHETIC METRIC" labels are always visible where they apply. There is no loading spinner pretending to be AI.
7. **No photography of real people.** The concept uses no Clipboard photos. Only the logo is reused.

## Do / Don't

- **Do:** keep the non-affiliation label next to every use of the logo, keep the footer credit "Concept by Ayo Ahmed", and label synthetic data everywhere.
- **Don't:** imitate Clipboard's login, imply this is a Clipboard product, use real employee names, or reuse their photography or customer logos.

**Accessibility adjustment (found by axe-core, see `docs/testing/accessibility.md`):** Clipboard burgundy `#CA3051` on the darker cream `#F0E9D9` is 4.00:1, which fails AA for 12 px eyebrow text. Small burgundy text uses a darker shade `#A82843` (5.43:1 on `#F0E9D9`). The logo and large surfaces keep `#CA3051`.
