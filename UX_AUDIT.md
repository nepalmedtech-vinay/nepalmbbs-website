# UX_AUDIT.md

A code-level UX audit (routes, components, and copy actually read this
session). Not a substitute for the visual/browser QA the brief also asks
for — `npm run dev` plus a real look in a browser has not been done this
session; see `QA_REPORT.md` for what verification actually ran.

## What's structurally strong already

- **Real URLs for every section**, not tab-panel fragments — good for
  sharing, SEO, and back-button behavior (Phase 2's whole point).
- **A trust register exists as a distinct visual language** from
  marketing content (`EvidenceBadges.astro`, `TrustSection.astro`) —
  directly answers the brief's §21 trust-architecture ask, and predates
  this brief by several months.
- **Bilingual (EN/HI) support** on every page, not just the homepage
  (`i18n.js`, asserted by `build-verify.mjs`).
- **A CTA hierarchy token system** (`--cta-*` in the design tokens) exists
  specifically because, per `docs/DESIGN-SYSTEM.md`, three competing CTAs
  (lead form, WhatsApp, Calendly) used to render with identical visual
  weight. Worth confirming in a live browser pass that the hierarchy is
  still followed after the Phase 3/4 glass rollout — not re-verified this
  session.
- **Student portal uses a bearer token in the URL, then removes it from
  the address bar** (`docs/GOLIVE.md` §4.5) — a real, specific UX/security
  decision, not a generic "add auth" gloss.

## Gaps found by reading the routes

- ~~No college comparison.~~ **Fixed 2026-08-28** — `/colleges/compare`,
  linked from `/colleges`. Pick up to 4, compare side by side.
- **No cost/fee information anywhere, and this is deliberate, not a gap.**
  A parent's first practical question — "what will this actually cost" —
  genuinely has no page, but reading `colleges/index.astro` and
  `colleges/[slug].astro`'s own copy turned up a written editorial reason:
  fees are set per intake and a stale number is worse than none. See
  `DECISION_LOG.md` (2026-08-28). Do not read this as unfinished work.
- **`admission-process.astro` is 44 lines** — short for what the brief
  asks of an admission-journey page (research → eligibility → …→
  enrollment, each stage with documents/deadlines/common mistakes). Worth
  a direct read-through before deciding whether it's appropriately concise
  or under-built; not read in full this session.
- **No visible "last updated" or source-status labeling** on college
  profile pages, despite the trust-register system existing for exactly
  this purpose elsewhere on the site. If `EvidenceBadges.astro` is not
  already used on `colleges/[slug].astro`, that's a quick, high-trust win
  once `CONTENT_SOURCE_LOG.md` has real dates to show.

## Not assessed this session (needs a browser, not just source reading)

- Actual visual hierarchy and whitespace rhythm on a rendered page.
- Whether `prefers-reduced-motion` is honored by the aurora/motion system
  in practice (the CSS/JS exists; behavior not observed in a browser).
- Mobile vs. tablet vs. desktop layouts beyond the 390×844 viewport the
  test suite happens to check.
- Whether the theme generator's admin-facing customization actually
  produces a coherent result across all component families, or only the
  ones it was built and tested against.
