# Workstation skills

Design methodology (4 skills) plus agent/automation methodology (2 skills)
— the second pair authored in response to a broader "what else does this
workstation need" audit, not the original premium-redesign brief. Kept in
one file since the reuse mechanism (copy the folder, or install the
packaged `.skill`) is identical for all six.

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

## Agent / automation methodology

Added after a direct question — "is this workstation's skill library
mature enough for [smart office / automation / agentic AI dev], or is
something missing?" Office work was found to already be well covered
(Anthropic's own `docx`/`pptx`/`xlsx`/`pdf` skills plus the connected
Gmail/Google Drive/Notion MCP servers — nothing added there, it would be
pure duplication). Automation and agent-building had a real, narrower gap:
tool-level primitives (hooks, triggers, MCP, subagents) already exist, but
nothing captured the *judgment* of which one to reach for, or how to build
a genuinely good agent rather than a plausible-looking one.

- `agent-architecture-lab/` — for building an agent (not a one-off skill):
  single-agent vs. subagent vs. multi-agent orchestration, tool design
  discipline (one tool one job, fail loud and structured, idempotency),
  context/prompt engineering, guardrails against the specific failure
  modes (runaway loops, prompt injection from untrusted tool results,
  silent partial failure), and an evaluation methodology modeled directly
  on `skill-creator`'s own draft→test→grade→iterate loop, generalized to
  full agent systems. Routes to `claude-api` for raw API mechanics rather
  than duplicating it.

- `automation-router/` — the decision tree for how an automation should
  actually be built inside Claude Code: a hook, a skill, a subagent, a
  scheduled Routine/trigger, an MCP tool, or an external platform
  (Zapier). Grounded in this project's own real hooks
  (`stop-hook-git-check.sh`, `session-start-git-identity.sh`) as concrete
  examples of "deterministic, no judgment needed — a hook, not a skill."
  Names the two recurring mistakes directly: an LLM call for something
  deterministic code would handle faster and more reliably, and a hook
  for something that actually needs judgment a hook cannot exercise.

## Reuse

All six skills are not NepalMBBS-specific — copy any folder into a future
project's `.claude/skills/` to reuse it there, or see
`premium-design-os/PREMIUM_DESIGN_OS.md` for the account-level install path
via a packaged `.skill` file (same mechanism works for all six).

**Honesty note, current as of the last session that touched these:** all
six were authored and internally reasoned through carefully, but none has
been run through `skill-creator`'s actual eval loop (draft → test prompts →
grade → iterate) — that was deliberately skipped for time, using the "vibe
with me" fast path skill-creator itself documents as legitimate. The
guidance is well-reasoned, not yet empirically measured against real
triggering prompts. `agent-architecture-lab` and `automation-router` in
particular were built with no concrete grounding project (unlike the
design skills, which had NepalMBBS's real bugs and screenshots as
evidence) — worth treating as a stronger draft than a proven system, and
worth running the eval loop before relying on them for a specific
high-stakes build.
