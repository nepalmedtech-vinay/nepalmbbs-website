# TECHNICAL_DEBT.md

Known, named debt. Per the master brief: document it here rather than
leaving it as a silent TODO, and give each item a path to being resolved.

## Newly identified 2026-09-12 (Phase 5E) — one fixed (approved), one flagged only

- ~~**`site_videos` had no `category` column**, despite `/videos.astro`,
  `admin.js` and `colleges.js` all already reading/writing one — every
  per-college video filter had silently matched nothing since before this
  phase.~~ **Fixed, with explicit user approval before touching the
  schema**: `supabase/migrations/0007_site_videos_category.sql` adds a
  nullable `category text` column; applied to the live project. No RLS
  change, no data touched, no new items in `get_advisors` after applying.
  Full account in `CONTENT_ASSET_PLAN.md`'s Slot 6.
- **This repo's local `supabase/migrations/` is missing nine migrations
  that are already applied to the live project.** `mcp__Supabase__list_migrations`
  shows the live history as: security_baseline, admission_platform,
  abuse_and_storage, lead_intake, revoke_internal_function_execute, then
  **eight `exam_intelligence_0X_*` migrations** (tables, RLS, views/grading,
  an exam report, an import path, a dashboard/cohort view, policies,
  storage/templates, a revoke pass), then college_photos_storage. Only the
  first five and the last exist as files in this repo
  (`0001`-`0006`); the eight `exam_intelligence_*` migrations have no local
  file at all. This means the repo and the live database have diverged —
  a fresh clone of this repo, migrated from scratch, would not reproduce
  the live schema. Not investigated further this pass: an entire
  undocumented feature area (something exam/cohort/grading-related, going
  by the migration names) is a large surface to characterise correctly,
  and doing so was not what Phase 5E asked for. Worth a dedicated session:
  pull the live schema for those nine migrations down as local files (or
  at minimum document what `exam_intelligence_*` actually is), so this
  repo stops being a lagging, incomplete record of its own database.

## Newly identified 2026-09-12 (Phase 5D) — not fixed, out of scope

- **One college's `location` string does not match any `places.json` key.**
  `nepalgunj-medical-college`'s `location` is `"Kohalpur, Banke"`;
  `places.json` has coordinates filed under `"Nepalgunj"` instead. This
  college was already silently excluded from `CollegeMap` (the component
  filters to `places[c.location]`); Phase 5D's detail-page map reuse
  inherits the same exclusion rather than introducing a new one, and the
  page handles it correctly (no map section renders for this one college,
  rather than a broken or empty one). Not fixed here since correcting a
  college's recorded location is a content-verification task, not a code
  change, and touching `colleges.json`/`places.json` values without
  re-checking the source is exactly the kind of drift `CONTENT_SOURCE_LOG.md`
  exists to prevent.
