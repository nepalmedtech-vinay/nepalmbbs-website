# SELF_AUDIT.md

The owner asked me to audit my own output against an "excellent" bar and fix
what the audit finds, rather than declare the work done. This file is that
audit, kept honest on purpose: the score is not 95, and the reasons are
specific.

Scored against the master brief's own weighting. Re-score at each milestone;
do not raise a number because the build passes.

_Last scored: 2026-08-29, after chunk 8 (palette inversion, footer and trust
row, the theme customiser exposed, the assistant extended)._

| Category | Weight | Score | Why not higher |
|---|---:|---:|---|
| Visual design | 20 | 18 | Raised to 18 in chunk 8: the whole palette moved to champagne-on-slate, the
footer stopped being a four-column link farm, the trust row became one
credential panel instead of six floating cards, and glass.css's premium
material — a masked lit rim, inner thickness, hover lift — finally reaches
the site's actual components instead of only the home hero. Not higher
because the remaining content routes still have inherited interiors, and
because `sections.css` is still a 104-`!important` override layer even after
sixteen of its blocks were re-pointed at tokens. Chunk 7 had raised this to
17: four pages had their interiors actually designed — the home map now carries a ranked town list instead of anonymous marks, `/documents`' three stage panels read as the sequence they are, `/colleges` pairs its record with its warning, `/admission-process` splits title from body across the row — and the nine-card section nav no longer orphans a card on its own row. Not higher because that is four routes plus the map: `.foot-top` is still a four-column link farm and the trust row still six equal cards, both on **every** page, and seven content routes were not touched. Shadows are still neutral rather than hue-tinted and `text-wrap: balance` is still only partly applied. |
| UX | 15 | 14 | Raised to 14 in chunk 8, for one reason: the theme, colour and type
customiser — seven presets, two colour pickers, type/shape/depth/motion
sliders, a live contrast checker — had existed since Phase 3/4 behind a
`#theme-toggle` element that no live page contained. It is now a button in
the navbar. An owner who could not change their own site's colours without a
code change now can, and so can any visitor who prefers a light page. Chunk
7's note stands too, and one of its reasons is a correction rather than an addition: "every route clears the header" was **false at desktop** on all 36 inner routes — 9px of the first line was under the navbar at every width above 48rem, and this file had been claiming otherwise since the mobile fix. Now measured clear at 1440, 1024 and 390. The home map also answers its own question without a pointer, which is what makes it usable on a phone at all. Not higher because there is still no deadline centre, and the admission journey remains a narrative page rather than a stage-by-stage flow. |
| Motion | 10 | 8 | The Phase 3/4 motion system is genuinely good and honours `prefers-reduced-motion` (verified by the a11y suite, not assumed). Untouched this session. |
| Content | 10 | 10 | The owner supplied the Commission's own MECEE-BL 2026 matrix and all 27 seat figures now come from it — **four were overstated, Institute of Medicine by 4.5× (9 against an actual 2)**. The transcription sums to the document's own stated total of 734, which is the check that it is faithful. Every claim on the site now traces to a named source with a date, fees and deadlines are refused by policy rather than guessed, and the two conflicts this log had been carrying (KMC 43-vs-33, whether PoAHS runs MBBS at all) were both settled by the document. |
| Admissions journey | 10 | 7 | Enquiry → application → counsellor queue → student portal works end to end and is automated. Raised from 6: `/documents` now sets out every required document, which stage it is needed at, and the practical mistake attached to each — with the Commission's requirement and our own guidance visibly separated so our advice cannot borrow their authority. Not higher because there are still no per-stage deadlines (needs the Commission's real dates) and no application status the student drives themselves beyond a read-only portal. |
| Trust | 10 | 10 | Every assistant answer names its source and check date; fees and dates are refused by policy rather than guessed; a freshness audit fails on the calendar with nobody touching the repo. The seat figure on each college page now states which category and which round it is, and that a first-matching allocation is not a standing number — the label is on the page, not only in this file. |
| Accessibility | 10 | 9 | 0 low-contrast across 43 routes **and** the assistant, with 0 elements skipped — and that zero now means something, because fixing the checker's blind spots took it from a false 0 to 87 real failures and back to a measured 0. Chunk 7 also gave **seven routes their first `<h1>`** (`/counseling` opened on an `<h2>`, `/life-in-nepal` on an `<h3>`); all 42 now have exactly one. Held at 9 rather than raised: `a11y-verify` passed 32/32 both before and after, so this is a gap the suite never measured — and the two reasons it is not 10 are unchanged, the audit still cannot see the admin panel's own screens and the enquiry modal was fixed by reading it rather than measuring it. |
| Performance | 5 | 4 | Median page 284 kB, no layout overflow, the knowledge payload is fetched on first chat open rather than shipped to all 43 pages. Not scored higher without a real Core Web Vitals run on production hardware — the sandbox has no GPU and its numbers are not the user's numbers. |
| SEO | 5 | 4 | Unique titles and descriptions, sitemap, structured data, `/privacy` indexed and `/404` correctly not. Not higher because there is no content architecture around the search intents the brief lists — no "MBBS fees Nepal" page, because we decline to publish fees. |
| Engineering | 5 | 4 | The gate is real, and the map's silent `.filter()` is now a build failure that names the college it cannot place — a whole class of invisible data loss closed. Against it, and the reason this did not rise: **`npm run verify` aborts before six of its eight suites in a fresh clone** and says nothing about it (`build-verify.mjs` throws on a missing tag instead of recording a failed check), so the gate's exit code has not meant what a reader assumes for some time. `interiors.css` is also a *second* large override layer alongside `chrome.css`, and two generations of `cbar-*` classes still coexist. |
| **Total** | **100** | **89** | |

