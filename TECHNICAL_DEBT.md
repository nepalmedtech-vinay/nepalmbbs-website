# TECHNICAL_DEBT.md

Known, named debt. Per the master brief: document it here rather than
leaving it as a silent TODO, and give each item a path to being resolved.

## Fixed this session

- ~~`tests/build-verify.mjs`, `tests/auth-verify.mjs`, `tests/regression.mjs`
  hardcoded a previous session's container path instead of resolving it
  relative to the test file.~~ Fixed — see `DECISION_LOG.md`.
- ~~`playwright` was not a declared dependency anywhere in `package.json`,
  only present as a global install in whatever container had last run the
  tests.~~ Fixed — added as a pinned `devDependency`.
- ~~5 of the 5 rollback tags documented in `docs/GOLIVE.md` did not exist
  in the repository.~~ Restored.

## Open — inherited from previous phases, documented by their own authors

These are pre-existing, deliberate, and already written down in
`docs/GOLIVE.md`. Repeated here only so `TECHNICAL_DEBT.md` is a single
place to check, not because they are newly discovered:

- **`style-src` still allows `unsafe-inline`.** 153 inline `style`
  attributes remain across the site. `script-src` is CSP-strict (the
  vector that matters); style injection is a much weaker vector, and
  removing the rest is a large, separate refactor.
- **Student document upload has no UI.** `portal_upload_url()` exists
  server-side; the client to call it does not. Documents currently move by
  WhatsApp/email.
- **Follow-up sequences do not send anything.** They materialize into a
  counselor's task queue at the right time; nothing here sends a WhatsApp
  message or email on the counselor's behalf.
- **`cmc-tracker`'s Supabase project has not been audited.** It is a
  different project (`tgsiltcuisgejmdkovxz`) from the main site's, kept
  deliberately untouched. Its RLS posture is unknown.
- **~91 unreferenced CSS classes** (`docs/DESIGN-SYSTEM.md` §4), largest
  family `cbar-*` (60 classes, an apparently-abandoned contact-bar
  redesign). Left in place because deleting CSS is not provably safe from
  static analysis alone. A per-family deletion with a visual-diff check
  was the plan recorded in Phase 1's own docs; never executed.
- **Three overlapping glass-effect implementations** noted in Phase 1
  (`glass-*`, "PREMIUM GLASS", "GLASSMORPHISM"). Superseded in practice by
  the Phase 3/4 theme engine (`public/assets/theme/`), but not confirmed
  this session whether the older two were actually removed or just
  overridden in the cascade. Worth a direct check before assuming this is
  resolved.

## Newly identified this session — not yet fixed

- **No `CONTENT_SOURCE_LOG.md` existed before this session** (an empty one
  has now been created — see that file). None of the 27 college profiles'
  factual claims (seats, admission route, affiliation, established year)
  carry a source/URL/date-checked record. This is real exposure against
  the brief's §11 zero-fabrication standard: nothing here is *known* to be
  wrong, but nothing is verified against an official source either. This
  should be treated as a dedicated content-research chunk, not something
  to backfill by inference from the existing data.
- **No automated broken-link or 404 audit has been run this session.**
  `tests/audit.mjs` exists and is part of `npm run verify`; its result for
  this run is recorded in `QA_REPORT.md` once available.
- **`legacy/index.html`** (143KB) is kept as a readable historical
  reference per `docs/DEPLOYMENT.md` — intentional, not debt, noted here
  only so a future session doesn't delete it by mistake thinking it's
  dead weight.
