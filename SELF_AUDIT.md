# SELF_AUDIT.md

The owner asked me to audit my own output against an "excellent" bar and fix
what the audit finds, rather than declare the work done. This file is that
audit, kept honest on purpose: the score is not 95, and the reasons are
specific.

Scored against the master brief's own weighting. Re-score at each milestone;
do not raise a number because the build passes.

_Last scored: 2026-08-28, after chunk 6._

| Category | Weight | Score | Why not higher |
|---|---:|---:|---|
| Visual design | 20 | 16 | The chrome is coherent now and the typography is finally one system rather than two. Not higher because the page interiors are still inherited layout — the section-card grid, the three-equal-cards pattern and the flat content blocks were never redesigned, only made legible. |
| UX | 15 | 11 | Every route clears the header, the comparison tool exists, the assistant answers real questions and declines honestly. Not higher because there is no document centre, no deadline centre, and the admission journey is a 44-line narrative page rather than a stage-by-stage flow with documents and common mistakes per stage. |
| Motion | 10 | 8 | The Phase 3/4 motion system is genuinely good and honours `prefers-reduced-motion` (verified by the a11y suite, not assumed). Untouched this session. |
| Content | 10 | 7 | Public copy is professional, sourced where it makes a claim, and free of hype. Not higher because **17 of 27 college records are still unverified against a primary source** — the site's most load-bearing content rests on aggregator agreement, and I have said so on the page rather than fixed it. |
| Admissions journey | 10 | 6 | Enquiry → application → counsellor queue → student portal works end to end and is automated. The *student-facing* journey stops at "talk to us": no document checklist, no per-stage deadlines, no application status the student drives themselves beyond a read-only portal. |
| Trust | 10 | 9 | This is the strongest part. Every assistant answer names its source and check date; fees and dates are refused by policy rather than guessed; recognition is stated as per-intake on every college answer; a freshness audit fails on the calendar. Not 10 because the trust labels are not yet on the college *pages* themselves, only in the assistant. |
| Accessibility | 10 | 8 | 0 low-contrast across 42 routes with 0 elements skipped, keyboard reachability and focus verified, reduced motion honoured. Not higher because the audit still cannot see modals, the admin panel, or the chat window's own answers. |
| Performance | 5 | 4 | Median page 284 kB, no layout overflow, the knowledge payload is fetched on first chat open rather than shipped to all 43 pages. Not scored higher without a real Core Web Vitals run on production hardware — the sandbox has no GPU and its numbers are not the user's numbers. |
| SEO | 5 | 4 | Unique titles and descriptions, sitemap, structured data, `/privacy` indexed and `/404` correctly not. Not higher because there is no content architecture around the search intents the brief lists — no "MBBS fees Nepal" page, because we decline to publish fees. |
| Engineering | 5 | 4 | The verify gate is real and now catches things it used to miss. Against it: `chrome.css` is a large override layer that finishes a migration rather than completing it, and two generations of `cbar-*` classes still coexist. |
| **Total** | **100** | **77** | |

**77 is "incomplete", and that is the right reading.** The brief's own scale
calls anything below 80 "continue redesign". The gap is not polish — it is
that two of the platform's promised organs (verified content, and a
student-facing journey beyond the enquiry) do not exist yet.

## What would move the number, in order

1. **Verify the remaining 17 colleges against primary sources** (Content
   7→9, Trust 9→10). Everything else is downstream of this: an assistant
   that answers confidently from unverified data is a liability, not a
   feature.
2. **Document centre and deadline centre** (Journey 6→8, UX 11→13). Both
   need real sourced dates first — the same dependency.
3. **Redesign page interiors** rather than only the chrome (Visual 16→18).
4. **Extend the audit to modals, the admin panel and the chat** (A11y 8→9).

## Standing rule for this file

Do not raise a score because a suite went green. A suite going green means
the things it measures are fine, and this session has twice found that what
it measured was less than what it appeared to measure. Raise a score when
the underlying gap is closed, and say which evidence closed it.
