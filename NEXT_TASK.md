# NEXT_TASK.md

_Read this after `CLAUDE.md` (which loads itself) and `PROJECT_STATE.md`.
It is overwritten at the end of every chunk to point at the next one._

## Status as of 2026-09-05

The exam-intelligence module landed on branch
`claude/exam-intelligence-report-card-tetbx6`: import a college result
sheet, validate it, analyse it, generate a report card, send it to a
parent as an image on WhatsApp, and track what happened. See
`docs/EXAM-INTELLIGENCE.md` for configuration and
`DECISION_LOG.md` (2026-09-05) for why it is shaped the way it is.

What is verified, and by what:

| Suite | Covers | Result |
|---|---|---|
| `./supabase/test/run.sh` | RLS, import, amend, ranks, tenancy, deletes | 24 assertions (12 new), all pass |
| `node tests/exam-verify.mjs` | parse → map → validate → render → flyer → the console's send flow | 59/59 (60/60 with `EXAM_SHEET`) |
| `node tests/csp-verify.mjs` | delegated handlers across every route | 11/11 · 46 routes · 2949 handlers |
| `node tests/a11y-verify.mjs` | now includes `/staff/exams` | 38/38 |
| `node tests/audit.mjs` | contrast and mobile overflow, `/staff/exams` included | 0 low-contrast, 0 overflow, 0 skipped |
| `node tests/auth-verify.mjs` | the session layer, unchanged by this work | 12/12 |
| `node tools/gen-csp.mjs --check` | the CSP is still current | passes — no inline script was added |

Three of those checks found real faults on their first run and are worth
keeping for that reason: a11y found two `h1`s on the new page, the 390px
check found a 22px tap target, and the import-by-module check found a
syntax error `node --check` had accepted.

**`npm run verify` still fails on `build-verify` for a reason that predates
this work**: it reads the `phase1-static-rollback` tag and `git push
--tags` returns 403, so the five rollback tags are local-only. A fresh
clone has always failed there. It is one push by the owner away from
green; see `CLAUDE.md` → Environment.

## What the owner has to do before this is live

Nothing in this list is code. All of it is in `docs/EXAM-INTELLIGENCE.md`.

1. **Apply `0006`** to the Supabase project (`supabase db push`, or paste
   it into the SQL editor). Until then the console signs in and finds no
   institution.
2. **Set at least one model key** as a Supabase Function secret:
   `supabase secrets set GOOGLE_API_KEY='…'`. With one key the router
   works and logs that the others were unconfigured; with none, every
   analysis falls back to a computed summary and says so.
   **A key that has been pasted into a chat window should be rotated
   before use.**
3. **Deploy the three functions**, the webhook with `--no-verify-jwt`.
4. **Decide about WhatsApp.** Without credentials the console prepares
   every message — correct parent, correct card, correct wording — and the
   coordinator attaches and sends by hand. With Cloud API credentials it
   sends, but a result-day message goes to parents who have not written
   first, and WhatsApp only accepts an **approved template** in that case.
   Getting a template approved by Meta is the real gate on automatic
   sending, and it is a business task, not a coding one.

## The next chunk, if this one continues

In the order the value falls:

1. **Cohort send.** Today a coordinator opens one student at a time. The
   data and the guards are all per-student already; what is missing is a
   queue that generates forty cards, shows a list of exactly who will
   receive what on which number, and sends after one confirmation. Do
   **not** shortcut the recipient check to build it — that check is the
   feature.
2. **Student photos.** `students.photo_path` and the `student-photos`
   bucket exist and the report card renders a photo when one is supplied;
   nothing uploads one yet.
3. **A real PDF.** Print → Save as PDF is what exists. If the college
   needs a filed PDF per student, that is a server-side render, and the
   honest place for it is a fourth edge function, not a browser library.
4. **Marks entry by hand.** Everything assumes a spreadsheet. A small
   subject-at-a-time entry screen would cover the college that has no
   sheet — and it must go through the same conflict/amend path, not
   straight into `marks`.

## Still true from the previous chunk

- **Page interiors** (Visual 16/20, UX 12/15) are still the largest block
  of public-site points that belongs to Claude. `/` → `/colleges` →
  `/admission-process` → `/documents`, in that order.
- **Deadline centre** is still blocked on the Commission publishing
  per-intake dates. Inventing plausible ones would score well and be the
  most harmful thing this project could ship.
- **Fees are still not published**, by decision, not by omission.
- Three blank `established` fields remain (Gandaki, Janaki, Birat).

## Things not to do

- Do not weaken an RLS policy in `0006` to make a screen easier. The
  console is allowed to show less than the database permits; never the
  reverse.
- Do not make the AI compute anything about a student's marks. If a figure
  is needed that SQL does not yet produce, add it to `exam_report()`.
- Do not fill in a missing subject maximum, a missing mark, or a parent's
  country code to make an import succeed.
- Do not commit a real result sheet, or a redacted one.
