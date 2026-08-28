# NEXT_TASK.md

_Read this file first in a new session, after `PROJECT_STATE.md`. It is
overwritten at the end of every chunk to point at the next one._

## Status as of the end of this session's Phase 0

`npm run verify` was run for the first time in this container. It could
not run at all until three real bugs were fixed (see `DECISION_LOG.md`):
a missing `playwright` devDependency, three test files hardcoding a dead
absolute path, and a missing git tag a test asserts against. All three
are fixed. See `QA_REPORT.md` for the actual pass/fail results once the
run this session started has finished and been recorded there — if that
file still shows the run as in-progress, finish reading its output before
starting new feature work, since a red suite changes what "safe to build
on" means.

## Done since this file was last written

- ✅ **College comparison tool** — `src/pages/colleges/compare.astro` +
  `public/assets/js/compare.js`, linked from `/colleges`. Pick up to 4
  colleges, compare the exact fields already published on each college's
  own page (nothing new, nothing estimated). Verified by
  `tests/compare-verify.mjs` (13/13), wired into `npm run verify`. See
  `DECISION_LOG.md`'s 2026-08-28 entry for why it was built this way.
- ⛔ **Fee/cost planner — do not build this** without re-reading
  `DECISION_LOG.md`'s 2026-08-28 entry first. The codebase has an existing,
  deliberate, already-written editorial decision *not* to publish fee
  figures (`colleges/index.astro` and `colleges/[slug].astro` both say so,
  in their own copy, not just in these memory files). A calculator would
  reverse that decision, not fill a gap — and this session did not have
  the standing to make that call unilaterally on the owner's behalf.
  Revisit only if the owner explicitly decides to change that policy.

## Recommended next chunk, in order

1. **Finish reading out the `npm run verify` result from this session's
   second run** (kicked off after the comparison tool was built) and fix
   anything red before starting new feature work.

2. **`boot.js`'s dead hero step** (`TECHNICAL_DEBT.md`) — a one-line
   deletion (`wrapHeroContent()`/`initHeroSlideshow()` don't exist
   anywhere), currently throwing silently on every page load. Quick,
   bounded, good first task of a session, but confirm `Hero.astro`/
   `GlassHero.astro` don't actually need a client-side init call before
   just deleting the line.

3. **Start real content sourcing** per `CONTENT_SOURCE_LOG.md`. This is
   slower, research-heavy work (verifying 27 colleges' seats/admission
   routes/affiliations against official sources) — plan for it as its own
   focused session rather than squeezing it in. High value because it's
   the biggest gap against the brief's zero-fabrication standard, but
   correctness matters more than speed here, so don't rush it to close
   the checklist item.

4. Re-check whether the three legacy glass-CSS variants noted in
   `docs/DESIGN-SYSTEM.md` §4 are actually dead now that the Phase 3/4
   theme engine exists, or still shipping (see `TECHNICAL_DEBT.md`).
   Quick, bounded, good "in-between" chunk if 2–3 are blocked.

5. A deadline/announcement center (brief §10.H) is still a real gap and
   still needs real dates from an official source before it can exist —
   same rule as fees: no invented dates, ever.

## What NOT to do without asking

- Do not build a fee/cost calculator or publish any fee figure — see
  "Done since this file was last written" above. This is now the second
  time it's written down; treat it as settled, not open.

- Do not touch `supabase/migrations/`, apply a migration, or change RLS
  policy — this is database access the brief itself flags as needing
  explicit care, and `docs/GOLIVE.md` is the only source of truth for
  sequencing that.
- Do not deploy, connect Netlify, or point production at this branch.
  Nothing here goes live until the owner explicitly says so — this is
  stated directly in the session's own operating instructions, not just
  inferred caution.
- Do not remove `public/wrc-tracker/` or `public/cmc-tracker/`, or change
  their CSP — they're deliberately untouched, verbatim legacy apps.
- Do not fabricate college fees, seat counts, deadlines, or recognition
  status to fill a gap. Mark as unverified/estimated instead, and log it
  in `CONTENT_SOURCE_LOG.md`.
