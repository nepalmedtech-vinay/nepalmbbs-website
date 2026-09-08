# PREMIUM_DESIGN_OS

Portable master file. Read `SKILL.md` in this same folder for the
actual instruction set Claude follows — this file is the human-readable
overview and the install instructions, kept separate so `SKILL.md`
stays lean and machine-triggered.

## What this is

A design-quality router for any digital product, built to sit alongside
(not replace) two skills that already do detailed work in their own
territory: `design-taste-frontend` (marketing pages, portfolios,
redesigns) and `redesign-skill` (audit-first upgrades to an existing
site). This fills the gap those two explicitly don't cover — product UI:
dashboards, admin panels, CRMs, SaaS app shells, enterprise/education/
healthcare platforms — and adds three frameworks every project needs
regardless of type: maturity levels, a motion budget, and a quality gate.

## What premium means here

Clarity + hierarchy + typography + spacing + composition + motion +
consistency + performance. **Not** more gradients, more glass, more
glow, or more animation — see `references/DESIGN_ANTI_PATTERNS.md` for
the specific, named failure modes this rejects.

## How to use this in a new project

**Option A — copy the folder.** Copy this entire `premium-design-os/`
directory into the new project's `.claude/skills/` folder (same pattern
already used in this repo for `taste-skill` and `redesign-skill`, see
`.claude/skills/README.md`). It becomes available automatically in any
Claude Code session opened against that repo — repo-scoped, survives
via git, no account-level action needed.

**Option B — install it for every future project at once.** A packaged
`premium-design-os.skill` file (built with `skill-creator`'s
`package_skill.py`) can be uploaded through your Claude account's Skills
settings, the same way any custom skill is installed. This is the only
path that makes a skill available automatically in a *brand-new*
project's session without copying files into it first — a sandboxed
project session cannot register that upload on its own behalf; it has
to happen through your account.

**Option C — just paste this file.** If neither skill mechanism is
available in a given context, paste this file's content (or link it)
into the conversation at the start of a design task. It's shorter than
re-explaining "premium" from scratch every time, which is the whole
point of it existing.

## Scope note

This file, and the skill it documents, are intentionally generic — no
project-specific brand colors, fonts, or content live here. A project's
own design-system doc or `CLAUDE.md` always wins where it conflicts with
anything here (see `SKILL.md` §6, "Hierarchy").
