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
  Three.js, and shader-based refraction. An orchestrator/router (which of
  the five fits a given requirement, and whether they combine) plus
  mandatory QA gates (performance, accessibility, fallback, cleanup) —
  the failure modes at this tier (a memory leak, a broken keyboard scroll,
  a dropped-frame WebGL scene) don't show up in a static screenshot the
  way a layout bug does, so the gates ask for a profile, not just a
  render. Not NepalMBBS-specific, reusable the same way as
  `premium-design-os` above.
