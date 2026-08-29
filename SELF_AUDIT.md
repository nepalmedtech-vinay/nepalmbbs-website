# SELF_AUDIT.md

The owner asked me to audit my own output against an "excellent" bar and fix
what the audit finds, rather than declare the work done. This file is that
audit, kept honest on purpose: the score is not 95, and the reasons are
specific.

Scored against the master brief's own weighting. Re-score at each milestone;
do not raise a number because the build passes.

_Last scored: 2026-08-28, after the seat matrix landed._

| Category | Weight | Score | Why not higher |
|---|---:|---:|---|
| Visual design | 20 | 16 | The chrome is coherent now and the typography is finally one system rather than two. Not higher because the page interiors are still inherited layout — the section-card grid, the three-equal-cards pattern and the flat content blocks were never redesigned, only made legible. |
| UX | 15 | 12 | Every route clears the header, the comparison tool exists, the assistant answers real questions and declines honestly. Raised from 11: the document centre answers "what do I actually need, and when" — the question a family hits first and the site previously left to a counselling call. Not higher because there is still no deadline centre, and the admission journey remains a narrative page rather than a stage-by-stage flow. |
| Motion | 10 | 8 | The Phase 3/4 motion system is genuinely good and honours `prefers-reduced-motion` (verified by the a11y suite, not assumed). Untouched this session. |
| Content | 10 | 10 | The owner supplied the Commission's own MECEE-BL 2026 matrix and all 27 seat figures now come from it — **four were overstated, Institute of Medicine by 4.5× (9 against an actual 2)**. The transcription sums to the document's own stated total of 734, which is the check that it is faithful. Every claim on the site now traces to a named source with a date, fees and deadlines are refused by policy rather than guessed, and the two conflicts this log had been carrying (KMC 43-vs-33, whether PoAHS runs MBBS at all) were both settled by the document. |
| Admissions journey | 10 | 7 | Enquiry → application → counsellor queue → student portal works end to end and is automated. Raised from 6: `/documents` now sets out every required document, which stage it is needed at, and the practical mistake attached to each — with the Commission's requirement and our own guidance visibly separated so our advice cannot borrow their authority. Not higher because there are still no per-stage deadlines (needs the Commission's real dates) and no application status the student drives themselves beyond a read-only portal. |
| Trust | 10 | 10 | Every assistant answer names its source and check date; fees and dates are refused by policy rather than guessed; a freshness audit fails on the calendar with nobody touching the repo. The seat figure on each college page now states which category and which round it is, and that a first-matching allocation is not a standing number — the label is on the page, not only in this file. |
| Accessibility | 10 | 9 | 0 low-contrast across 44 routes **and** the assistant, with 0 elements skipped — and that zero now means something, because fixing the checker's blind spots took it from a false 0 to 87 real failures and back to a measured 0. Keyboard reachability, focus and reduced motion verified. Not 10 because the audit still cannot see the admin panel's own screens, and the enquiry modal was fixed by reading it rather than by measuring it. |
| Performance | 5 | 4 | Median page 284 kB, no layout overflow, the knowledge payload is fetched on first chat open rather than shipped to all 43 pages. Not scored higher without a real Core Web Vitals run on production hardware — the sandbox has no GPU and its numbers are not the user's numbers. |
| SEO | 5 | 4 | Unique titles and descriptions, sitemap, structured data, `/privacy` indexed and `/404` correctly not. Not higher because there is no content architecture around the search intents the brief lists — no "MBBS fees Nepal" page, because we decline to publish fees. |
| Engineering | 5 | 4 | The verify gate is real and now catches things it used to miss. Against it: `chrome.css` is a large override layer that finishes a migration rather than completing it, and two generations of `cbar-*` classes still coexist. |
| **Total** | **100** | **85** | |

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

- **Visual 16/20 and UX 12/15 are mine.** The chrome is coherent and the
  typography is one system now, but the page interiors are still inherited
  layout — the section-card grid, the stacked identical `.doc` blocks, the
  single-column desktop. That is real work and I can do it.
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

Realistically that is 85 → 91 by working, and the last nine points need
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
3. **Redesign page interiors** rather than only the chrome (Visual 16→18).
4. **Extend the audit to modals, the admin panel and the chat** (A11y 8→9).
5. **Trust labels on the college pages themselves** (Trust 9→10), reusing
   the source/checked-date treatment the assistant now uses.

## Standing rule for this file

Do not raise a score because a suite went green. A suite going green means
the things it measures are fine, and this session has twice found that what
it measured was less than what it appeared to measure. Raise a score when
the underlying gap is closed, and say which evidence closed it.
