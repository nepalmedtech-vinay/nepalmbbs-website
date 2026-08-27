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

## Recommended next chunk, in order

1. **Finish reading out this session's `npm run verify` result and fix
   anything red**, before adding any feature. Do not build on an unverified
   baseline. If a check fails, fix the actual defect, not the test — unless
   reading the test shows *it* is the one that's wrong (as was true for the
   three path bugs this session already fixed).

2. **College comparison tool** (`src/pages/colleges/index.astro` and/or a
   new `compare.astro`). Recommended as the first real feature chunk
   because: it's the single highest-value gap against the master brief's
   admissions-ecosystem framing (§10.D), it needs no new content research
   (all fields already exist in `src/data/colleges.json`: type, badge,
   location, affiliation, established, seats, duration, admission,
   website), and it's additive — no risk to the auth/RLS/CSP work that
   must be preserved. Suggested shape: a picker (2–3 colleges from the 27),
   a comparison table over the existing fields, respecting the same
   `data-act`/`data-do` CSP-safe event pattern the rest of the site uses
   (check `tools/action-allowlist.json` — any new handler name must be
   added there or `npm run verify` will fail on the CSP handler-dispatch
   check). Add it to `tests/build-verify.mjs` or a new focused test, not
   just eyeballed.

3. **Start real content sourcing** per `CONTENT_SOURCE_LOG.md`. This is
   slower, research-heavy work (verifying 27 colleges' seats/admission
   routes/affiliations against official sources) — plan for it as its own
   focused session rather than squeezing it in. High value because it's
   the biggest gap against the brief's zero-fabrication standard, but
   correctness matters more than speed here, so don't rush it to close
   the checklist item.

4. **Fee/cost planner**, but only after step 3 has real sourced fee data
   for at least a useful subset of colleges — building the calculator UI
   before the data exists risks shipping placeholder numbers that read as
   official, which is exactly what the brief prohibits.

5. Re-check whether the three legacy glass-CSS variants noted in
   `docs/DESIGN-SYSTEM.md` §4 are actually dead now that the Phase 3/4
   theme engine exists, or still shipping (see `TECHNICAL_DEBT.md`).
   Quick, bounded, good "in-between" chunk if 2–4 are blocked.

## What NOT to do without asking

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