- **Reusing `CollegeMap` on 27 detail pages costs a measured, real ~90-150ms
  of Total Blocking Time** under this test harness's 4x CPU throttle
  (isolated via a git-stash before/after comparison, not a single noisy
  reading — see `PROJECT_STATE.md`'s Phase 5D entry and `DECISION_LOG.md`
  for the full numbers). This is a disclosed cost of the phase's own "map
  continuity" requirement, not a bug: the map is real, sourced,
  content-bearing evidence, not decoration. The college detail route's
  absolute TBT (~500-545ms via the project's own `tests/perf-verify.mjs`)
  is, at the time of this measurement, still lower than `/colleges`'
  own TBT (~975-980ms) — a route this phase did not touch — so it is not
  an outlier against the rest of the site's current, already-over-budget
  state in this sandbox. Worth a real fix (e.g. lazy-mounting the map's
  interaction script until the figure is closer to the viewport, beyond
  the existing IntersectionObserver-gated *draw*) in a future pass focused
  on performance specifically, rather than folded into a product-narrative
  phase.

## Newly identified 2026-09-11 (Phase 5B) — not fixed, out of scope

- **`AdminPanel.astro`'s "Hero Lead Form" toggle (`#sw-form`) targets an
  element that no longer exists.** It calls
  `toggleFeature('@el','show_lead_form','hform-area')`, but `hform-area`
  (and `#h-name`/`#hform-success`, the rest of that inline form) isn't in
  `GlassHero.astro` — confirmed by a repo-wide search, the only other hit
  is this same admin toggle. The homepage hero was rewritten in Phase 3
  to two CTA links instead of an inline form; this admin control was
  never removed to match. Flipping the switch today does nothing
  observable. Not fixed here since it's unrelated to Phase 5B and touches
  the admin panel, not the public site — a future session doing admin-
  panel work should either remove the toggle or restore what it controls.

## Fixed this session

- ~~`tests/build-verify.mjs`, `tests/auth-verify.mjs`, `tests/regression.mjs`
  hardcoded a previous session's container path instead of resolving it
  relative to the test file.~~ Fixed — see `DECISION_LOG.md`.
- ~~`playwright` was not a declared dependency anywhere in `package.json`,
  only present as a global install in whatever container had last run the
  tests.~~ Fixed — added as a pinned `devDependency`.
- ~~5 of the 5 rollback tags documented in `docs/GOLIVE.md` did not exist
  in the repository.~~ Restored.
- ~~`boot.js`'s hero step called two functions that don't exist anywhere
  in the codebase, throwing silently on every page load site-wide.~~
  Confirmed `Hero.astro` (which they belonged to) is itself dead —
  imported nowhere, replaced by `GlassHero.astro` — so deleted both the
  component and the dead `step('hero', ...)` call together. Full verify
  suite re-run after the change; see `QA_REPORT.md`.

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

## The dark→light migration was never audited component by component

Three components have now been found keeping their **dark-build background**
while `bridge.css` had already flipped their **text** to dark ink, leaving
dark on dark:

1. `.cbar` — the contact bar (`#0b1e3d` navy). Phone numbers invisible.
2. `.ticker` — the marquee (`#1e40af` blue). Dark text on saturated blue.
3. `.chat-header` — the assistant (`var(--blue-dark)` = `#1e40af` at one end
   of its gradient). Title 2.39:1, subtitle 1.03:1.

All three are gradients, and the contrast checker was silently skipping
gradients — so the migration was done by eye, and the one tool that could
have caught the misses was blind to exactly the components that had them.
Two separate failures that turned out to be the same failure.

**The remaining risk**: there may be a fourth. A grep for hard-coded dark
literals still in background position would settle it in minutes and is
worth doing before the next deploy:

```
grep -rnE "background[^;]*#(0[a-f0-9]|1[0-9a-f]|2[0-9a-f])" \
  public/assets/css/*.css public/assets/theme/*.css
```

Anything that matches and is not inside a `[data-theme="dark"]` block is a
candidate for the same fault.

## Newly identified this session (chunk 6 — the assistant)

- ~~**`tests/audit.mjs` only ever measured a page's default state.**~~
  **Partly fixed.** It now reveals `display:none` success and error
  containers and measures those too, reported with a `[revealed]` prefix.
  Found by exactly the failure it was blind to: `/counseling`'s enquiry
  confirmation — the screen every enquiry ends on — carried
  `rgba(255,255,255,.6)` from the dark build and was white on white, while
  the suite reported the page clean.
  **Still not covered**: open modals, the admin panel's own screens, the
  chat window's answers, and any state reachable only by driving a real
  form submission. Revealing a container by hand is blunt; driving each
  form to a genuine success needs a backend per page.
- ~~**`public/assets/js/config.js` still declares `chatOpen` and
  `chatHistory` as globals**~~ **Fixed.** Removed after confirming nothing
  outside `chatbot.js` ever referenced them.
- **Admin panel toasts are written in a different register from the
  site**: `toast('✅ Saved to Supabase — live on all devices!')` and about
  fifteen siblings. Staff-facing rather than public, so lower priority
  than the public copy fixed in this chunk, but the owner asked for one
  professional tone across the whole product and these are not it.

## Newly identified this session (chunk 5 — premium pass)

- **The dark→light migration is still unfinished in the legacy CSS, and
  `chrome.css` only covers what has been *found*.** Three components have
  now turned up with hard-coded dark backgrounds that Phase 3/4's
  `bridge.css` never flipped, each discovered only by looking at a
  rendered screenshot: `.ticker`, `.cbar`, and `.counsel-bg`. Nothing
  guarantees those are the last three. A systematic sweep would be:
  grep `public/assets/css/` for hex literals darker than roughly #333 used
  as a `background`, and check each against the light-theme ink colours
  `bridge.css` now forces. Cheaper than finding them one screenshot at a
  time, which is how all three of these were found.
- **41 CSS rules request `'Sora'` and 5 request `Inter`; neither font is
  loaded.** Now redirected to the design tokens in `chrome.css`, but the
  underlying rules in `base.css`/`sections.css` still name fonts that do
  not exist. They should be rewritten to use `var(--ty-display)` /
  `var(--ty-body)` directly so the override layer can eventually be
  deleted rather than grown.

- ~~**`tests/audit.mjs`'s contrast pass silently skips any element over a
  gradient.**~~ **Fixed.** It now parses gradient colour stops and uses the
  darkest opaque one as the worst case, and prints the skip count on every
  run so a zero can be trusted. Skipped elements went 624 → 0, and the
  working checker immediately found 11 genuine low-contrast elements that
  had been invisible to it — see `QA_REPORT.md` for the table. All fixed.
  Remaining known limitation: real `url()` backgrounds still return null
  (genuinely unresolvable without sampling a rendered pixel), and elements
  using `background-clip: text` are excluded by design.
- **`docs/DESIGN-SYSTEM.md` §4 is wrong about `cbar-*`.** It records the
  family as "60 classes, almost entirely unreferenced… an entire
  contact-bar redesign that was styled and never wired up". In fact
  `ContactBar.astro` renders a *different, later* set of class names
  (`cbar-inner`, `cbar-block`, `cbar-number`, `cbar-btn`…) than the ones
  base.css styles (`cbar-in`, `cbar-contact-block`, `cbar-num-txt`,
  `cbar-icon-btn`…). Both generations are in the tree; the markup uses one
  and most of the CSS describes the other. The dead half should be deleted
  per-family with a visual diff, as Phase 1 originally planned.

## Newly identified this session (Phase 4 — college photos) — not yet fixed

- **The admin panel's "🏥 Colleges" tab writes to a `site_colleges`
  Supabase table that has never existed on the live project.** `admin.js`'s
  own error strings say so ("Ensure site_colleges table exists in
  Supabase"), and nothing on the public site reads from it —
  `src/data/colleges.json` (27 records, build-time) is what every college
  page and the `/colleges` listing actually render from. Found while
  building the college-photo upload feature (this session), which was
  deliberately kept independent of this broken table rather than built on
  top of it — see `PageHeader`/`college-photo.js` additions and
  `supabase/migrations/0006`. Fixing or removing the `site_colleges` UI is
  a separate task from what was asked here.

## Newly identified this session (chunk 3 — content sourcing) — not yet fixed

- **`WebFetch` is blocked by this sandbox's network egress policy for
  every domain tried** (tested: `kathmandupost.com`, `asianews.network`,
  `mec.gov.np`, `en.wikipedia.org` — all refused with `EGRESS_BLOCKED`).
  `WebSearch` still works. This means content verification in this
  environment is limited to search-snippet-level evidence, not full
  primary-source reads. See `CONTENT_SOURCE_LOG.md` for what that limits.
  A future session should check whether this is fixable (network policy
  setting) or is a fixed constraint of this sandbox kind.
- **Possible real accuracy problem, not just missing sourcing**: Pokhara
  Academy of Health Sciences may not have a running MBBS program despite
  being listed as one of the 27 admitting colleges — see the 🔴 flag at
  the top of `NEXT_TASK.md` and the detail in `CONTENT_SOURCE_LOG.md`.
  This is higher priority than routine debt cleanup.
- Patan Academy of Health Sciences' `established` year on the site (2010)
  conflicts with multiple independent sources (2008). See
  `CONTENT_SOURCE_LOG.md`.

## Newly identified this session (chunk 1) — not yet fixed

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
