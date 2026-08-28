# SELF_AUDIT.md

The owner asked me to audit my own output against an "excellent" bar and fix
what the audit finds, rather than declare the work done. This file is that
audit, kept honest on purpose: the score is not 95, and the reasons are
specific.

Scored against the master brief's own weighting. Re-score at each milestone;
do not raise a number because the build passes.

_Last scored: 2026-08-28, after chunk 7._

| Category | Weight | Score | Why not higher |
|---|---:|---:|---|
| Visual design | 20 | 16 | The chrome is coherent now and the typography is finally one system rather than two. Not higher because the page interiors are still inherited layout — the section-card grid, the three-equal-cards pattern and the flat content blocks were never redesigned, only made legible. |
| UX | 15 | 12 | Every route clears the header, the comparison tool exists, the assistant answers real questions and declines honestly. Raised from 11: the document centre answers "what do I actually need, and when" — the question a family hits first and the site previously left to a counselling call. Not higher because there is still no deadline centre, and the admission journey remains a narrative page rather than a stage-by-stage flow. |
| Motion | 10 | 8 | The Phase 3/4 motion system is genuinely good and honours `prefers-reduced-motion` (verified by the a11y suite, not assumed). Untouched this session. |
| Content | 10 | 8 | Public copy is professional, sourced where it makes a claim, and free of hype. Raised from 7 because six more colleges were verified against their own institutional sites this pass (16 of 27 now), one wrong location was corrected, and the **primary source for every seat count was located** — `mec.gov.np`'s published seat matrix — turning "verify 17 colleges" from open research into one bounded transcription. Not 9 because that PDF has not been read: seat counts, the field families actually shortlist on, remain unverified for all 27. |
| Admissions journey | 10 | 7 | Enquiry → application → counsellor queue → student portal works end to end and is automated. Raised from 6: `/documents` now sets out every required document, which stage it is needed at, and the practical mistake attached to each — with the Commission's requirement and our own guidance visibly separated so our advice cannot borrow their authority. Not higher because there are still no per-stage deadlines (needs the Commission's real dates) and no application status the student drives themselves beyond a read-only portal. |
| Trust | 10 | 9 | This is the strongest part. Every assistant answer names its source and check date; fees and dates are refused by policy rather than guessed; recognition is stated as per-intake on every college answer; a freshness audit fails on the calendar. Not 10 because the trust labels are not yet on the college *pages* themselves, only in the assistant. |
| Accessibility | 10 | 8 | 0 low-contrast across 42 routes with 0 elements skipped, keyboard reachability and focus verified, reduced motion honoured. Not higher because the audit still cannot see modals, the admin panel, or the chat window's own answers. |
| Performance | 5 | 4 | Median page 284 kB, no layout overflow, the knowledge payload is fetched on first chat open rather than shipped to all 43 pages. Not scored higher without a real Core Web Vitals run on production hardware — the sandbox has no GPU and its numbers are not the user's numbers. |
| SEO | 5 | 4 | Unique titles and descriptions, sitemap, structured data, `/privacy` indexed and `/404` correctly not. Not higher because there is no content architecture around the search intents the brief lists — no "MBBS fees Nepal" page, because we decline to publish fees. |
| Engineering | 5 | 4 | The verify gate is real and now catches things it used to miss. Against it: `chrome.css` is a large override layer that finishes a migration rather than completing it, and two generations of `cbar-*` classes still coexist. |
| **Total** | **100** | **80** | |

**80 is "incomplete" on the brief's own scale**, which is one band up from
where this started ("below 80 = continue redesign"). The remaining gap is
not polish. It is that the site's most load-bearing numbers — seat counts —
are still unverified against the authority that sets them, and that the
student-facing journey stops before deadlines and self-serve status.

## On reaching 100

The owner has asked for 100/100. Being straight about it: some of these
points are not mine to award, and pretending otherwise would break the
rule at the bottom of this file.

- **Content cannot reach 10 from inside this sandbox.** The remaining work
  is reading `mec.gov.np`'s seat-matrix PDF, and `WebFetch` is blocked here
  for every domain. I found the document and made the task bounded; someone
  with a browser has to open it.
- **Journey cannot reach 10 without real dates.** A deadline centre needs
  the Commission's published schedule. Inventing plausible dates would
  score well and be the single most harmful thing this project could ship.
- **Performance cannot be honestly scored above 4** on a sandbox with no
  GPU. Those numbers are not the user's numbers.

What I *can* close by working: the document centre, the page interiors, the
audit's remaining blind spots, and the trust labels on college pages. That
is roughly 80 → 88. The last dozen points need a person with a browser and
an owner's decisions, and I will keep saying so rather than quietly
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