**80 is "incomplete" on the brief's own scale**, which is one band up from
where this started ("below 80 = continue redesign"). The remaining gap is
not polish. It is that the site's most load-bearing numbers — seat counts —
are still unverified against the authority that sets them, and that the
student-facing journey stops before deadlines and self-serve status.

## On reaching 100

Content and Trust reached 10 the moment the owner supplied the Commission's
seat matrix — which is exactly how it should have happened. I could find
the document and say precisely why it mattered; I could not read it from
this sandbox. That was never a scoring problem, it was a division of
labour, and it resolved in one message.

What is left, and who it belongs to:

- **Visual 18/20 and UX 14/15 are mine.** Chunk 7 designed the interiors of
  the four pages `NEXT_TASK.md` named and stopped there, honestly rather than
  by running out of steam: the footer, the trust row and seven content routes
  are the same inherited layout they always were, and the footer and trust row
  appear on every page, so they are worth more than any single route. That is
  real work and I can do it.
- **Journey 7/10 needs the Commission's published dates.** A deadline
  centre without them would mean inventing plausible dates, which would
  score well and be the single most harmful thing this project could ship.
  The dates are published per intake; when they exist, the centre is a
  day's work.
- **Performance 4/5 cannot be honestly scored here.** This sandbox has no
  GPU and its Core Web Vitals are not a visitor's. Someone should run
  Lighthouse against the deployed site.
- **SEO 4/5** is capped by a decision, not a gap: the brief's search
  intents include "MBBS fees Nepal", and this site declines to publish
  fees. That is the right call and it costs a point.
- **Engineering 4/5**: `chrome.css` is a large override layer that finishes
  a migration rather than completing it, and two generations of `cbar-*`
  classes still coexist.

Realistically that is 89 → 91 by working, and the last nine points need
either the Commission's calendar, production hardware, or a decision only
the owner can make. I will keep saying which is which rather than quietly
awarding them.

## What would move the number, in order

1. **Transcribe the MEC seat matrix** (Content 8→10, Trust 9→10) — see
   `NEXT_TASK.md`. Everything else is downstream: an assistant answering
   confidently from unverified seat counts is a liability, not a feature.
2. ~~**Document centre**~~ — built (`/documents`). **Deadline centre**
   (Journey 7→9, UX 11→13) still blocked on the Commission's real dates;
   inventing plausible ones would score well and be the most harmful thing
   this project could ship.
3. **Finish the page interiors** (Visual 18→19). Chunk 7 did `/`, `/colleges`,
   `/admission-process` and `/documents`. The footer link farm and the trust
   badge row are next and count twice, because they are on every route.
4. **Extend the audit to modals, the admin panel and the chat** (A11y 9→10).
5. **Make `npm run verify` fail loudly instead of aborting** (Engineering 4→5)
   — see `TECHNICAL_DEBT.md`. A gate that skips six suites without saying so
   is worse than one that fails.
6. **Trust labels on the college pages themselves**, reusing
   the source/checked-date treatment the assistant now uses.

## Standing rule for this file

Do not raise a score because a suite went green. A suite going green means
the things it measures are fine, and this session has now **three times**
found that what it measured was less than what it appeared to measure — most
recently a gate that exited 1 having run two suites of eight, and a
"site-wide" header fix that had only ever been measured at one breakpoint. Raise a score when
the underlying gap is closed, and say which evidence closed it.
