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

## 🔴 Read this first: accuracy problems found in the college data

A first-pass source check of all 27 colleges (`CONTENT_SOURCE_LOG.md`)
found several things that shouldn't wait for a "someday" content chunk.
**None of these were auto-corrected** — they need a human or a session
with working primary-source access. In rough priority order:

1. **Pokhara Academy of Health Sciences may not have a running MBBS
   program at all**, yet it's listed as one of the 27 MBBS-admitting
   colleges with 4 foreign-quota seats. One source described it as still
   working toward launching MBBS, offering only MD/MS. If that's current,
   the site is telling families they can apply for seats that don't
   exist. **Check `pahs.gov.np` or call MEC Nepal before the next intake.**
2. **One college's name is wrong.** "Universal Medicine College" should
   be **"Universal College of Medical Sciences"** (the UCMS acronym is
   right). An admissions site misnaming an institution is its own
   credibility problem.
3. **Two established years look wrong**: PAHS (site 2010 → sources say
   2008) and CMS Bharatpur (site 1994 → sources say 1993 *or* 1996,
   never 1994).
4. **One seat count conflicts**: Kathmandu Medical College (site 43 → one
   source says 33 foreign seats).
5. **Three MBBS programs are brand new and the site doesn't say so**:
   B&C (2024), MIHS (2024), Madan Bhandari (2025). Consider surfacing
   "first intake YYYY" — it's exactly the kind of thing this site's own
   trust-register design exists to communicate honestly.
6. **9 blank `established` fields are now fillable** from sourced
   candidates listed in `CONTENT_SOURCE_LOG.md`.

## Done since this file was last written

- ✅ **Removed dead code**: `src/components/Hero.astro` (confirmed
  unused anywhere — zero imports found by search) and the boot.js step
  that called it, `wrapHeroContent()`/`initHeroSlideshow()`, neither of
  which exist anywhere in the codebase. This ran, threw, and was silently
  swallowed on **every single page load, site-wide**, since whenever the
  functions were removed — invisible to `build-verify.mjs` because it
  only listens for uncaught `pageerror`, not `console.error`. Full verify
  suite re-run after this change; see `QA_REPORT.md`.
- ✅ **First-pass content-sourcing research, all 27 colleges** — see
  `CONTENT_SOURCE_LOG.md` for the per-college tables with sources.
  Done via `WebSearch` only (`WebFetch` is blocked in this sandbox for
  every domain tried, including MEC Nepal's own site). Found 1 wrong
  name, 2 wrong-looking years, 1 conflicting seat count, 1 program whose
  existence couldn't be confirmed, 3 undisclosed brand-new programs, and
  9 fillable blanks. Nothing auto-corrected — see the 🔴 section above.
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

1. **Work the 🔴 list above** — resolve each against a primary source
   (the college's own site, or MEC Nepal), then correct
   `src/data/colleges.json` and record the confirmation in
   `CONTENT_SOURCE_LOG.md`. Items 1 and 2 (PoAHS's program, the wrong
   college name) carry real "a family could be misled right now" risk;
   the rest are accuracy debt.

2. Re-check whether the three legacy glass-CSS variants noted in
   `docs/DESIGN-SYSTEM.md` §4 are actually dead now that the Phase 3/4
   theme engine exists, or still shipping (see `TECHNICAL_DEBT.md`).
   Quick, bounded, good "in-between" chunk if 1–2 are blocked.

4. A deadline/announcement center (brief §10.H) is still a real gap and
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
