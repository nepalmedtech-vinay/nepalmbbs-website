# Exam intelligence — configuration and runbook

The feature added in migration `0006` and `supabase/functions/`: import a result
sheet, analyse it, generate a report card, send it to a parent, track what
happened.

Nothing here needs a new service. It runs on the Supabase project the site
already uses (`fpzgcijbryvddtpegcmm`), the `staff` table already used to sign a
counselor in, and the token system already in `public/assets/theme/`.

---

## 1. What is where

| Piece | File | Runs |
|---|---|---|
| Schema, RLS, all the arithmetic | `supabase/migrations/0006_exam_intelligence.sql` | Postgres |
| Model router | `supabase/functions/ai-gateway/` | Deno, server-side |
| WhatsApp send | `supabase/functions/whatsapp-send/` | Deno, server-side |
| Delivery receipts | `supabase/functions/whatsapp-webhook/` | Deno, server-side |
| Spreadsheet reader | `public/assets/js/xlsx-parse.js` | Browser |
| Column mapping + validation | `public/assets/js/exam-mapping.js` | Browser |
| Report card + flyer | `public/assets/js/report-card.js` | Browser |
| Console | `public/assets/js/exams.js`, `src/pages/staff/exams.astro` | Browser |
| Tests | `supabase/test/04_assert_exams.sql`, `tests/exam-verify.mjs` | CI / local |

The console is at **`/staff/exams`**. It is `noindex`, excluded from the
sitemap, and every table behind it refuses anyone who is not a member of that
college.

---

## 2. Applying the migration

`0006` depends on `0001` (the `staff` table and `is_staff()`). Apply it the same
way as the others — Supabase SQL editor, or the CLI:

```bash
supabase db push                     # or paste 0006 into the SQL editor
```

It creates three private storage buckets (`branding`, `student-photos`,
`report-cards`) and three stock report-card templates. It does **not** create
any institution: the first import does that and makes the importer an admin of
it.

To test it without touching the project:

```bash
./supabase/test/run.sh               # throwaway Postgres, ~30s, 12 assertions
```

---

## 3. Secrets

**Every provider key is a Supabase Function secret. None of them is in this
repository, in `.env.example`, or in anything the browser downloads.** The
console calls `ai-gateway` and `whatsapp-send` with the counselor's own Supabase
JWT; those functions hold the keys.

```bash
# Gemini — the cheap/bulk leg of the router
supabase secrets set GOOGLE_API_KEY='...'

# optional: the other two legs
supabase secrets set OPENAI_API_KEY='...'
supabase secrets set ANTHROPIC_API_KEY='...'
```

The router works with **one** key configured. With only `GOOGLE_API_KEY` set,
every task falls through to Gemini and the log records that the first-choice
providers had no key. Nothing breaks and nothing pretends otherwise.

> **If a key has ever been pasted into a chat window, an issue, a commit, or a
> screenshot, rotate it.** Treat it as public from that moment. Google AI Studio
> → API keys → delete and create a new one, then re-run `supabase secrets set`.
> Nothing in this repository will hold the old value, but nothing can un-share it
> either.

### Model choice, and the cap

| Variable | Default | Notes |
|---|---|---|
| `GOOGLE_MODEL` | `gemini-2.5-flash` | bulk and fallback work |
| `OPENAI_MODEL` | `gpt-5` | structured analysis, parent messages |
| `ANTHROPIC_MODEL` | `claude-opus-5` | cohort synthesis |
| `AI_DAILY_CALL_CAP` | `400` | non-cached calls per rolling 24h; `0` disables the cap |
| `ALLOWED_ORIGINS` | `https://nepalmbbs.in,https://www.nepalmbbs.in,http://localhost:4321` | CORS allow-list |

A free tier is not an unlimited tier. When the cap is reached, every task
returns its deterministic summary and says so on screen; it does not queue, and
it does not silently stop working.

### WhatsApp

| Variable | Meaning |
|---|---|
| `WHATSAPP_PROVIDER` | `cloud` to send, anything else to prepare only |
| `WHATSAPP_TOKEN` | Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | the sending number's id |
| `WHATSAPP_TEMPLATE_NAME` | approved template name, if you have one |
| `WHATSAPP_TEMPLATE_LANG` | template language code, default `en` |
| `WHATSAPP_VERIFY_TOKEN` | any string; it must match what you type into Meta's webhook form |
| `WHATSAPP_APP_SECRET` | the app secret, used to verify each callback's HMAC |
| `REPORT_LINK_TTL_SECONDS` | how long the signed link to the flyer lives, default 48h |

---

## 4. Deploying the functions

```bash
supabase functions deploy ai-gateway
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

`--no-verify-jwt` on the webhook only: Meta cannot present a Supabase JWT, so
that function's gate is the HMAC signature instead. It refuses every POST when
`WHATSAPP_APP_SECRET` is unset rather than accepting unsigned status updates.

Then point Meta's webhook at
`https://fpzgcijbryvddtpegcmm.supabase.co/functions/v1/whatsapp-webhook`
with the verify token above, and subscribe to the `messages` field.

The site's CSP already allows `connect-src` to the Supabase host, so the console
can call the functions with no header change.

---

## 5. What the 24-hour window means

WhatsApp only accepts a free-form message to someone who has messaged the
business in the last 24 hours. Outside that window it requires a **template**
approved in advance by Meta.

This matters because a result day is exactly the case where no parent has
messaged first. So:

- With `WHATSAPP_TEMPLATE_NAME` set, `whatsapp-send` sends the template with the
  report card as its header image and the message as its body parameter. This is
  the configuration to use for a real result day.
- Without it, a free-form send to a cold contact comes back as error `131047`.
  The console shows that in plain words and marks the message `failed`; it does
  not record a send that did not happen.
- With no credentials at all, every send returns `prepared`: the flyer and the
  message are ready, the console offers the image and a `wa.me` link, and the
  coordinator attaches it by hand. The log says `prepared`, never `sent`.

---

## 6. Things that are deliberate

- **The database does the arithmetic.** Totals, percentages, grades, ranks,
  subject and batch averages and previous-vs-current deltas come from views and
  `exam_report()`. A model is never asked what 41 out of 120 is.
- **Numbers in model output are checked.** `ai-gateway` extracts every number
  from a reply and requires it to appear in the input. A reply containing a
  figure the data does not have is discarded, not retried on the same provider.
- **A mark is never rewritten silently.** A re-import that disagrees reports a
  conflict; only an explicit amend with a written reason updates it, and the old
  value is kept in `mark_revisions` with a name and a timestamp.
- **A subject with no maximum blocks the import.** The source sheet this was
  built from has four such columns. Splitting the paper's 80 marks evenly across
  them would produce percentages that look right and are wrong.
- **A parent's number is never repaired.** A ten-digit Indian mobile is
  normalised to `+91…` for dialling but stays flagged `suspect`, because the
  country code was assumed rather than read. The console shows the number, in a
  readable size, and will not send until someone ticks that they have read it.
- **Fees are still not published.** Nothing here computes or displays a fee; see
  `DECISION_LOG.md`, 2026-08-28.

---

## 7. Running the checks

```bash
./supabase/test/run.sh          # database: RLS, import, amend, ranks, tenancy
node tests/exam-verify.mjs      # browser: parse, map, validate, render, flyer
npm run verify                  # the whole gate, ~20 min — run in the background
```

`npm run verify` currently fails on a fresh clone for a reason that predates this
work: `tests/build-verify.mjs` reads the `phase1-static-rollback` tag, and the
five rollback tags are local-only because `git push --tags` returns 403. See
`CLAUDE.md` → Environment.
