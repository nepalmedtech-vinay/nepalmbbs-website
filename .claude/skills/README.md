# Design skills

## Vendored

Source: https://github.com/Leonxlnx/taste-skill (MIT, © 2026 Leonxlnx)

Added at the owner's request for the premium redesign work. Only the two
SKILL.md files actually used are vendored, plus the upstream LICENSE —
not the whole repository. Reviewed before adoption: they are design
methodology documents with no scripts, network calls, or credential access.

- `taste-skill/`    — anti-slop frontend methodology (design read, dials, layout/motion/type rules)
- `redesign-skill/` — audit-first redesign process, for changing an existing site rather than a greenfield one

## Authored in this repo, meant to be reused elsewhere

- `premium-design-os/` — universal design-quality router for product UI
  (dashboards, admin panels, CRMs, SaaS app shells) that `taste-skill`
  explicitly excludes ("not dashboards, not data tables, not multi-step
  product UI"), plus cross-cutting maturity-level, motion-budget, and
  quality-gate frameworks. Routes to `taste-skill`/`redesign-skill` for
  marketing-page work rather than duplicating them. Not NepalMBBS-specific
  — copy this folder into any future project's `.claude/skills/` to reuse
  it, or see `premium-design-os/PREMIUM_DESIGN_OS.md` for the account-level
  install path via a packaged `.skill` file.

- `creative-technology-lab/` — the heavy tier downstream of
  `premium-design-os`'s CSS-first gate: GSAP, Lenis, SVG/Canvas, WebGL/
  Three.js, shader-based refraction, Lottie/video, and sound design. An
  orchestrator/router (which domain fits a given requirement, and whether
  they combine) plus mandatory QA gates (performance, accessibility,
  fallback, cleanup) — the failure modes at this tier (a memory leak, a
  broken keyboard scroll, a dropped-frame WebGL scene, unwanted autoplay
  audio) don't show up in a static screenshot the way a layout bug does,
  so the gates ask for a profile, not just a render.

- `native-app-design/` — the mobile-native counterpart to
  `premium-design-os`, which is web-shaped (CSS/DOM). Covers iOS
  (SwiftUI/UIKit), Android (Jetpack Compose/Material), React Native, and
  Flutter: platform-native spring-based motion (concrete timing values per
  platform in `references/PLATFORM_MOTION.md`), interactive gesture-driven
  navigation (`references/GESTURES_NAVIGATION.md` — the single highest-
  leverage "does this feel native" signal), haptics, and the native-
  specific anti-patterns (a web-style hamburger menu on iOS, ignoring safe
  areas, a splash screen with a spinner).

- `brand-identity-lab/` — for the narrower case a project needs a bespoke
  visual identity beyond an off-the-shelf icon library (which
  `taste-skill` and `native-app-design` both correctly default to).
  Names the specific tell that separates bespoke illustration from
  generic-AI illustration (smooth gradient blobs, "Corporate Memphis"
  figures, generic isometric scenes), a construction-rules discipline
  (grid/stroke/corner/perspective, template in
  `references/CONSTRUCTION_SPEC_TEMPLATE.md`) for keeping a hand-drawn
  icon system consistent over time, and the rule that custom assets
  should ground in the project's real content/domain rather than generic
  industry-cliché scenes — the same principle this project's own college
  map already follows.

All four "authored in this repo" skills are not NepalMBBS-specific — copy
any folder into a future project's `.claude/skills/` to reuse it there, or
see `premium-design-os/PREMIUM_DESIGN_OS.md` for the account-level install
path via a packaged `.skill` file (same mechanism works for all four).

**Honesty note, current as of the last session that touched these:** all
four were authored and internally reasoned through carefully, but none has
been run through `skill-creator`'s actual eval loop (draft → test prompts →
grade → iterate) — that was deliberately skipped for time, using the "vibe
with me" fast path skill-creator itself documents as legitimate. The
guidance is well-reasoned, not yet empirically measured against real
triggering prompts. Worth running the eval loop before treating these as
fully proven, if that matters for a specific high-stakes use.
