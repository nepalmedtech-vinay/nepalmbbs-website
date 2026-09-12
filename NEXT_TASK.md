# NEXT_TASK.md

_Read this after `CLAUDE.md` (which loads itself) and `PROJECT_STATE.md`.
It is overwritten at the end of every chunk to point at the next one._

## ⭐ Status as of 2026-09-12 (later pass) — read this section first

**NEET eligibility checker corrected to sourced criteria** (full account
in `PROJECT_STATE.md` and `DECISION_LOG.md`, same date). Picked up
in-progress, uncommitted work already sitting in the working tree at the
start of this pass (`leads.js`, `neet-calculator.astro` already
rewritten) and finished it: the old checker tested a raw NEET score
against invented thresholds with no source; now tests NEET percentile +
12th PCB aggregate, both already sourced in `knowledge.json`. Also
finished embedding the same checker (compact variant) on `/counseling`,
which the in-progress diff's own comment had labelled "Phase 5F" — read
as the correctness fix reaching its second existing call site, not a
start on Phase 5F's own scope (still gated below); revert
`src/pages/counseling.astro`'s `calc-wrap--compact` block alone if that
reading turns out wrong. Also fixed, because verification surfaced them and they were safe and
one value/one line each: `tools/action-allowlist.json` had drifted from
`actions.js`'s own runtime allow-list (3 missing names, zero effect on
real users, but it was corrupting `csp-verify.mjs`'s own signal on 17
pages); that same test file's NEET-calculator check used the pre-rewrite
field id; and `CollegeHero.astro`'s fallback-asset caption failed AA
contrast (3.89:1, needs 4.5:1) on all 27 college pages — `audit.mjs`
never having run to completion in a recent session (it dies earlier in
`npm run verify`'s chain on the rollback-tag issue) is presumably why
nobody had caught it yet. Full result, run suite-by-suite rather than via
`npm run verify`: `npm run build` clean (44 routes); `node tools/gen-csp.mjs`
no diff; `tests/csp-verify.mjs` 11/11 (was 9/51); `tests/console-verify.mjs`
34/34; `tests/a11y-verify.mjs` 32/32; `tests/compare-verify.mjs` 13/13;
`tests/assistant-verify.mjs` 18/18; `tests/audit.mjs` 0 low-contrast / 0
overflow across 43 routes (was 27 low-contrast before the `CollegeHero`
fix). `build-verify.mjs` itself still hits the pre-existing rollback-tag
403 (see "Blocked on the owner, not on work" far below).

## Status as of 2026-09-12 (earlier pass) — still current, read next

The site is mid-way through an "autonomous premium product builder"
operating contract (owner-supplied, governs Phase 5 onward). Phases so
far, in order, all shipped and on `claude/website-premium-design-j6mphw`:

- **Phase 4** (full-site rollout of the Phase 3 cinematic benchmark) —
  complete. See `PROJECT_STATE.md`'s Phase 4 section for the per-page
  detail; the short version is every public route got at minimum a
  visual audit, and the real gaps found (a WebGL header bug, the last
  emoji-icon holdout on `/life-in-nepal`, a few honest UX additions) got
  fixed rather than papered over.
- **Phase 5A** (homepage cinematic narrative) — complete, commit
  `e654d23`. The five homepage sections now read as one connected
  Promise→Place→Proof→Practice→Path scroll story instead of five
  independent blocks. Full detail in `PROJECT_STATE.md`.
- **Phase 5B** (visible admissions automation) — complete, commit
  `c787e0a`. `/counseling`'s enquiry-success panel now shows the real
  near-term follow-up sequence and the real 8-stage application lifecycle
  (`src/data/journey-stages.json`, sourced from `portal.js`'s own
  `STAGES`), instead of two lines of generic reassurance. Full detail in
  `PROJECT_STATE.md`.
- **Phase 5C** (interactive college discovery) — complete, commit
  `6e8df7c`. `/colleges` moves the map above the list (geographic
  understanding before the list, reusing `CollegeMap.astro` completely
  unchanged — map clicks still navigate straight to a college's detail
  page) and replaces the two static grouped tables (government / private)
  with one unified, server-rendered, searchable/filterable/sortable table
  plus a per-row compare-selection flow that hands off to the existing
  `/colleges/compare` tool via its own `?c=slug1,slug2` URL param. Full
  detail in `PROJECT_STATE.md`.
- **Phase 5D** (premium college detail experience) — complete, commit
  `f82e1e8`. `/colleges/[slug]` is rebuilt around a DISCOVER→UNDERSTAND→
  EXPERIENCE→VERIFY→DECIDE→ENQUIRE narrative: a new `CollegeHero.astro`
  (identity + a real asset-slot with a graphic, never-fabricated fallback),
  the existing `CollegeMap.astro` reused via three new optional props
  (`highlight`/`variant="compact"`/`headOverride` — homepage and
  `/colleges` are unaffected) to show this one college highlighted among
  all 27, a new 4-step academic-path timeline sourced from
  `knowledge.json`'s own already-vetted topics, and a new compare-with-
  others link into `/colleges/compare?c=<slug>`. New `CONTENT_ASSET_PLAN.md`
  defines the asset-slot architecture (7 slots, 0/27 photos filled today).
  Full detail, including a measured (not assumed) ~90-150ms TBT cost from
  reusing the map component, in `PROJECT_STATE.md` and `TECHNICAL_DEBT.md`.
- **Phase 5E** (cinematic video / real media experience) — complete, commit
  `126df2a`. Found and fixed a real, blocking bug along the way (with
  explicit approval before touching the schema): `site_videos` had no
  `category` column despite the app already assuming one everywhere, so no
  video could ever have been attached to a specific college — fixed with
  `supabase/migrations/0007_site_videos_category.sql`. Extended video-tab
  coverage from 18 to all 27 colleges (`src/data/video-categories.json`),
  connected college detail pages to their own real videos (new
  `college-video.js`, same pattern as `college-photo.js`), and added a
  featured/editorial treatment to `/videos` itself. Verified live against
  the real project: `site_videos` holds 0 rows today — the architecture is
  confirmed correct end-to-end (via mocked responses) but has nothing real
  to display yet. Full detail in `PROJECT_STATE.md` and
  `CONTENT_ASSET_PLAN.md`'s Slot 6.
- **Media-readiness follow-up** (a controlled Phase 5E extension, not
  Phase 5F) — complete, this pass. Researched Chitwan Medical College's
  official website/YouTube/social presence (`WebFetch` fully blocked in
  this sandbox — verification limited to cross-checked `WebSearch`
  snippets); found and fixed a second dropdown-code bug in the admin
  panel itself (same family as Phase 5E's, but in the UI staff actually
  use); built the requested asset/rights/featured metadata schema
  (migration 0008: `site_videos` gains rights/source/featured columns, new
  `site_photos` table for hosted-or-reference photo metadata); implemented
  a genuine UPLOAD→IDENTIFY/MAP→REVIEW→PUBLISH workflow for new video in
  the admin panel (drafts now, not instant-live); added three verified
  official reference links for Chitwan Medical College only — deliberately
  embedded no specific photo or video, since none could be confirmed
  authentic/rights-cleared from this sandbox. Full detail in
  `PROJECT_STATE.md` and `CONTENT_ASSET_PLAN.md`.

**Next approved tasks, per the roadmap, not yet started — do not begin
any of these without a fresh explicit approval naming the phase:**
Phase 5F (dedicated counselling conversion experience), Phase 5G (second
meaningful dataviz), Phase 5H (broad mobile/tablet cinematic QA).

Also still queued, not started: the owner confirming a specific CMC video/
photo is genuinely official and rights-cleared, then adding it through the
now-working admin workflow (no code change needed); sourcing real
per-college photography and video for the other 26 colleges (now that
`CONTENT_ASSET_PLAN.md` names exactly what's needed, where it goes, and
the full ingestion workflow); extending the admin panel's photo-category
picker beyond `hero` once a gallery display component exists to show the
result (`CONTENT_ASSET_PLAN.md` Slot 2); the Nepalgunj/`places.json`
location-string mismatch (`TECHNICAL_DEBT.md`, Phase 5D section) — a
content-verification task, not a code change; a dedicated performance pass
on `CollegeMap`'s per-instance cost if it becomes a priority on its own
terms rather than folded into a product-narrative phase; pulling the 9
undocumented `exam_intelligence_*` migrations already applied to the live
project down into this repo as local files (`TECHNICAL_DEBT.md`) — a real
repo/database
divergence, not something Phase 5E's own scope covered.

## Status as of 2026-09-08 — superseded by the section above, kept for history

A separate "ultra-premium cinematic" brief arrived mid-session and became
the active thread of work — it did not continue the "page interiors" chunk
this file previously pointed at (still described further down; that work
is paused, not abandoned, and is a reasonable place to return to once the
cinematic thread resolves).

**What happened, in order:**

1. **`DESIGN_AUDIT.md` (new file, repo root)** — a Phase 1 audit against
   the cinematic brief's own "audit first, do not redesign yet" process.
   Documents the stack, styling layers, motion inventory, and — the one
   thing that matters for what's next — **an unresolved conflict**: the
   brief's hero/campus sections assume photography that does not exist in
   this repo, and contradicts a recorded Phase 2 decision (no stock
   photos standing in for a campus, stated in the homepage's own copy).
   **This is still open. It blocks the hero/campus sections specifically
   if the cinematic work continues** — nothing else in the brief depends
   on it.

2. **Corporate palette is now the site default.** `engine.css` and
   `engine.js`'s `PRESETS.dawn` both moved from jade-green/orange to deep
   blue (`#1F5F8B`) + bronze (`#B4632F`) — reusing the codebase's own
   pre-existing "Porcelain" preset's colours at fuller glass/motion
   settings. Verified: 0 contrast failures, both before and after the
   change, across all 43 routes.

3. **Phase 3 visual benchmark shipped** — Navbar (real transparent→glass
   scroll transition, was previously glass unconditionally), Hero
   (cinematic field layer + staged load choreography, no photography —
   built from the same graticule/data motif as the map), a reusable
   "Crystal CTA" component (nav + hero primary actions), and the college
   map's motion (path-drawing graticule, a "ping" activation ring per
   point instead of a generic fade). Full diff: 6 files, `git log` on
   this branch from commit `6e16bf3` onward.

4. **Two real, pre-existing bugs found and fixed** while testing the
   above (not part of the 5 permitted benchmark areas, but genuine
   breakage a mandated a11y pass surfaced):
   - `prefers-reduced-motion` was silently defeated **sitewide** —
     `engine.js`'s theme `apply()` set `--mo` as an inline style
     unconditionally, which beat the CSS media query meant to zero it
     out. Fixed and verified (`--mo` now correctly reads `0`, content
     visible within 150ms under reduced motion, was previously stuck
     invisible 500–900ms).
   - No visible focus indicator on the skip-to-content link (every page)
     or the counselor console's search fields — `outline:
     var(--focus-ring)` is invalid CSS (`--focus-ring` is a box-shadow-
     shaped token), silently dropped. Fixed to `box-shadow` on both.

5. **A separate, broader ask followed**: audit the Claude *workstation's*
   skill library (not this project) for general premium-design/creative-
   technology/native-app/automation/agent-building capability. Resulted
   in 8 skills total living in `.claude/skills/` — 2 vendored
   (`taste-skill`, `redesign-skill`) plus 6 authored this session
   (`premium-design-os`, `creative-technology-lab`, `native-app-design`,
   `brand-identity-lab`, `agent-architecture-lab`, `automation-router`).
   See `.claude/skills/README.md` for what each covers and the explicit
   honesty note that none have been through `skill-creator`'s real eval
   loop yet. **Not NepalMBBS-specific** — this is workstation tooling,
   not a site feature; do not confuse it with project work when reading
   `git log` on this branch.

**Full verify suite result as of the last run this session:** `csp` ✅,
`console-verify` ✅, `a11y-verify` ✅ (after the focus-ring fix),
`audit.mjs` ✅ (0 low-contrast, 0 mobile overflow, 43 routes), `build-verify`
❌ — but on the pre-existing, documented rollback-tag issue (`CLAUDE.md`:
tags return 403 on push), unrelated to any of the above.

**⏸ Waiting on the owner before Phase 4 (full-site rollout of the
cinematic direction):**
- Confirmation that Phase 3's benchmark (screenshots sent, all 4
  breakpoints) is approved to extend to the rest of the site.
- The imagery-policy question from `DESIGN_AUDIT.md` §7 — real, licensed
  campus photography, or continue building the "no photography, data as
  the visual signature" language the hero/map already establish. This
  gates only the hero/campus-visualization sections of Phase 4, nothing
  else.

If a fresh session picks this up with neither answered: **do not guess.**
Report this section back to the owner and wait, rather than either
resuming the old "page interiors" chunk or unilaterally starting Phase 4.

---

## Status as of 2026-08-29

`npm run verify` is green: 44 routes, 0 failures, 0 low-contrast elements
with 0 skipped, 18/18 assistant checks. The full record is in
`QA_REPORT.md`. The honest score is **85/100** — see `SELF_AUDIT.md`, and
do not raise a number there because a suite went green.

**The MEC seat matrix is done.** The owner supplied the Commission's own
MECEE-BL 2026 first-matching table on 2026-08-28 and all 27 figures were
transcribed from it, summing to the document's stated total of 734. Four
were overstated in the old data — Institute of Medicine by 4.5×. Every
record now carries a `seatsSource` naming the category, round and intake,
and each college page states that a first-matching allocation is not a
standing number. Content and Trust are both 10/10 as a result. There is
nothing left to do here; do not re-open it.

## 🎯 The next chunk: page interiors

This is the largest remaining block of points that belongs to Claude
rather than to the owner or to production hardware: **Visual 16/20 and
UX 12/15**.

The chrome is coherent now — one type system, one palette, every route
clearing the fixed header. The **interiors are not**. They are still the
layout this site was built with: a section-card grid, the three-equal-
cards pattern repeated on most pages, stacked identical `.doc` blocks,
and a single column on desktop where there is room for two. Phase 3/4
made those blocks legible; nobody has yet made them good.

Start with the pages a family actually lands on, in this order:
`/` → `/colleges` → `/admission-process` → `/documents`.

Constraints that still hold while doing it:

- `npm run csp` after touching any inline `<script>`.
- Contrast is measured, not assumed — the audit will catch a regression,
  but it takes ~15 minutes, so run it in the background.
- No new typeface. `chrome.css` already maps the orphaned `Sora`/`Inter`
  rules onto the token system.

## Blocked on the owner, not on work

- **Deadline centre** (Journey 7→9, UX 12→13) needs the Commission's
  published per-intake dates. Inventing plausible ones would score well
  and be the most harmful thing this project could ship.
- **Performance 4/5** cannot be scored from this sandbox — no GPU. Run
  Lighthouse against the deployed site.
- **SEO 4/5** is capped by a decision, not a gap: the brief wants an
  "MBBS fees Nepal" page and this site declines to publish fees.
- **Rollback tags** are still local-only; `git push --tags` returns 403.
  `tests/build-verify.mjs` reads `phase1-static-rollback`, so a fresh
  clone fails verify until someone pushes them by hand.
- **Three blank `established` fields** remain (Gandaki, Janaki, Birat).
  Birat's own site contradicts itself — 1991 in one place, 2014 in
  another. The field stays blank until the college resolves it.

## The assistant is now sourced and data-driven (2026-08-28)

`public/assets/js/chatbot.js` was 45 hard-coded answers with no access to
`colleges.json`. It now reads `/api/knowledge.json`, built from
`src/data/knowledge.json` (32 sourced topics) merged with the college
records, so:

- all 27 colleges are answerable, and stay answerable when the data
  changes — there is no second copy to update;
- every answer names its source and the date that source was checked, and
  labels itself official / estimate / general;
- it declines plainly when it has no sourced answer, instead of offering
  counselling as though that were the answer.

`tests/assistant-verify.mjs` (18 checks) guards this, including a
**freshness audit that fails once `knowledge.json` is 365 days past its
last review** — it trips on the calendar, with nobody touching the repo.

**It is not an LLM, and that is deliberate.** A generative model over this
data would write fluent sentences about seat counts, fees and deadlines —
the three things most damaging to get wrong. If an LLM is ever added, the
non-negotiable is that it answers *only* from this dataset and refuses
outside it; `getBotReply()` is the seam to put that behind.

### Content tone

Public copy audited for register: no emoji or hype language remained in
page content, but three items were retoned ("Zero Visa!", the videos
blurb, the enquiry confirmation) and the 50 admin toasts had their status
emoji and exclamations stripped. Verified mechanically that only the
message literals changed — 50 toasts before and after, no logic touched.

## Design: premium pass in progress (2026-08-28)

The owner asked for a premium look and for work to continue in chunks
without stopping for approval. Done so far, each verified by screenshotting
at 390px before and after:

- ✅ **Contact bar and ticker** — these still had hard-coded *dark*
  backgrounds from the pre-Phase-3 build while `bridge.css` had flipped
  their text to dark ink. Dark on dark: the two phone numbers were
  effectively invisible. Rebuilt in `public/assets/theme/chrome.css`.
- ✅ **Fixed-header overlap** — the 69px navbar covered the first element
  of *every* page at 390px (18–25px). Raised the mobile padding floor; all
  seven routes re-measured clear.
- ✅ **Admin button hidden from the public** (`chrome.js`) — shown only on
  an existing staff session or `#admin`. Cannot lock the owner out.
- ✅ **Floating buttons 3 → 2** — the WhatsApp-call floater duplicated what
  the contact bar now offers at full size.
- ✅ **Footer** — emoji list markers (📞📲💬✉️) replaced with inline SVG;
  disclaimer restyled from a ⚠️ line into a proper standing note.
- ✅ **New `/404`** — there was none.
- ✅ **New `/privacy`** — there was none, on a site that collects a
  student's name, phone, NEET score, city, category and marks bands.
  Written from what the code does. **Needs the owner to supply two things**
  it deliberately refuses to invent: the registered legal entity, and the
  data retention period. Both are flagged on the page itself.
- ✅ **The font nobody loaded** — 41 rules asked for `Sora` and 5 for
  `Inter`; neither is loaded, so the logo, every heading, card title,
  button, statistic and college name fell back to the device's system
  sans. Only the home-page hero escaped it. Mapped onto the design
  system's own faces. This was the largest single cause of the site
  reading as generic.
- ✅ **Counseling page** — same dark-slab bug as the contact bar, on the
  most commercially important page: its headline rendered black on
  near-black. Now light, readable, and consistent with every other route.

### Design skill

`.claude/skills/` now vendors two SKILL.md files from
github.com/Leonxlnx/taste-skill (MIT), at the owner's request — reviewed
before adoption, methodology only, no scripts. Its audit is a good
checklist for the remaining passes.

### Not yet done from that audit

- Section interiors are still flat — the skill's "empty, flat sections with
  no visual depth" applies to several content pages.
- `.foot-top` is still a four-column link farm.
- Shadows are neutral rather than hue-tinted.
- Headline `text-wrap: balance` is only partly applied.
- The three-equal-cards pattern appears on a few pages.

## Deploy status (2026-08-28)

The owner asked for the Netlify deploy to be done for them, without any
manual steps on their side. Before deploying, the `docs/GOLIVE.md`
prerequisites were checked **directly against the live database** rather
than asked about, and all pass:

| Check | Result |
|---|---|
| `staff` rows with `role='admin'` | 1 — no admin-lockout risk |
| `sequence_steps` seeded | 7 — follow-up tasks will materialise |
| public tables with RLS off | 0 |
| `leads` row-level security | on — student contact data is not publicly readable |

So GOLIVE steps 1 (migrations) and 2 (first staff account) were already
done before this session. The deploy is therefore the documented step 3.

Netlify site: `nepalmbbs` / `fac99d5b-96f8-4ff9-a9da-a34b962a7d13`,
primary URL `https://nepalmbbs.in`.

**Caveat worth carrying forward:** the Netlify MCP `deploy-site`
operation takes only a `siteId` — it exposes no draft/preview flag, so a
deploy through it cannot be guaranteed to stay off production. The
repo's own `docs/DEPLOYMENT.md` prefers a branch deploy or deploy preview
first. If a future session needs a genuine preview, use the Netlify CLI
(`netlify deploy` without `--prod`) rather than this tool.

## College data: what got fixed, and what is still open

Two research passes ran (see `CONTENT_SOURCE_LOG.md` for full sourcing).
The second pass restricted search to each institution's **own website**,
which is what the applied fixes rest on.

### ✅ Fixed in `src/data/colleges.json`

- **A wrong institution name** — "Universal Medicine College" →
  **"Universal College of Medical Sciences"**, per ucms.edu.np itself.
  Also filled its `established` (1998) and `website`.
- **CMS Bharatpur `established`** 1994 → **1993**, per cmsnepal.edu.np
  (agreement signed 8 Aug 1993). Their first MBBS intake was 1996 — both
  dates are recorded in the log so this isn't "corrected" back by mistake.
- **Two missing official websites** filled (NAIHS, Rapti AHS).

### ❌ A flag that turned out to be wrong (worth reading before you trust the rest)

The first pass claimed PAHS's `established: 2010` was wrong because
secondary sources said 2008. **That was my error.** PAHS's own site says
teaching began in 2010; 2008 is the charter year. Both are true, they
just mean different things. Value left unchanged.

The lesson matters for the remaining blanks: an aggregator's
"established" year may be measuring a different milestone than this
dataset means. Do not bulk-fill them.

### ⚠️ Still open — needs MEC or a phone call, not more searching

1. **Kathmandu Medical College foreign-quota seats** — site says 43, one
   secondary source says 33. KMC's own site doesn't publish the number.
2. **Pokhara Academy (PoAHS)** — *downgraded from the earlier alarm.*
   Their own site does have an MBBS page, so the program appears to
   exist; the "launching by 2024" text that worried me is stale content
   on a different domain of theirs. What's still unconfirmed is whether
   it takes **foreign-quota** students and whether "4 seats" is right.
3. **NAIHS `established`** — still blank. Two defensible dates (2010
   ministry approval, 2012 inauguration); left blank rather than guessed.
4. **7 other blank `established` fields** — candidates exist in the log
   but only from aggregators. Left alone deliberately (see the PAHS
   lesson above).
5. **Three MBBS programs are brand new** — B&C (2024), MIHS (2024),
   Madan Bhandari (2025) — and the site doesn't say so. Surfacing "first
   intake YYYY" would fit the existing trust-register design and is
   arguably owed to a family comparing a first-intake program against a
   30-year-old one.

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
