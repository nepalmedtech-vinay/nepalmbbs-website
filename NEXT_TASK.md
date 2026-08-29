# NEXT_TASK.md

_Read this after `CLAUDE.md` (which loads itself) and `PROJECT_STATE.md`.
It is overwritten at the end of every chunk to point at the next one._

## Status as of 2026-08-29 (end of chunk 8)

**Recreate the tag before running anything**, or `npm run verify` dies in
`build-verify` and silently skips six of its eight suites (see
`TECHNICAL_DEBT.md`):

```bash
git tag phase1-static-rollback d48a4c6
```

All eight suites then pass: build-verify 98/98, csp 11/11 (2949 handlers),
console 34/34, auth 12/12, a11y 32/32, compare 13/13, assistant 18/18, and
**audit 43 routes + the assistant with 0 low-contrast and 0 mobile overflow**.

The honest score is **89/100** — `SELF_AUDIT.md`. Do not raise a number there
because a suite went green.

## The site is now champagne on deep slate, and the visitor can change it

The owner picked the palette from three options and then asked for two
corrections: not "complete dark", and theme/colour/style customisable.

- The ground is `#1C232E`, not the `#0A0E13` tried first. At near-black every
  glass pane collapses to the same flat grey because there is nothing for it
  to be lighter *than*.
- **The customiser now has a button in the navbar.** This is the single most
  useful thing in the chunk and it was already built: the theme engine, seven
  presets (four light, two dark, one dimmed), two brand colour pickers, type
  pairing, corner radius, depth, glass and motion sliders, an offline
  colour-theory generator and a live contrast checker have existed since
  Phase 3/4 — but `runtime.js` mounts the panel only when a `#theme-toggle`
  element is present and **no live page had one**. Verified: the panel opens,
  and clicking Dawn switches the ground to `#F4F6FB` live.

So the site is not locked to dark. Anyone can switch it, and the choice
persists per browser.

## The lesson from chunk 8, and it is the same one as chunk 7

**A component that names a token survives a palette inversion untouched. A
component that names a colour has to be found and fixed by hand.**

The inversion broke exactly and only the second kind. `bridge.css` needed
three literal hexes changed and nothing else. `engine.js` did the rest on its
own — detecting dark from luminance, flipping the hairline, re-solving the
whole ink ramp against contrast targets. Meanwhile `sections.css` needed
sixteen blocks rewritten because it pinned `#ffffff` and `#111827`, and two
links in `guidelines.astro` could not be themed at all because their colour
was **inline**.

A second, sharper pattern, which caught three separate tokens: **a colour
solved against the standard pane fails when it lands on a tint of itself.**
`--wa-text` on a 12% green button, the evidence colours on 14% tints of
themselves, the chat restart button on a 12% brand tint — each passed its own
solve and failed the rendered page. Solve against the surface actually
painted, not the nearest convenient approximation.

## 🎯 The next chunk

1. **The remaining content routes' interiors** — `/why-nepal`, `/faq`,
   `/guidelines`, `/videos`, `/life-in-nepal`, `/neet-calculator`,
   `/counseling`. `/faq` and `/neet-calculator` still centre their section
   header over left-aligned content; `/admission-process` had the same
   mismatch and the fix was one class.
2. **Retire `sections.css`.** It is still 104 `!important` declarations
   fighting the token system, and it is now the main reason a theme change
   needs a hand-audit. Sixteen blocks were converted this chunk; the rest is
   a bounded, mechanical, high-value job.
3. **`text-wrap: balance`** is still only partly applied.
4. **The assistant can go further.** It now answers comparisons ("IOM vs
   KMC"), aggregate questions over the college set ("which college has the
   most seats", "how many government colleges", "colleges in Pokhara"), a
   NEET-score question (by restating the rule and refusing to invent a
   cut-off), and one-step follow-ups ("what about its seats?"). Still
   deterministic, still zero running cost, still every answer sourced —
   the owner asked for maximum capability *without any cost*, and an LLM
   would mean an API key, a Netlify Function and a per-message charge.
   `getBotReply()` remains the seam if that ever changes.

Constraints that still hold:

- `npm run csp` after touching any inline `<script>`.
- **Never rebuild while a suite is running.** One audit run was invalidated
  this chunk by exactly that, and `dist/` is what they read.
- Screenshot with `reducedMotion: 'reduce'`, or scroll-driven reveals render
  at opacity 0 and the page looks broken when it is not.
- Focus indicators are **outlines, not box-shadows**. A box-shadow can be
  clobbered by a component's own shadow; an outline cannot. Rebuilding the
  ring as a box-shadow inside a `:where()` removed keyboard focus from the
  nav links entirely, and only `a11y-verify` caught it.
- No new typeface.

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
- ⚠️ **Fixed-header overlap — this was only half fixed, and said otherwise
  for three sessions.** The 69px navbar covered the first element of every
  page at 390px (18–25px); the mobile padding floor was raised and seven
  routes re-measured clear. **Desktop was never measured.** It overlapped by
  9px on all 36 inner routes until chunk 7. See the 2026-08-29 entry in
  `DECISION_LOG.md`. Now clear at 1440, 1024 and 390.
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

## Older backlog (pre-chunk-7, still valid but superseded in priority by the section at the top)

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
