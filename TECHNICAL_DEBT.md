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
  in the repository.~~ Restored — **locally only, and that is not enough.**
  See "The rollback tags still break verify on a fresh clone" below; this
  line read as closed for three sessions while the problem was live.
- ~~`boot.js`'s hero step called two functions that don't exist anywhere
  in the codebase, throwing silently on every page load site-wide.~~
  Confirmed `Hero.astro` (which they belonged to) is itself dead —
  imported nowhere, replaced by `GlassHero.astro` — so deleted both the
  component and the dead `step('hero', ...)` call together. Full verify
  suite re-run after the change; see `QA_REPORT.md`.

## Open — found 2026-08-29 (chunk 8)

- **`sections.css` is still the main obstacle to any theme change.** 298
  lines, **104 `!important`**, and it was written across two eras so it
  contradicts itself: some rules assume a dark page, some a light one.
  Sixteen blocks were re-pointed at tokens this chunk (that is what made the
  palette inversion possible at all), but the sheet as a whole still fights
  the token system. Retiring it is bounded, mechanical and high value.

- **Colours in inline `style` attributes cannot be themed.** Two links in
  `guidelines.astro` carried `style="color:#92400e"` and were unreachable
  from any stylesheet. Both are fixed; nobody has swept the other pages for
  the same pattern. `style-src` still allows `unsafe-inline` (see below), so
  nothing prevents a new one.

- **The three-equal-cards / inherited-interior problem remains on seven
  content routes.** `/why-nepal`, `/faq`, `/guidelines`, `/videos`,
  `/life-in-nepal`, `/neet-calculator`, `/counseling`.

- **Median page weight rose 279 kB → 314 kB** with the dark palette — the
  aurora carries more work on a dark ground (higher opacity, larger blobs)
  plus one more stylesheet. Not diagnosable from this sandbox (no GPU); worth
  a Lighthouse run against a deploy.

## Open — found 2026-08-29 (chunk 7)

- **The rollback tags still break `npm run verify` on a fresh clone.** This
  container has **zero tags**, locally and on the remote
  (`git ls-remote --tags origin` returns nothing). `tests/build-verify.mjs`
  line 188 runs `git show phase1-static-rollback:<tracker files>` to prove the
  legacy tracker apps are byte-identical, and dies with `fatal: invalid object
  name` — **which aborts `npm run verify` before six of its eight suites
  run**. It is not a soft failure; everything after `build-verify` is simply
  skipped, so a session that reads only the exit code learns nothing about
  a11y, contrast, CSP or the assistant.

  It is environmental, not a code defect: `git push --tags` returns 403 for
  this token (`CLAUDE.md` records this). But the practical effect is that the
  project's main gate has not run end-to-end in any fresh container.

  **The commit it should point at has been identified: `d48a4c6`** ("docs:
  record the design system and the debt Phase 3 inherits") — the last commit
  of the single-page era, immediately before `61dd892` ("feat: multi-page
  Astro architecture"), which is the commit that moved the trackers from the
  repo root into `public/`. That matches both `docs/GOLIVE.md`'s description
  of the tag ("the single-page build") and `build-verify.mjs`'s own comment
  ("the pre-Phase-2 commit").

  Confirmed rather than assumed: all seven tracker files hash identically
  between `d48a4c6`, `public/` and `dist/` today, and with the tag recreated
  at that commit `build-verify.mjs` passes **98/98**, tracker check included.

  So any session that hits this can unblock itself in one command:

  ```bash
  git tag phase1-static-rollback d48a4c6
  ```

  It was deliberately **not pushed** from this session. The byte match proves
  the tracker contents are right; it does not prove `d48a4c6` is the same
  object the original tag pointed at, and publishing a permanent ref under a
  name whose original target cannot be checked is not this session's call.
  The owner should push their own five tags.

  **Still worth fixing in the test:** `build-verify.mjs` line 188 throws
  rather than recording a failed check, so a missing tag aborts the process
  and takes the six later suites in `npm run verify` down with it —
  silently, because the chain is `&&`. Catching the missing-tag case and
  recording it as a failed check would cost one check instead of six suites,
  and would make `npm run verify`'s exit code mean what a reader assumes it
  means.

- **`.foot-top` is still a four-column link farm**, and the trust badge row
  is still six equal cards. Both were on the interiors list for this chunk
  and neither was reached; the four named pages took the whole budget.

- **Section headers are centred on `/faq` and `/neet-calculator`** over
  left-aligned content. `/admission-process` had the same mismatch and was
  fixed this chunk; those two were left because they are outside the four
  pages it named. It is a one-class change (`tc`) per page.

- **`/life-in-nepal` uses an Unsplash stock photograph** of Kathmandu as its
  hero. The home page's own copy says "no stock photographs standing in for a
  campus" — this is a city, not a campus, so it is arguably within the letter
  of that promise, but it is close enough to the line that someone should
  decide deliberately rather than inherit it.

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
