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
- **`public/assets/js/config.js` still declares `chatOpen` and
  `chatHistory` as globals** that nothing reads any more — the assistant
  now scopes its own. Harmless, but they are the kind of leftover that
  makes a future reader think the chat state is shared when it is not.
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
